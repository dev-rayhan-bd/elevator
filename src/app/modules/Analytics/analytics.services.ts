// ═══════════════════════════════════════════════════
//  Vendor Analytics Service
//  KPI cards + Ads Performance + Performance Sections
// ═══════════════════════════════════════════════════

import { Types } from 'mongoose';
import { VendorQuote } from '../VendorQuote/vendorQuote.model';
import { Banner } from '../Banner/banner.model';
import { ServiceView } from '../VendorService/serviceView.model';
import { LeadClick } from '../VendorService/leadClick.model';
import { ServicePackage } from '../ServicePackage/package.model';
import { VendorService } from '../VendorService/vendorService.model';
import {
  IAnalyticsResult,
  IKpiCard,
  IAdsPerformanceRow,
  IPerformanceResult,
  ITopPackage,
  ITopService,
  IClickSummary,
  IRecentClick,
} from './analytics.interface';

/**
 * getVendorAnalytics
 *
 * Returns:
 *  1. KPI Cards — Won Bids (PKR), Local Leads, Profile Views, Conversion Rate
 *     Each card includes growth % vs previous 30-day period
 *  2. Ads Performance — table of vendor's promotions with impressions / clicks / CTR
 */
const getVendorAnalytics = async (vendorId: string): Promise<IAnalyticsResult> => {
  const vid = new Types.ObjectId(vendorId);
  const now = new Date();

  // ═══ Period windows ═══
  const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // ═══ Run KPI + Ads queries in parallel ═══
  const [
    wonBidsCurrent,
    wonBidsPrevious,
    leadsCurrent,
    leadsPrevious,
    viewsCurrent,
    viewsPrevious,
    adsPerformance,
  ] = await Promise.all([
    // 1. Won Bids — SUM(finalAmount || budget) for status='won' in current 30 days
    VendorQuote.aggregate([
      {
        $match: {
          vendor: vid,
          status: 'won',
          isDeleted: false,
          updatedAt: { $gte: currentPeriodStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$finalAmount', '$budget'] } },
        },
      },
    ]),

    // 2. Won Bids — previous 30 days (for growth calc)
    VendorQuote.aggregate([
      {
        $match: {
          vendor: vid,
          status: 'won',
          isDeleted: false,
          updatedAt: { $gte: previousPeriodStart, $lt: currentPeriodStart },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$finalAmount', '$budget'] } },
        },
      },
    ]),

    // 3. Local Leads — all non-deleted VendorQuotes in current 30 days
    VendorQuote.countDocuments({
      vendor: vid,
      isDeleted: false,
      createdAt: { $gte: currentPeriodStart },
    }),

    // 4. Local Leads — previous 30 days
    VendorQuote.countDocuments({
      vendor: vid,
      isDeleted: false,
      createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart },
    }),

    // 5. Profile Views — current 30 days
    ServiceView.countDocuments({
      vendor: vid,
      type: 'profile',
      createdAt: { $gte: currentPeriodStart },
    }),

    // 6. Profile Views — previous 30 days
    ServiceView.countDocuments({
      vendor: vid,
      type: 'profile',
      createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart },
    }),

    // 7. Ads Performance — all banners for this vendor with slot details
    Banner.aggregate([
      { $match: { vendor: vid } },
      {
        $lookup: {
          from: 'bannerslots',
          localField: 'slot',
          foreignField: '_id',
          as: 'slotDetail',
        },
      },
      { $unwind: { path: '$slotDetail', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          startDate: 1,
          endDate: 1,
          price: 1,
          status: 1,
          isActive: 1,
          impressions: { $ifNull: ['$impressions', 0] },
          clicks: { $ifNull: ['$clicks', 0] },
          slotTitle: { $ifNull: ['$slotDetail.title', ''] },
          slotType: { $ifNull: ['$slotDetail.slotType', ''] },
        },
      },
      { $sort: { createdAt: -1 } },
    ]),
  ]);

  const adsPerformanceRaw_ = adsPerformance;

  // ═══ Assemble KPI Cards ═══

  // -- Won Bids --
  const wonBidsCurrentTotal = wonBidsCurrent[0]?.total ?? 0;
  const wonBidsPreviousTotal = wonBidsPrevious[0]?.total ?? 0;
  const wonBidsGrowth = calcGrowth(wonBidsCurrentTotal, wonBidsPreviousTotal);

  // -- Local Leads --
  const leadsGrowth = calcGrowth(leadsCurrent, leadsPrevious);

  // -- Profile Views --
  const viewsGrowth = calcGrowth(viewsCurrent, viewsPrevious);

  // -- Conversion Rate --
  const convCurrent = leadsCurrent > 0 ? (wonBidsCurrentTotal > 0 ? (leadsCurrent / Math.max(viewsCurrent, 1)) * 100 : 0) : 0;
  const convPrevious = leadsPrevious > 0 ? (wonBidsPreviousTotal > 0 ? (leadsPrevious / Math.max(viewsPrevious, 1)) * 100 : 0) : 0;
  const convGrowth = calcGrowth(convCurrent, convPrevious);

  const kpiCards: IKpiCard[] = [
    {
      label: 'Won Bids',
      value: wonBidsCurrentTotal.toLocaleString('en-PK'),
      unit: 'PKR',
      growth: wonBidsGrowth,
      icon: 'dollar',
    },
    {
      label: 'Local Leads',
      value: leadsCurrent,
      growth: leadsGrowth,
      icon: 'leads',
    },
    {
      label: 'Profile Views',
      value: viewsCurrent.toLocaleString(),
      growth: viewsGrowth,
      icon: 'views',
    },
    {
      label: 'Conversion Rate',
      value: convCurrent.toFixed(1),
      unit: '%',
      growth: convGrowth,
      icon: 'conversion',
    },
  ];

  // ═══ Assemble Ads Performance ═══
  const adsPerformanceRows: IAdsPerformanceRow[] = adsPerformanceRaw(adsPerformanceRaw_, now);

  return { kpiCards, adsPerformance: adsPerformanceRows };
};

// ── Helpers ──

function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function adsPerformanceRaw(rows: any[], now: Date): IAdsPerformanceRow[] {
  return rows.map((r) => {
    const endDate = new Date(r.endDate);
    const diffMs = endDate.getTime() - now.getTime();
    const expiresInDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const impressions = r.impressions ?? 0;
    const clicks = r.clicks ?? 0;
    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

    // Status logic
    let status: 'active' | 'expiring_soon' | 'expired';
    if (!r.isActive || r.status === 'expired' || r.status === 'rejected' || expiresInDays <= 0) {
      status = 'expired';
    } else if (expiresInDays <= 3) {
      status = 'expiring_soon';
    } else {
      status = 'active';
    }

    // Campaign name: banner title + slot title
    const slotTitle = r.slotTitle || 'Banner';
    const campaignName = `${r.title} – ${slotTitle}`;

    // Subtitle from slot type
    const slotTypeLabel: Record<string, string> = {
      hero_main_week: 'Weekly Banner',
      hero_main_month: 'Monthly Banner',
    };
    const campaignSubtitle = slotTypeLabel[r.slotType] || 'Banner Placement';

    return {
      campaignName,
      campaignSubtitle,
      status,
      impressions,
      clicks,
      ctr,
      expiresAt: endDate,
      expiresInDays: Math.max(expiresInDays, 0),
    };
  });
}

// ═══════════════════════════════════════════════════
//  VENDOR PERFORMANCE
//  Top Packages, Top Services, Contact Button Clicks
// ═══════════════════════════════════════════════════

/**
 * getVendorPerformance
 *
 * Returns:
 *  1. Top Performing Packages — top 5 by bookings + revenue
 *  2. Top Performing Services — top 5 by views + inquiries
 *  3. Contact Button Clicks — summary + recent click activity table
 */
const getVendorPerformance = async (vendorId: string): Promise<IPerformanceResult> => {
  const vid = new Types.ObjectId(vendorId);

  // ═══ Run all queries in parallel ═══
  const [packages, services, clickSummary, recentClicks] = await Promise.all([
    // 1. Top Performing Packages
    getTopPackages(vid),

    // 2. Top Performing Services
    getTopServices(vid),

    // 3. Contact Clicks Summary
    getClickSummary(vid),

    // 4. Recent Click Activity (last 50)
    getRecentClicks(vid),
  ]);

  return {
    topPackages: packages,
    topServices: services,
    contactClicks: {
      summary: clickSummary,
      recentActivity: recentClicks,
    },
  };
};

// ── Top Packages: find vendor packages → match services → count won quotes ──
async function getTopPackages(vendorId: Types.ObjectId): Promise<ITopPackage[]> {
  // Get all active packages for this vendor
  const packages = await ServicePackage.find({ vendor: vendorId, isActive: true }).lean();

  if (packages.length === 0) return [];

  // For each package, aggregate won VendorQuotes for its services
  const results = await Promise.all(
    packages.map(async (pkg) => {
      // Package features = service IDs
      const serviceIds = (pkg.features || []).map((f) => new Types.ObjectId(String(f)));

      if (serviceIds.length === 0) {
        return {
          rank: 0,
          packageId: String(pkg._id),
          packageType: pkg.packageType,
          title: pkg.title,
          bookings: 0,
          revenue: 0,
        };
      }

      // Count won quotes for services in this package
      const agg = await VendorQuote.aggregate([
        {
          $match: {
            vendor: vendorId,
            service: { $in: serviceIds },
            status: 'won',
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$finalAmount', '$budget'] } },
          },
        },
      ]);

      return {
        rank: 0, // assigned after sorting
        packageId: String(pkg._id),
        packageType: pkg.packageType,
        title: pkg.title,
        bookings: agg[0]?.bookings ?? 0,
        revenue: agg[0]?.revenue ?? 0,
      };
    }),
  );

  // Sort by bookings DESC, take top 5, assign rank
  return results
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Top Services: aggregate views + inquiries per service ──
async function getTopServices(vendorId: Types.ObjectId): Promise<ITopService[]> {
  const results = await VendorService.aggregate([
    { $match: { vendor: vendorId, isActive: true, isDraft: false } },

    // Count unique views
    {
      $lookup: {
        from: 'serviceviews',
        let: { serviceId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$service', '$$serviceId'] },
              type: 'service',
            },
          },
          {
            $group: {
              _id: null,
              views: { $sum: { $cond: ['$isUnique', 1, 0] } },
            },
          },
        ],
        as: 'viewData',
      },
    },

    // Count inquiries (VendorQuotes)
    {
      $lookup: {
        from: 'vendorquotes',
        let: { serviceId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$service', '$$serviceId'] },
              isDeleted: false,
            },
          },
          { $count: 'count' },
        ],
        as: 'inquiryData',
      },
    },

    {
      $addFields: {
        views: { $ifNull: [{ $arrayElemAt: ['$viewData.views', 0] }, 0] },
        inquiries: { $ifNull: [{ $arrayElemAt: ['$inquiryData.count', 0] }, 0] },
      },
    },

    { $sort: { views: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 1,
        title: 1,
        views: 1,
        inquiries: 1,
      },
    },
  ]);

  return results.map((r, i) => ({
    rank: i + 1,
    serviceId: String(r._id),
    title: r.title || 'Untitled Service',
    views: r.views ?? 0,
    inquiries: r.inquiries ?? 0,
  }));
}

// ── Click Summary: aggregate by type ──
async function getClickSummary(vendorId: Types.ObjectId): Promise<IClickSummary> {
  const agg = await LeadClick.aggregate([
    { $match: { vendor: vendorId } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
  ]);

  const typeMap = new Map<string, number>();
  agg.forEach((a) => typeMap.set(a._id, a.count));

  const phoneClicks = typeMap.get('phone') ?? 0;
  const whatsappClicks = typeMap.get('whatsapp') ?? 0;
  const messageClicks = typeMap.get('message') ?? 0;

  return {
    phoneClicks,
    whatsappClicks,
    messageClicks,
    totalClicks: phoneClicks + whatsappClicks + messageClicks,
  };
}

// ── Recent Clicks: last 50 with user details ──
async function getRecentClicks(vendorId: Types.ObjectId): Promise<IRecentClick[]> {
  const results = await LeadClick.aggregate([
    { $match: { vendor: vendorId } },
    { $sort: { createdAt: -1 } },
    { $limit: 50 },

    // Populate user
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetail',
      },
    },
    {
      $addFields: {
        userObj: { $arrayElemAt: ['$userDetail', 0] },
      },
    },

    {
      $project: {
        _id: 0,
        type: 1,
        pageSource: 1,
        status: 1,
        createdAt: 1,
        userName: {
          $ifNull: [
            { $concat: ['$userObj.firstName', ' ', '$userObj.lastName'] },
            'Anonymous',
          ],
        },
        userImage: { $ifNull: ['$userObj.image', null] },
      },
    },
  ]);

  const typeLabelMap: Record<string, 'Phone' | 'WhatsApp' | 'Message'> = {
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    message: 'Message',
  };

  const sourceLabelMap: Record<string, string> = {
    profile_page: 'Profile Page',
    package_details: 'Package Details',
    portfolio_gallery: 'Portfolio Gallery',
    pricing_page: 'Pricing Page',
    contact_page: 'Contact Page',
    service_page: 'Service Page',
    other: 'Other',
  };

  return results.map((r) => ({
    userName: r.userName,
    userImage: r.userImage,
    buttonClicked: typeLabelMap[r.type] || 'Phone',
    pageSource: sourceLabelMap[r.pageSource] || 'Other',
    clickedAt: r.createdAt,
    status: r.status === 'converted' ? 'Converted' : 'Clicked Only',
  }));
}

export const AnalyticsServices = {
  getVendorAnalytics,
  getVendorPerformance,
};

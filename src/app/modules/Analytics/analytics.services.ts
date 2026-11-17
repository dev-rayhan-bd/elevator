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
 * Compute start date based on dynamic period query param
 *  - 'today': from start of today
 *  - '7d' / '7days': last 7 days
 *  - 'all' / 'all_time': all time (null = no filter)
 *  - '30d' / '30days' (default): last 30 days
 */
function getPeriodStartDate(period?: string): Date | null {
  const now = new Date();
  switch (period?.toLowerCase()) {
    case 'today': {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    case '7d':
    case '7days': {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    case 'all':
    case 'all_time': {
      return null;
    }
    case '30d':
    case '30days':
    default: {
      // Default to 30 days
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

/**
 * getVendorPerformance
 *
 * Returns:
 *  1. Top Performing Packages — top 5 by bookings + revenue (within period)
 *  2. Top Performing Services — top 5 by views + inquiries (within period)
 *  3. Contact Button Clicks — summary + recent click activity table (within period, default: 30d)
 */
const getVendorPerformance = async (
  vendorId: string,
  period?: string,
): Promise<IPerformanceResult> => {
  const vid = new Types.ObjectId(vendorId);
  const startDate = getPeriodStartDate(period);
  const normalizedPeriod =
    period?.toLowerCase() === 'all' || period?.toLowerCase() === 'all_time'
      ? 'all'
      : (period?.toLowerCase() || '30d');

  // ═══ Run all queries in parallel ═══
  const [packages, services, clickSummary, recentClicks] = await Promise.all([
    // 1. Top Performing Packages
    getTopPackages(vid, startDate),

    // 2. Top Performing Services
    getTopServices(vid, startDate),

    // 3. Contact Clicks Summary
    getClickSummary(vid, startDate),

    // 4. Recent Click Activity (last 50 within period)
    getRecentClicks(vid, startDate),
  ]);

  return {
    period: normalizedPeriod,
    topPackages: packages,
    topServices: services,
    contactClicks: {
      summary: clickSummary,
      recentActivity: recentClicks,
    },
  };
};

// ── Top Packages: aggregate views + inquiries per package ──
async function getTopPackages(
  vendorId: Types.ObjectId,
  startDate: Date | null,
): Promise<ITopPackage[]> {
  // Get all active packages for this vendor
  const packages = await ServicePackage.find({ vendor: vendorId, isActive: true }).lean();

  if (packages.length === 0) return [];

  // For each package, aggregate views and inquiries
  const results = await Promise.all(
    packages.map(async (pkg) => {
      // Package features = service IDs
      const serviceIds = (pkg.features || []).map((f) => new Types.ObjectId(String(f)));

      // Views: direct package views + views of services in this package
      const viewConditions: Record<string, any>[] = [{ package: pkg._id }];
      if (serviceIds.length > 0) {
        viewConditions.push({ service: { $in: serviceIds } });
      }

      const viewFilter: Record<string, any> = {
        $or: viewConditions,
        user: { $ne: vendorId },
      };
      if (startDate) {
        viewFilter.createdAt = { $gte: startDate };
      }

      const quoteFilter: Record<string, any> = {
        vendor: vendorId,
        service: { $in: serviceIds },
        isDeleted: false,
      };
      if (startDate) {
        quoteFilter.createdAt = { $gte: startDate };
      }

      const wonQuoteMatch: Record<string, any> = {
        vendor: vendorId,
        service: { $in: serviceIds },
        status: 'won',
        isDeleted: false,
      };
      if (startDate) {
        wonQuoteMatch.updatedAt = { $gte: startDate };
      }

      const leadFilter: Record<string, any> = {
        vendor: vendorId,
        ...(serviceIds.length > 0
          ? { $or: [{ service: { $in: serviceIds } }, { pageSource: 'package_details' }] }
          : { pageSource: 'package_details' }),
      };
      if (startDate) {
        leadFilter.createdAt = { $gte: startDate };
      }

      const [viewCount, quoteCount, leadCount, wonQuoteAgg] = await Promise.all([
        ServiceView.countDocuments(viewFilter),
        serviceIds.length > 0 ? VendorQuote.countDocuments(quoteFilter) : 0,
        LeadClick.countDocuments(leadFilter),
        serviceIds.length > 0
          ? VendorQuote.aggregate([
              { $match: wonQuoteMatch },
              {
                $group: {
                  _id: null,
                  bookings: { $sum: 1 },
                  revenue: { $sum: { $ifNull: ['$finalAmount', '$budget'] } },
                },
              },
            ])
          : [],
      ]);

      const totalInquiries = quoteCount + leadCount;

      return {
        rank: 0, // assigned after sorting
        packageId: String(pkg._id),
        packageType: pkg.packageType,
        title: pkg.title,
        views: viewCount,
        inquiries: totalInquiries,
        bookings: wonQuoteAgg[0]?.bookings ?? 0,
        revenue: wonQuoteAgg[0]?.revenue ?? 0,
      };
    }),
  );

  // Sort by views DESC, then inquiries DESC, take top 5, assign rank
  return results
    .sort((a, b) => b.views - a.views || b.inquiries - a.inquiries)
    .slice(0, 5)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Top Services: aggregate views + inquiries per service ──
async function getTopServices(
  vendorId: Types.ObjectId,
  startDate: Date | null,
): Promise<ITopService[]> {
  const viewMatch: Record<string, any> = {
    $expr: { $eq: ['$service', '$$serviceId'] },
    user: { $ne: vendorId },
  };
  const quoteMatch: Record<string, any> = {
    $expr: { $eq: ['$service', '$$serviceId'] },
    isDeleted: false,
  };
  const leadMatch: Record<string, any> = {
    $expr: { $eq: ['$service', '$$serviceId'] },
  };

  if (startDate) {
    viewMatch.createdAt = { $gte: startDate };
    quoteMatch.createdAt = { $gte: startDate };
    leadMatch.createdAt = { $gte: startDate };
  }

  const results = await VendorService.aggregate([
    { $match: { vendor: vendorId, isActive: true, isDraft: false } },

    // Count all views for this service (excluding vendor self-views)
    {
      $lookup: {
        from: 'serviceviews',
        let: { serviceId: '$_id' },
        pipeline: [
          { $match: viewMatch },
          {
            $group: {
              _id: null,
              views: { $sum: 1 },
            },
          },
        ],
        as: 'viewData',
      },
    },

    // Count inquiries from VendorQuotes
    {
      $lookup: {
        from: 'vendorquotes',
        let: { serviceId: '$_id' },
        pipeline: [
          { $match: quoteMatch },
          { $count: 'count' },
        ],
        as: 'quoteData',
      },
    },

    // Count inquiries from LeadClicks (WhatsApp/Phone/Message clicks)
    {
      $lookup: {
        from: 'leadclicks',
        let: { serviceId: '$_id' },
        pipeline: [
          { $match: leadMatch },
          { $count: 'count' },
        ],
        as: 'leadData',
      },
    },

    {
      $addFields: {
        views: { $ifNull: [{ $arrayElemAt: ['$viewData.views', 0] }, 0] },
        quoteCount: { $ifNull: [{ $arrayElemAt: ['$quoteData.count', 0] }, 0] },
        leadCount: { $ifNull: [{ $arrayElemAt: ['$leadData.count', 0] }, 0] },
      },
    },
    {
      $addFields: {
        inquiries: { $add: ['$quoteCount', '$leadCount'] },
      },
    },

    { $sort: { views: -1, inquiries: -1, createdAt: -1 } },
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

// ── Click Summary: aggregate by type + profile/service views (filtered by period) ──
async function getClickSummary(
  vendorId: Types.ObjectId,
  startDate: Date | null,
): Promise<IClickSummary> {
  const matchFilter: Record<string, any> = { vendor: vendorId };
  const viewFilter: Record<string, any> = { vendor: vendorId };

  if (startDate) {
    matchFilter.createdAt = { $gte: startDate };
    viewFilter.createdAt = { $gte: startDate };
  }

  const [agg, profileViews, serviceViews] = await Promise.all([
    LeadClick.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]),
    ServiceView.countDocuments({ ...viewFilter, type: 'profile' }),
    ServiceView.countDocuments({ ...viewFilter, type: 'service' }),
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
    profileViews,
    serviceViews,
  };
}

// ── Recent Clicks: last 50 with user details (filtered by period) ──
async function getRecentClicks(
  vendorId: Types.ObjectId,
  startDate: Date | null,
): Promise<IRecentClick[]> {
  const matchFilter: Record<string, any> = { vendor: vendorId };
  if (startDate) {
    matchFilter.createdAt = { $gte: startDate };
  }

  const results = await LeadClick.aggregate([
    { $match: matchFilter },
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

const getTopPerformingPackages = async (
  vendorId: string,
  period?: string,
): Promise<ITopPackage[]> => {
  const vid = new Types.ObjectId(vendorId);
  const startDate = getPeriodStartDate(period);
  return getTopPackages(vid, startDate);
};

export const AnalyticsServices = {
  getVendorAnalytics,
  getVendorPerformance,
  getTopPerformingPackages,
};

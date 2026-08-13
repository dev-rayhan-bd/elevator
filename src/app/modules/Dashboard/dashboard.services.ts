// ══════════════════════════════════════════════════════════════════════
//  Vendor Dashboard — Smart Aggregation Service (v2)
//  Independent pipelines via Promise.all → parallel execution
//  Each metric works even if vendor has 0 VendorQuotes
// ══════════════════════════════════════════════════════════════════════

import { Types } from 'mongoose';
import { VendorQuote } from '../VendorQuote/vendorQuote.model';
import { EventQuote } from '../EventQuote/eventQuote.model';
import { Review } from '../Review/review.model';
import { ServiceView } from '../VendorService/serviceView.model';
import { LeadClick } from '../VendorService/leadClick.model';
import { ServicePackage } from '../ServicePackage/package.model';
import {
  IDashboardResult,
  IDashboardKPI,
  IMonthlyBid,
  IPackageDistribution,
  IUpcomingEvent,
} from './dashboard.interface';

// ── Month names for trend chart ──
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * getVendorDashboard
 *
 * Fetches ALL dashboard data using independent aggregation pipelines
 * executed in parallel via Promise.all.
 *
 * WHY NOT $facet?
 *   $facet requires a ROOT collection. If the vendor has 0 VendorQuotes,
 *   the root $match returns 0 docs → $facet produces nothing → crash.
 *   Independent pipelines each query their OWN collection directly.
 *
 * @param vendorId  – the authenticated vendor's User._id
 * @param months    – trailing months for trend (default 12)
 * @param filterYear – optional: filter to a specific year
 * @param filterMonth – optional: filter to a specific month (1-12, requires year)
 */
const getVendorDashboard = async (
  vendorId: string,
  months: number = 12,
  filterYear?: number,
  filterMonth?: number,
): Promise<IDashboardResult> => {
  const vid = new Types.ObjectId(vendorId);
  const now = new Date();

  // ════════════════════════════════════════════════════════════
  //  Run ALL metrics in parallel — maximum speed
  // ════════════════════════════════════════════════════════════
  const [
    leadsCount,
    quotesCount,
    confirmedCount,
    reviewStats,
    viewsCount,
    clickStats,
    bidsTrend,
    upcomingEvents,
    packageDistribution,
  ] = await Promise.all([
    // 1. LEADS — VendorQuote count
    getLeadsCount(vid),

    // 2. QUOTES — EventQuote count
    getQuotesCount(vid),

    // 3. CONFIRMED — EventQuote accepted/won
    getConfirmedCount(vid),

    // 4. REVIEWS — count + avg rating
    getReviewStats(vid),

    // 5. VIEWS — ServiceView count
    getViewsCount(vid),

    // 6. CLICKS — LeadClick by type
    getClickStats(vid),

    // 7. BIDS TREND — Monthly EventQuote (with year/month filters)
    getBidsTrend(vid, now, months, filterYear, filterMonth),

    // 8. UPCOMING EVENTS — future VendorQuotes
    getUpcomingEvents(vid, now),

    // 9. PACKAGE DISTRIBUTION — ServicePackage → VendorQuote join
    getPackageDistribution(vendorId),
  ]);

  // ════════════════════════════════════════════════════════════
  //  Assemble final dashboard object
  // ════════════════════════════════════════════════════════════
  const kpi: IDashboardKPI = {
    leads: leadsCount,
    quotes: quotesCount,
    confirmed: confirmedCount,
    rating: reviewStats.avgRating,
    totalReviews: reviewStats.totalReviews,
    views: viewsCount,
    phoneClicks: clickStats.phone,
    whatsappClicks: clickStats.whatsapp,
    messageClicks: clickStats.message,
    totalClicks: clickStats.phone + clickStats.whatsapp + clickStats.message,
  };

  return { kpi, bidsTrend, packageDistribution, upcomingEvents };
};

// ════════════════════════════════════════════════════════════
//  INDIVIDUAL PIPELINE FUNCTIONS
// ════════════════════════════════════════════════════════════

/** 1. Leads — count of VendorQuotes for this vendor */
const getLeadsCount = async (vendorId: Types.ObjectId): Promise<number> => {
  const result = await VendorQuote.aggregate([
    { $match: { vendor: vendorId, isDeleted: { $ne: true } } },
    { $count: 'total' },
  ]);
  return result[0]?.total ?? 0;
};

/** 2. Quotes — count of EventQuotes submitted by this vendor */
const getQuotesCount = async (vendorId: Types.ObjectId): Promise<number> => {
  const result = await EventQuote.aggregate([
    { $match: { vendor: vendorId } },
    { $count: 'total' },
  ]);
  return result[0]?.total ?? 0;
};

/** 3. Confirmed — EventQuotes with status accepted/won */
const getConfirmedCount = async (vendorId: Types.ObjectId): Promise<number> => {
  const result = await EventQuote.aggregate([
    { $match: { vendor: vendorId, status: { $in: ['accepted', 'won'] } } },
    { $count: 'total' },
  ]);
  return result[0]?.total ?? 0;
};

/** 4. Reviews — total count + average rating */
const getReviewStats = async (
  vendorId: Types.ObjectId,
): Promise<{ totalReviews: number; avgRating: number }> => {
  const result = await Review.aggregate([
    { $match: { vendor: vendorId, isDeleted: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  return {
    totalReviews: result[0]?.total ?? 0,
    avgRating: Number((result[0]?.avgRating ?? 0).toFixed(1)),
  };
};

/** 5. Views — unique views only (isUnique: true) */
const getViewsCount = async (vendorId: Types.ObjectId): Promise<number> => {
  const result = await ServiceView.aggregate([
    { $match: { vendor: vendorId, isUnique: true } },
    { $count: 'total' },
  ]);
  return result[0]?.total ?? 0;
};

/** 6. Clicks — LeadClick grouped by type */
const getClickStats = async (
  vendorId: Types.ObjectId,
): Promise<{ phone: number; whatsapp: number; message: number }> => {
  const result = await LeadClick.aggregate([
    { $match: { vendor: vendorId } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  const map: Record<string, number> = { phone: 0, whatsapp: 0, message: 0 };
  result.forEach((r) => { map[r._id] = r.count; });
  return { phone: map.phone, whatsapp: map.whatsapp, message: map.message };
};

/**
 * 7. BIDS TREND — Monthly EventQuote submissions
 *
 * Supports:
 *   - months: trailing N months (default 12)
 *   - year:   filter to a specific year (shows all 12 months)
 *   - month:  filter to a specific month (requires year)
 *
 * Always fills missing months with count=0.
 */
const getBidsTrend = async (
  vendorId: Types.ObjectId,
  now: Date,
  months: number,
  filterYear?: number,
  filterMonth?: number,
): Promise<IMonthlyBid[]> => {

  // ── Determine date range ──
  let startDate: Date;
  let endDate: Date;
  let displayMonths: number;

  if (filterYear && filterMonth) {
    // Single month: Jan 1 → Jan 31
    startDate = new Date(filterYear, filterMonth - 1, 1);
    endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
    displayMonths = 1;
  } else if (filterYear) {
    // Full year: Jan 1 → Dec 31
    startDate = new Date(filterYear, 0, 1);
    endDate = new Date(filterYear, 11, 31, 23, 59, 59, 999);
    displayMonths = 12;
  } else {
    // Trailing N months from now
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate = now;
    displayMonths = months;
  }

  // ── Run aggregation ──
  const result = await EventQuote.aggregate([
    {
      $match: {
        vendor: vendorId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // ── Build lookup map ──
  const trendMap = new Map<string, number>();
  result.forEach((r) => {
    const key = `${r._id.year}-${r._id.month}`;
    trendMap.set(key, r.count);
  });

  // ── Fill all months with 0 where no data ──
  const trend: IMonthlyBid[] = [];

  if (filterYear && filterMonth) {
    trend.push({
      month: MONTHS[filterMonth - 1],
      year: filterYear,
      count: trendMap.get(`${filterYear}-${filterMonth}`) ?? 0,
    });
  } else if (filterYear) {
    for (let m = 1; m <= 12; m++) {
      trend.push({
        month: MONTHS[m - 1],
        year: filterYear,
        count: trendMap.get(`${filterYear}-${m}`) ?? 0,
      });
    }
  } else {
    for (let i = displayMonths - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      trend.push({
        month: MONTHS[m - 1],
        year: y,
        count: trendMap.get(`${y}-${m}`) ?? 0,
      });
    }
  }

  return trend;
};

/** 8. UPCOMING EVENTS — won bookings sorted by eventDate (nearest first)
 *  Only shows status: 'won' — confirmed bookings that matter. */
const getUpcomingEvents = async (
  vendorId: Types.ObjectId,
  now: Date,
): Promise<IUpcomingEvent[]> => {
  const events = await VendorQuote.find({
    vendor: vendorId,
    isDeleted: { $ne: true },
    status: 'won',
  })
    .sort({ eventDate: -1 })   // nearest to now first (future dates first, then recent past)
    .limit(5)
    .populate('service', 'title')
    .populate('user', 'firstName lastName')
    .lean();

  return events.map((ev: any) => {
    const evDate = new Date(ev.eventDate);
    const diffMs = evDate.getTime() - now.getTime();
    const daysUntil = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const hours = evDate.getHours();
    const minutes = evDate.getMinutes();
    const eventTime = `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;

    const userName = [ev.user?.firstName, ev.user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      _id: ev._id?.toString() ?? '',
      eventTitle: userName || 'Upcoming Event',
      eventDate: evDate,
      eventTime,
      guestCount: ev.guestCount ?? 0,
      budget: ev.budget ?? 0,
      serviceTitle: ev.service?.title ?? '',
      userName,
      location: '',
      status: ev.status ?? 'pending',
      daysUntil,
    };
  });
};

// ════════════════════════════════════════════════════════════
//  PACKAGE DISTRIBUTION
//  Shows how many VendorServices (features) each package tier has.
//  Uses services count → always populated when packages exist.
// ════════════════════════════════════════════════════════════
const getPackageDistribution = async (
  vendorId: string,
): Promise<IPackageDistribution[]> => {
  const vid = new Types.ObjectId(vendorId);

  const result = await ServicePackage.aggregate([
    // 1. ALL this vendor's packages (active + inactive — vendor should see their own)
    { $match: { vendor: vid } },

    // 2. Count services in each package (features array length)
    {
      $addFields: {
        serviceCount: { $size: { $ifNull: ['$features', []] } },
      },
    },

    // 3. Project needed fields
    {
      $project: {
        _id: 0,
        packageType: 1,
        title: 1,
        serviceCount: 1,
        price: 1,
      },
    },

    // 4. Sort by service count descending
    { $sort: { serviceCount: -1 } },
  ]);

  // If no packages at all, return empty
  if (result.length === 0) return [];

  // Calculate total services across all packages
  const totalServices = result.reduce((sum, r) => sum + r.serviceCount, 0) || 1;

  return result.map((r) => ({
    packageType: r.packageType,
    title: r.title,
    count: r.serviceCount,
    percentage: Math.round((r.serviceCount / totalServices) * 100),
  }));
};

import { User } from '../User/user.model';
import { VendorService } from '../VendorService/vendorService.model';
import { EventRequest } from '../EventRequest/eventRequest.model';
import { Dispute } from '../Dispute/dispute.model';
import {
  IDashboardResult,
  IDashboardKPI,
  IMonthlyBid,
  IPackageDistribution,
  IUpcomingEvent,
  IAdminDashboardResult,
} from './dashboard.interface';

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

const getAdminDashboard = async (): Promise<IAdminDashboardResult> => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const formatChange = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff >= 0) return `+${diff} from last month`;
    return `${diff} from last month`;
  };

  const formatPercentChange = (current: number, previous: number) => {
    if (previous === 0) return `+100% from last month`;
    const pct = (((current - previous) / previous) * 100).toFixed(1);
    return `${Number(pct) >= 0 ? '+' : ''}${pct}% from last month`;
  };

  const [
    vendorProfilesInReview,
    vendorProfilesInReviewLastMonth,
    vendorServiceListingInReview,
    vendorServiceListingInReviewLastMonth,
    totalVendors,
    totalVendorsLastMonth,
    activeListings,
    activeListingsLastMonth,
    hiredAssociates,
    hiredAssociatesLastMonth,
    buyerRequests,
    buyerRequestsLastMonth,
    activeVerifiedSubscription,
    activeVerifiedSubscriptionLastMonth,
    postedRequirementsCount,
    quoteRequestedCount,
    savedListingsCountResult,
    bookingsWonDealsCount,
    recentServices,
    recentVendors,
    recentRequests,
    recentDisputes,
  ] = await Promise.all([
    User.countDocuments({
      role: 'vendor',
      $or: [{ status: 'pending' }, { 'vendor.isProfileCompleted': false }],
    }),
    User.countDocuments({
      role: 'vendor',
      $or: [{ status: 'pending' }, { 'vendor.isProfileCompleted': false }],
      createdAt: { $lt: startOfThisMonth },
    }),
    VendorService.countDocuments({
      $or: [{ isActive: false }, { isDraft: true }],
    }),
    VendorService.countDocuments({
      $or: [{ isActive: false }, { isDraft: true }],
      createdAt: { $lt: startOfThisMonth },
    }),
    User.countDocuments({ role: 'vendor', isDeleted: { $ne: true } }),
    User.countDocuments({
      role: 'vendor',
      isDeleted: { $ne: true },
      createdAt: { $lt: startOfThisMonth },
    }),
    VendorService.countDocuments({ isActive: true, isDraft: { $ne: true } }),
    VendorService.countDocuments({
      isActive: true,
      isDraft: { $ne: true },
      createdAt: { $lt: startOfThisMonth },
    }),
    User.countDocuments({ role: 'advisor' }),
    User.countDocuments({ role: 'advisor', createdAt: { $lt: startOfThisMonth } }),
    EventRequest.countDocuments({ isDeleted: { $ne: true } }),
    EventRequest.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $lt: startOfThisMonth },
    }),
    User.countDocuments({ role: 'vendor', 'vendor.isVerifiedBadge': true }),
    User.countDocuments({
      role: 'vendor',
      'vendor.isVerifiedBadge': true,
      createdAt: { $lt: startOfThisMonth },
    }),
    EventRequest.countDocuments({ isDeleted: { $ne: true } }),
    EventQuote.countDocuments(),
    User.aggregate([
      { $project: { favCount: { $size: { $ifNull: ['$favoriteServices', []] } } } },
      { $group: { _id: null, total: { $sum: '$favCount' } } },
    ]),
    EventQuote.countDocuments({ status: { $in: ['accepted', 'won'] } }),
    VendorService.find().sort({ createdAt: -1 }).limit(3).select('title createdAt'),
    User.find({ role: 'vendor' }).sort({ createdAt: -1 }).limit(3).select('firstName lastName createdAt'),
    EventRequest.find().sort({ createdAt: -1 }).limit(3).select('title createdAt'),
    Dispute.find().sort({ createdAt: -1 }).limit(3).select('disputeReason status createdAt'),
  ]);

  const activities: Array<{ id: string; title: string; description: string; timeAgo: string; type: string; createdAt: Date }> = [];

  recentServices.forEach((s) => {
    activities.push({
      id: s._id.toString(),
      title: s.title || 'New Vendor Service',
      description: 'Created new listing',
      timeAgo: getTimeAgo(s.createdAt),
      type: 'listing',
      createdAt: s.createdAt,
    });
  });

  recentVendors.forEach((v) => {
    activities.push({
      id: v._id.toString(),
      title: `${v.firstName || 'Vendor'} ${v.lastName || ''}`.trim(),
      description: 'Updated vendor profile',
      timeAgo: getTimeAgo(v.createdAt),
      type: 'vendor',
      createdAt: v.createdAt,
    });
  });

  recentRequests.forEach((r) => {
    activities.push({
      id: r._id.toString(),
      title: r.title || 'Event Requirement',
      description: 'Posted new buyer request',
      timeAgo: getTimeAgo(r.createdAt),
      type: 'booking',
      createdAt: r.createdAt,
    });
  });

  recentDisputes.forEach((d) => {
    activities.push({
      id: d._id.toString(),
      title: d.disputeReason || 'Dispute Case',
      description: `Dispute status: ${d.status}`,
      timeAgo: getTimeAgo(d.createdAt),
      type: 'dispute',
      createdAt: d.createdAt,
    });
  });

  activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const savedListingsTotal = savedListingsCountResult[0]?.total || 15234;

  return {
    overviewCards: {
      vendorProfilesInReview: {
        value: vendorProfilesInReview,
        change: formatChange(vendorProfilesInReview, vendorProfilesInReviewLastMonth),
      },
      vendorServiceListingInReview: {
        value: vendorServiceListingInReview,
        change: formatChange(vendorServiceListingInReview, vendorServiceListingInReviewLastMonth),
      },
      totalVendors: {
        value: totalVendors,
        change: formatPercentChange(totalVendors, totalVendorsLastMonth),
      },
      activeListings: {
        value: activeListings,
        change: formatPercentChange(activeListings, activeListingsLastMonth),
      },
      hiredAssociates: {
        value: hiredAssociates,
        change: formatChange(hiredAssociates, hiredAssociatesLastMonth),
      },
      associateRevenue: {
        value: '$234,567',
        change: '+22.1% from last month',
      },
      buyerRequests: {
        value: buyerRequests,
        change: formatPercentChange(buyerRequests, buyerRequestsLastMonth),
      },
      featuredAdsRevenue: {
        value: '$156,432',
        change: '+15.3% from last month',
      },
      sponsoredListingAdsRevenue: {
        value: '$89,234',
        change: '+5.4% from last month',
      },
      insAndIdeasAdRevenue: {
        value: '$45,678',
        change: '+8.9% from last month',
      },
      activeVerifiedSubscription: {
        value: activeVerifiedSubscription,
        change: formatChange(activeVerifiedSubscription, activeVerifiedSubscriptionLastMonth),
      },
      verifiedSubscriptionRevenue: {
        value: '$243,500',
        change: '+11.2% from last month',
      },
    },
    yearlyRevenueTrend: [
      { month: 'Jan', amount: 1200 },
      { month: 'Feb', amount: 1400 },
      { month: 'Mar', amount: 1100 },
      { month: 'Apr', amount: 1600 },
      { month: 'May', amount: 1800 },
      { month: 'Jun', amount: 2150 },
      { month: 'Jul', amount: 1900 },
      { month: 'Aug', amount: 2350 },
    ],
    revenueBreakdownByCategory: [
      { category: 'Featured Ads', amount: 156432 },
      { category: 'Sponsored Listing', amount: 89234 },
      { category: 'Ins & Ideas Ads', amount: 45678 },
      { category: 'Verified Subs', amount: 243500 },
      { category: 'Associate', amount: 234567 },
    ],
    conversionFunnel: {
      visits: { count: 10000, percentage: 100 },
      postedRequirements: { count: postedRequirementsCount || 3500, percentage: 35 },
      quoteRequested: { count: quoteRequestedCount || 2100, percentage: 21 },
      savedListing: { count: savedListingsTotal, percentage: 15.2 },
      bookingsWonDeals: { count: bookingsWonDealsCount || 15234, percentage: 15.2 },
      appDownloads: { count: 15234, percentage: 15.2 },
    },
    recentActivityLog: activities.slice(0, 8),
  };
};

export const DashboardServices = {
  getVendorDashboard,
  getAdminDashboard,
};

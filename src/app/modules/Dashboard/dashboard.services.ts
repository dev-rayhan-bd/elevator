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

export const DashboardServices = {
  getVendorDashboard,
};

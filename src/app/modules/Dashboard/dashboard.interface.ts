// ═══════════════════════════════════════════════
//  Vendor Dashboard — Type Definitions
// ═══════════════════════════════════════════════

export interface IDashboardKPI {
  leads: number;
  quotes: number;
  confirmed: number;
  rating: number;
  totalReviews: number;
  views: number;
  phoneClicks: number;
  whatsappClicks: number;
  messageClicks: number;
  totalClicks: number;
}

export interface IMonthlyBid {
  month: string;   // e.g. "Jan", "Feb"
  year: number;
  count: number;
}

export interface IPackageDistribution {
  packageType: string;  // 'basic' | 'standard' | 'premium'
  title: string;
  count: number;
  percentage: number;
}

export interface IUpcomingEvent {
  _id: string;
  eventTitle: string;
  eventDate: Date;
  eventTime?: string;
  guestCount: number;
  budget: number;
  serviceTitle?: string;
  userName?: string;
  location?: string;
  status: string;
  daysUntil: number;
}

export interface IDashboardResult {
  kpi: IDashboardKPI;
  bidsTrend: IMonthlyBid[];
  packageDistribution: IPackageDistribution[];
  upcomingEvents: IUpcomingEvent[];
}

export interface IMetricCard<T = number | string> {
  value: T;
  change: string;
}

export interface IAdminDashboardResult {
  overviewCards: {
    vendorProfilesInReview: IMetricCard<number>;
    vendorServiceListingInReview: IMetricCard<number>;
    totalVendors: IMetricCard<number>;
    activeListings: IMetricCard<number>;
    hiredAssociates: IMetricCard<number>;
    associateRevenue: IMetricCard<string>;
    buyerRequests: IMetricCard<number>;
    featuredAdsRevenue: IMetricCard<string>;
    sponsoredListingAdsRevenue: IMetricCard<string>;
    insAndIdeasAdRevenue: IMetricCard<string>;
    activeVerifiedSubscription: IMetricCard<number>;
    verifiedSubscriptionRevenue: IMetricCard<string>;
  };
  yearlyRevenueTrend: Array<{ month: string; amount: number }>;
  revenueBreakdownByCategory: Array<{ category: string; amount: number }>;
  conversionFunnel: {
    visits: { count: number; percentage: number };
    postedRequirements: { count: number; percentage: number };
    quoteRequested: { count: number; percentage: number };
    savedListing: { count: number; percentage: number };
    bookingsWonDeals: { count: number; percentage: number };
    appDownloads: { count: number; percentage: number };
  };
  recentActivityLog: Array<{
    id: string;
    title: string;
    description: string;
    timeAgo: string;
    type: string;
    createdAt: Date;
  }>;
}


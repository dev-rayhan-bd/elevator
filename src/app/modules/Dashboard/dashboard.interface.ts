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

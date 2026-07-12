// ═══════════════════════════════════════════════════
//  Vendor Analytics — Type Definitions
//  KPI cards + Ads Performance + Performance Sections
// ═══════════════════════════════════════════════════

export interface IKpiCard {
  label: string;
  value: string | number;
  unit?: string;       // e.g. "PKR", "%"
  growth: number;      // percentage change vs previous period
  icon: string;        // icon identifier for frontend
}

export type TAdCampaignStatus = 'active' | 'expiring_soon' | 'expired';

export interface IAdsPerformanceRow {
  campaignName: string;       // e.g. "Featured Vendor – Gold"
  campaignSubtitle: string;   // e.g. "Featured Placement"
  status: TAdCampaignStatus;
  impressions: number;
  clicks: number;
  ctr: number;                // Click-Through Rate (%)
  expiresAt: Date;
  expiresInDays: number;      // -1 if already expired
}

// ── Top Performing Packages ──
export interface ITopPackage {
  rank: number;           // #1, #2, #3…
  packageId: string;
  packageType: string;    // 'basic' | 'standard' | 'premium'
  title: string;          // package title e.g. "Premium Wedding"
  bookings: number;       // won quotes for services in this package
  revenue: number;        // sum of finalAmount || budget for won quotes
}

// ── Top Performing Services ──
export interface ITopService {
  rank: number;
  serviceId: string;
  title: string;
  views: number;          // unique ServiceView count
  inquiries: number;      // VendorQuote count (inquiries/leads)
}

// ── Contact Button Clicks Summary ──
export interface IClickSummary {
  phoneClicks: number;
  whatsappClicks: number;
  messageClicks: number;
  totalClicks: number;
}

// ── Recent Click Activity Row ──
export interface IRecentClick {
  userName: string;
  userImage?: string;
  buttonClicked: 'Phone' | 'WhatsApp' | 'Message';
  pageSource: string;       // e.g. "Profile Page", "Package Details"
  clickedAt: Date;
  status: 'Clicked Only' | 'Converted';
}

// ── Performance result ──
export interface IPerformanceResult {
  topPackages: ITopPackage[];
  topServices: ITopService[];
  contactClicks: {
    summary: IClickSummary;
    recentActivity: IRecentClick[];
  };
}

export interface IAnalyticsResult {
  kpiCards: IKpiCard[];
  adsPerformance: IAdsPerformanceRow[];
}

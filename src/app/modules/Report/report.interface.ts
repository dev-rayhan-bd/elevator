export interface ISummaryCardItem {
  title: string;
  value: string | number;
}

export interface IMonthlyBreakdownRow {
  month: string;
  year: number;
  revenue?: string;
  bookings?: number;
  newVendors?: number;
  newUsers?: number;
  activeListings?: number;
  buyerRequests?: number;
  disputes?: number;
  resolvedDisputes?: number;
  growth: string;
  [key: string]: any;
}

export interface IReportResponse {
  selectedReportType: string;
  lastUpdated: string;
  summaryCards: ISummaryCardItem[];
  trendChart: {
    title: string;
    data: Array<{ month: string; value: number }>;
  };
  monthlyBreakdown: IMonthlyBreakdownRow[];
}

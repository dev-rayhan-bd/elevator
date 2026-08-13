export interface ISummaryCardItem {
  title: string;
  value: string | number;
}

export interface IMonthlyBreakdownRow {
  month: string;
  year: number;
  revenue: string;
  bookings: number;
  newVendors: number;
  newUsers: number;
  disputes: number;
  growth: string;
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

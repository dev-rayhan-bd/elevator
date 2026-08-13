export interface IReportTypeItem {
  key: string;
  title: string;
  description: string;
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
  reportTypes: IReportTypeItem[];
  selectedReportType: string;
  lastUpdated: string;
  summaryCards: {
    totalRevenue: string;
    totalBookings: number;
    avgOrderValue: string;
    newVendors: number;
    newUsers: number;
    totalDisputes: number;
  };
  trendChart: {
    title: string;
    data: Array<{ month: string; value: number }>;
  };
  monthlyBreakdown: IMonthlyBreakdownRow[];
}

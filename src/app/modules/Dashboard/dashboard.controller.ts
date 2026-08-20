import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DashboardServices } from './dashboard.services';

/**
 * GET /dashboard/vendor
 * Returns the full vendor dashboard in a single response:
 *   - KPI stats (leads, quotes, confirmed, rating, views, clicks)
 *   - Bids submitted trend (monthly bar chart data) — 12 months default
 *   - Package bookings distribution (donut chart data)
 *   - Upcoming events (next 5)
 *
 * Query params:
 *   - months (number, default 12) — trailing months for trend
 *   - year (number) — filter trend to a specific year
 *   - month (number, 1-12) — filter trend to a specific month (requires year)
 */
const getVendorDashboard = catchAsync(async (req, res) => {
  const vendorId = req.user.userId;
  const months = Number(req.query.months) || 12;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;

  const result = await DashboardServices.getVendorDashboard(vendorId, months, year, month);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

const getAdminDashboard = catchAsync(async (req, res) => {
  const currentYear = new Date().getFullYear();
  const yearlyRevenueTrendYear = req.query.yearlyRevenueTrendYear ? Number(req.query.yearlyRevenueTrendYear) : currentYear;
  const revenueBreakdownYear = req.query.revenueBreakdownYear ? Number(req.query.revenueBreakdownYear) : currentYear;
  
  const result = await DashboardServices.getAdminDashboard(yearlyRevenueTrendYear, revenueBreakdownYear);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin Dashboard data retrieved successfully',
    data: result,
  });
});

const getAllUpcomingEvents = catchAsync(async (req, res) => {
  const vendorId = req.user.userId;
  const result = await DashboardServices.getAllUpcomingEventsFromDB(vendorId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Upcoming events retrieved successfully',
    data: result,
  });
});

const getVendorMarketingStats = catchAsync(async (req, res) => {
  const result = await DashboardServices.getVendorMarketingStatsFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendor marketing stats retrieved successfully',
    data: result,
  });
});

const getVendorSponsoredStats = catchAsync(async (req, res) => {
  const result = await DashboardServices.getVendorSponsoredStatsFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendor sponsored stats retrieved successfully',
    data: result,
  });
});

const getAdminVendorPerformanceStats = catchAsync(async (req, res) => {
  const result = await DashboardServices.getAdminVendorPerformanceStatsFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin vendor performance stats retrieved successfully',
    data: result,
  });
});

const getAdminVendorPerformanceList = catchAsync(async (req, res) => {
  const result = await DashboardServices.getAdminVendorPerformanceListFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin vendor performance list retrieved successfully',
    data: result,
  });
});

export const DashboardControllers = {
  getVendorDashboard,
  getAdminDashboard,
  getAllUpcomingEvents,
  getVendorMarketingStats,
  getVendorSponsoredStats,
  getAdminVendorPerformanceStats,
  getAdminVendorPerformanceList,
};

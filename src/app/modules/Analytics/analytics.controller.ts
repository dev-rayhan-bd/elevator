import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsServices } from './analytics.services';

/**
 * GET /analytics/vendor
 * Returns:
 *  - kpiCards: Won Bids (PKR), Local Leads, Profile Views, Conversion Rate
 *  - adsPerformance: banner campaigns with impressions / clicks / CTR
 */
const getVendorAnalytics = catchAsync(async (req, res) => {
  const vendorId = req.user.userId;

  const result = await AnalyticsServices.getVendorAnalytics(vendorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Analytics data retrieved successfully',
    data: result,
  });
});

/**
 * GET /analytics/vendor/performance
 * Returns:
 *  - topPackages: Top 5 performing packages (bookings + revenue)
 *  - topServices: Top 5 performing services (views + inquiries)
 *  - contactClicks: summary + recent click activity table
 */
const getVendorPerformance = catchAsync(async (req, res) => {
  const vendorId = req.user.userId;

  const result = await AnalyticsServices.getVendorPerformance(vendorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Performance data retrieved successfully',
    data: result,
  });
});

export const AnalyticsControllers = {
  getVendorAnalytics,
  getVendorPerformance,
};

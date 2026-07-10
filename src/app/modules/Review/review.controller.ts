import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReviewServices } from './review.services';
import httpStatus from 'http-status';

// ── Create review ──
const createReview = catchAsync(async (req, res) => {
  const reviewData = { ...req.body, user: req.user.userId };
  const result = await ReviewServices.createReviewInDB(reviewData);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review submitted successfully',
    data: result,
  });
});

// ── Get service reviews (pagination + summary) ──
const getServiceReviews = catchAsync(async (req, res) => {
  const { serviceId } = req.params;
  const userId = (req.user as any)?.userId;
  const result = await ReviewServices.getServiceReviewsFromDB(serviceId, req.query, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result,
  });
});

// ── Delete own review ──
const deleteReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const result = await ReviewServices.deleteReviewInDB(req.user.userId, reviewId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review deleted successfully',
    data: result,
  });
});

// ── Vendor: Get all reviews for my services ──
const getVendorReviews = catchAsync(async (req, res) => {
  const vendorId = req.user.userId;
  const result = await ReviewServices.getVendorReviewsFromDB(vendorId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your service reviews retrieved successfully',
    data: result,
  });
});

export const ReviewControllers = {
  createReview,
  getServiceReviews,
  deleteReview,
  getVendorReviews,
};
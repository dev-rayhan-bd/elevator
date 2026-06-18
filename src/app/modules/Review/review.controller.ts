import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReviewServices } from './review.services';
import httpStatus from 'http-status';

const createReview = catchAsync(async (req, res) => {
  const reviewData = {
    ...req.body,
    user: req.user.userId, // লগইন করা ইউজার আইডি
  };

  const result = await ReviewServices.createReviewInDB(reviewData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Review submitted successfully',
    data: result,
  });
});

const getVendorReviews = catchAsync(async (req, res) => {
  const { vendorId } = req.params;
  const result = await ReviewServices.getVendorReviewsFromDB(vendorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result,
  });
});

export const ReviewControllers = {
  createReview,
  getVendorReviews,
};
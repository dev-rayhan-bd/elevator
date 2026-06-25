import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Review } from './review.model';
import { TReview } from './review.interface';
import { User } from '../User/user.model';
import { sendNotification } from '../../utils/sendNotification';

const createReviewInDB = async (payload: TReview) => {

  const vendor = await User.findById(payload.vendor);
  if (!vendor || vendor.role !== 'vendor') {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found!');
  }

  const result = await Review.create(payload);

  // Notify vendor about the new review (fire-and-forget)
  const reviewer = await User.findById(payload.user).select('firstName lastName');
  const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'A customer';
  sendNotification(
    payload.vendor.toString(),
    'New Review Received',
    `${reviewerName} left you a ${payload.rating}-star review.`,
    'new_review',
    { reviewerName, rating: String(payload.rating), action: 'new_review' }
  );

  return result;
};

const getVendorReviewsFromDB = async (vendorId: string) => {
  return await Review.find({ vendor: vendorId, isDeleted: false })
    .populate('user', 'firstName lastName image') 
    .sort('-createdAt');
};

export const ReviewServices = {
  createReviewInDB,
  getVendorReviewsFromDB,
};
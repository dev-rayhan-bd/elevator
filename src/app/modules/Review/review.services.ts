import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Review } from './review.model';
import { TReview } from './review.interface';
import { User } from '../User/user.model';

const createReviewInDB = async (payload: TReview) => {

  const vendor = await User.findById(payload.vendor);
  if (!vendor || vendor.role !== 'vendor') {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found!');
  }

  const result = await Review.create(payload);
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
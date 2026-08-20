import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Review } from './review.model';
import { TReview } from './review.interface';
import { User } from '../User/user.model';
import { VendorService } from '../VendorService/vendorService.model';
import { sendNotification } from '../../utils/sendNotification';
import { VendorQuote } from '../VendorQuote/vendorQuote.model';

// ── Create Review (one per user per service, purchase-gated) ──
const createReviewInDB = async (payload: TReview) => {
  const service = await VendorService.findById(payload.service);
  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not found!');
  }

  // Ensure the user has purchased this service
  const purchase = await VendorQuote.findOne({
    user: payload.user,
    service: payload.service,
    status: { $in: ['accepted', 'won'] },
    isDeleted: false,
  });
  if (!purchase) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only review a service you have purchased.',
    );
  }

  // Auto-detect vendor from the service — frontend doesn't send vendor ID
  const vendorId = service.vendor;

  const existing = await Review.findOne({
    user: payload.user,
    service: payload.service,
    isDeleted: false,
  });
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already reviewed this service.',
    );
  }

  const result = await Review.create({
    ...payload,
    vendor: vendorId,
  });

  // Notify vendor
  const reviewer = await User.findById(payload.user).select('firstName lastName');
  const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'A customer';
  sendNotification(
    vendorId.toString(),
    'New Review Received',
    `${reviewerName} left you a ${payload.rating}-star review.`,
    'new_review',
    { reviewerName, rating: String(payload.rating), action: 'new_review', actionLink: '/dashboard/vendor/reviews' },
  );

  return result;
};

// ── Get service reviews with pagination + rating summary ──
const getServiceReviewsFromDB = async (
  serviceId: string,
  query: Record<string, unknown>,
  userId?: string,
) => {
  const service = await VendorService.findById(serviceId).select('vendor');
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Service not found');

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = (query.sort as string) || '-createdAt';

  const [reviews, total] = await Promise.all([
    Review.find({ service: serviceId, isDeleted: false })
      .populate('user', 'firstName lastName image')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ service: serviceId, isDeleted: false }),
  ]);

  const allReviews = await Review.find({ service: serviceId, isDeleted: false }).select('rating').lean();
  const summary = computeRatingSummary(allReviews);

  // Add isOwnReview flag
  const reviewsWithFlag = reviews.map((review) => ({
    ...review.toObject(),
    isOwnReview: userId ? review.user._id.toString() === userId : false,
  }));

  return {
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    reviews: reviewsWithFlag,
    summary,
  };
};

// ── Delete own review (soft delete) ──
const deleteReviewInDB = async (userId: string, reviewId: string) => {
  const review = await Review.findOne({ _id: reviewId, user: userId, isDeleted: false });
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found or unauthorized');
  }

  review.isDeleted = true;
  await review.save();
  return review;
};

// ── Helper ──
const computeRatingSummary = (reviews: any[]) => {
  const total = reviews.length;
  if (total === 0) return { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) distribution[r.rating as keyof typeof distribution]++;

  return {
    average: Math.round((sum / total) * 10) / 10,
    total,
    distribution,
  };
};

// ── Internal: get reviews + summary (used by VendorService for single page) ──
const getServiceReviewsWithSummary = async (serviceId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [reviews, total, allRatings] = await Promise.all([
    Review.find({ service: serviceId, isDeleted: false })
      .populate('user', 'firstName lastName image')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ service: serviceId, isDeleted: false }),
    Review.find({ service: serviceId, isDeleted: false }).select('rating').lean(),
  ]);

  return {
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    reviews,
    summary: computeRatingSummary(allRatings),
  };
};

// ── Vendor: Get all reviews for my services ──
const getVendorReviewsFromDB = async (
  vendorId: string,
  query: Record<string, unknown>,
) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Number(query.limit) || 10, 50);
  const skip = (page - 1) * limit;
  const sort = (query.sort as string) || '-createdAt';
  const search = query.search as string | undefined;

  const filter: Record<string, unknown> = { vendor: vendorId, isDeleted: false };

  // Optional search in comment
  if (search) {
    filter.comment = { $regex: search, $options: 'i' };
  }

  // Optional filter by rating
  if (query.rating) {
    filter.rating = Number(query.rating);
  }

  const [reviews, total, allRatings] = await Promise.all([
    Review.find(filter)
      .populate('user', 'firstName lastName image email')
      .populate('service', 'title images pricingType price')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
    Review.find(filter).select('rating').lean(),
  ]);

  const summary = computeRatingSummary(allRatings);

  return {
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    reviews,
    summary,
  };
};

export const ReviewServices = {
  createReviewInDB,
  getServiceReviewsFromDB,
  getServiceReviewsWithSummary,
  deleteReviewInDB,
  getVendorReviewsFromDB,
};
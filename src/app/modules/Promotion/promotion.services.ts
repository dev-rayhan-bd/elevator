import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { PromotionPlan, VendorPromotion } from './promotion.model';
import { TPromotionPlanConfig, TVendorPromotion } from './promotion.interface';
import { User } from '../User/user.model';
import { Verification } from '../Verification/verification.model';

// ── Utility: Mark expired promotions & revert user flags ──
const expireOverduePromotions = async () => {
  const now = new Date();

  // Find all promotions that are expiring now
  const expiringPromotions = await VendorPromotion.find({
    endDate: { $lte: now },
    status: 'active',
    isActive: true,
  });

  if (expiringPromotions.length > 0) {
    // Revert corresponding user flags when a promotion expires
    for (const promo of expiringPromotions) {
      const vendorId = promo.vendor;
      const category = promo.promotionCategory;

      // Only revert if vendor has NO other active promotion of the same category
      const otherActive = await VendorPromotion.countDocuments({
        vendor: vendorId,
        promotionCategory: category,
        status: 'active',
        isActive: true,
        _id: { $ne: promo._id },
        endDate: { $gt: now },
      });

      if (otherActive === 0) {
        if (category === 'sponsored') {
          await User.findByIdAndUpdate(vendorId, { isSponsored: false });
        } else if (category === 'featured') {
          await User.findByIdAndUpdate(vendorId, { isFeatured: false });
        } else if (category === 'verified') {
          await User.findByIdAndUpdate(vendorId, { 'vendor.isVerifiedBadge': false });
        }
      }
    }
  }

  // Update all expiring promotions at once
  const result = await VendorPromotion.updateMany(
    { endDate: { $lte: now }, status: 'active', isActive: true },
    { $set: { status: 'expired', isActive: false } },
  );

  return result;
};

// ══════════════════════════════════════════════
//  ADMIN: PROMOTION PLAN CRUD
// ══════════════════════════════════════════════

const createPromotionPlanIntoDB = async (payload: TPromotionPlanConfig) => {
  // Check uniqueness: one tier per (category + durationDays)
  const duplicate = await PromotionPlan.findOne({
    promotionCategory: payload.promotionCategory,
    durationDays: payload.durationDays,
  });
  if (duplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A ${payload.durationDays}-day tier for ${payload.promotionCategory} already exists`,
    );
  }

  // Auto-calculate final price from originalPrice and discountPercent
  const price = parseFloat((payload.originalPrice - (payload.originalPrice * payload.discountPercent / 100)).toFixed(2));

  const result = await PromotionPlan.create({ ...payload, price });
  return result;
};

const updatePromotionPlanInDB = async (
  id: string,
  payload: Partial<TPromotionPlanConfig>,
) => {
  // Fetch existing plan for uniqueness & price recalculation
  const existingPlan = await PromotionPlan.findById(id);
  if (!existingPlan) throw new AppError(httpStatus.NOT_FOUND, 'Promotion plan not found');

  // If changing category or durationDays, check uniqueness
  if (payload.promotionCategory || payload.durationDays) {
    const category = payload.promotionCategory ?? existingPlan.promotionCategory;
    const days = payload.durationDays ?? existingPlan.durationDays;

    const duplicate = await PromotionPlan.findOne({
      promotionCategory: category,
      durationDays: days,
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new AppError(
        httpStatus.CONFLICT,
        `A ${days}-day tier for ${category} already exists`,
      );
    }
  }

  // Auto-recalculate price if originalPrice or discountPercent changed
  const originalPrice = payload.originalPrice ?? existingPlan.originalPrice;
  const discountPercent = payload.discountPercent ?? existingPlan.discountPercent;
  payload.price = parseFloat((originalPrice - (originalPrice * discountPercent / 100)).toFixed(2));

  const result = await PromotionPlan.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Promotion plan not found');
  return result;
};

const deletePromotionPlanFromDB = async (id: string) => {
  // Check if any vendor has purchased this specific plan tier
  const promotionCount = await VendorPromotion.countDocuments({ plan: new Types.ObjectId(id) });
  if (promotionCount > 0) {
    // Soft-deactivate instead of hard-delete
    const result = await PromotionPlan.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Promotion plan not found');
    return result;
  }
  const result = await PromotionPlan.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Promotion plan not found');
  return result;
};

const getAllPromotionPlansFromDB = async (query: Record<string, unknown>) => {
  const planQuery = new QueryBuilder(PromotionPlan.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await planQuery.modelQuery;
  const meta = await planQuery.countTotal();
  return { meta, result };
};

const getSinglePromotionPlanFromDB = async (id: string) => {
  const result = await PromotionPlan.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Promotion plan not found');
  return result;
};

// ══════════════════════════════════════════════
//  VENDOR: PURCHASE & MANAGE PROMOTIONS
// ══════════════════════════════════════════════

const purchasePromotionIntoDB = async (
  vendorId: string,
  payload: { planId: string; service?: string },
) => {
  // Find the specific plan tier by ID
  const plan = await PromotionPlan.findById(payload.planId);
  if (!plan || !plan.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Promotion plan not found or inactive');
  }

  // ── Block verified purchases here — must use /purchase-verified ──
  if (plan.promotionCategory === 'verified') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Verified promotion requires document upload. Use /promotion/purchase-verified instead.',
    );
  }

  // ── Duplicate prevention: vendor cannot buy same promotion category if already active ──
  const existingActive = await VendorPromotion.findOne({
    vendor: new Types.ObjectId(vendorId),
    promotionCategory: plan.promotionCategory,
    status: 'active',
    isActive: true,
    endDate: { $gte: new Date() },
  });
  if (existingActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      `You already have an active ${plan.promotionCategory} promotion`,
    );
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  // ── Price is pre-calculated in the plan config ──
  const promotionData: Partial<TVendorPromotion> = {
    vendor: new Types.ObjectId(vendorId),
    plan: plan._id,
    promotionCategory: plan.promotionCategory,
    startDate: now,
    endDate,
    price: plan.price,
    discountPrice: plan.discountPercent > 0
      ? parseFloat((plan.originalPrice - plan.price).toFixed(2))
      : undefined,
    status: 'active',
    isActive: true,
    paymentStatus: 'pending',
    isPostCreated: false,
  };

  if (payload.service) {
    promotionData.service = new Types.ObjectId(payload.service);
  }

  const result = await VendorPromotion.create(promotionData);
  return result;
};

// ══════════════════════════════════════════════
//  VENDOR: PURCHASE VERIFIED PROMOTION (with documents)
// ══════════════════════════════════════════════

const purchaseVerifiedPromotionIntoDB = async (
  vendorId: string,
  payload: { planId: string; documents: string[] },
) => {
  const plan = await PromotionPlan.findById(payload.planId);
  if (!plan || !plan.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Promotion plan not found or inactive');
  }

  // Only 'verified' category allowed here
  if (plan.promotionCategory !== 'verified') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This endpoint is only for verified promotion. Use /promotion/purchase for other categories.',
    );
  }

  // Documents are mandatory
  if (!payload.documents || payload.documents.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one verification document is required',
    );
  }

  // Duplicate check — also block if there's a pending review
  const existingVerified = await VendorPromotion.findOne({
    vendor: new Types.ObjectId(vendorId),
    promotionCategory: 'verified',
    status: { $in: ['pending', 'active'] },
  });
  if (existingVerified) {
    throw new AppError(
      httpStatus.CONFLICT,
      `You already have a ${existingVerified.status} verified promotion request`,
    );
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  const promotionData: Partial<TVendorPromotion> = {
    vendor: new Types.ObjectId(vendorId),
    plan: plan._id,
    promotionCategory: 'verified',
    startDate: now,
    endDate,
    price: plan.price,
    discountPrice: plan.discountPercent > 0
      ? parseFloat((plan.originalPrice - plan.price).toFixed(2))
      : undefined,
    status: 'pending', // ── Awaiting admin review ──
    isActive: false,     // ── Not public until approved ──
    paymentStatus: 'pending',
    isPostCreated: false,
  };

  const vendorPromotion = await VendorPromotion.create(promotionData);

  // ── Create/update Verification record (documents stored in Verification model) ──
  const existingVerification = await Verification.findOne({ vendor: vendorId });
  if (existingVerification) {
    existingVerification.documents = payload.documents;
    existingVerification.status = 'pending';
    existingVerification.rejectedReason = undefined;
    existingVerification.verifiedBy = undefined;
    existingVerification.verifiedAt = undefined;
    await existingVerification.save();
  } else {
    await Verification.create({
      vendor: new Types.ObjectId(vendorId),
      documents: payload.documents,
      notes: 'Submitted via verified promotion purchase',
    });
  }

  return vendorPromotion;
};

const getMyPromotionsFromDB = async (
  vendorId: string,
  query: Record<string, unknown>,
) => {
  await expireOverduePromotions();

  const promotionQuery = new QueryBuilder(
    VendorPromotion.find({ vendor: vendorId })
      .populate('service', 'title images')
      .populate('plan', 'promotionCategory durationTitle durationDays isPopular')
      .sort('-createdAt'),
    query,
  )
    .filter()
    .paginate()
    .fields();

  const result = await promotionQuery.modelQuery;
  const meta = await promotionQuery.countTotal();
  return { meta, result };
};

const cancelMyPromotionFromDB = async (vendorId: string, promotionId: string) => {
  const promotion = await VendorPromotion.findOne({
    _id: promotionId,
    vendor: vendorId,
  });
  if (!promotion) {
    throw new AppError(httpStatus.NOT_FOUND, 'Promotion not found or unauthorized');
  }
  if (promotion.status !== 'active') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Promotion is not active');
  }

  promotion.status = 'cancelled';
  promotion.isActive = false;
  await promotion.save();
  return promotion;
};

// ══════════════════════════════════════════════
//  PUBLIC/ADMIN: QUERY PROMOTIONS
// ══════════════════════════════════════════════

const getActivePromotionsFromDB = async (query: Record<string, unknown>) => {
  await expireOverduePromotions();

  const now = new Date();
  const promotionQuery = new QueryBuilder(
    VendorPromotion.find({
      status: 'active',
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('vendor', 'firstName lastName fullName email image vendor.businessName')
      .populate('service', 'title images pricingType price')
      .populate('plan', 'promotionCategory durationTitle durationDays isPopular')
      .sort('-createdAt'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await promotionQuery.modelQuery;
  const meta = await promotionQuery.countTotal();
  return { meta, result };
};

const adminGetAllPromotionsFromDB = async (query: Record<string, unknown>) => {
  await expireOverduePromotions();

  const promotionQuery = new QueryBuilder(
    VendorPromotion.find()
      .populate('vendor', 'firstName lastName fullName email image')
      .populate('service', 'title images')
      .populate('plan', 'promotionCategory durationTitle durationDays isPopular'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await promotionQuery.modelQuery;
  const meta = await promotionQuery.countTotal();
  return { meta, result };
};

const adminUpdatePaymentStatusInDB = async (
  promotionId: string,
  paymentStatus: 'paid' | 'refunded',
) => {
  const promotion = await VendorPromotion.findById(promotionId);
  if (!promotion) throw new AppError(httpStatus.NOT_FOUND, 'Promotion not found');

  const vendorId = promotion.vendor;
  const category = promotion.promotionCategory;

  // ── Sync user flags based on payment status ──
  if (paymentStatus === 'paid') {
    // Set flag when payment is confirmed
    if (category === 'sponsored') {
      await User.findByIdAndUpdate(vendorId, { isSponsored: true });
    } else if (category === 'featured') {
      await User.findByIdAndUpdate(vendorId, { isFeatured: true });
    } else if (category === 'verified') {
      await User.findByIdAndUpdate(vendorId, { 'vendor.isVerifiedBadge': true });
    }
  } else if (paymentStatus === 'refunded' && promotion.paymentStatus === 'paid') {
    // Revert flag when payment is refunded (only if no other active promotion of same category)
    const otherActive = await VendorPromotion.countDocuments({
      vendor: vendorId,
      promotionCategory: category,
      status: 'active',
      isActive: true,
      _id: { $ne: promotion._id },
      endDate: { $gte: new Date() },
    });

    if (otherActive === 0) {
      if (category === 'sponsored') {
        await User.findByIdAndUpdate(vendorId, { isSponsored: false });
      } else if (category === 'featured') {
        await User.findByIdAndUpdate(vendorId, { isFeatured: false });
      } else if (category === 'verified') {
        await User.findByIdAndUpdate(vendorId, { 'vendor.isVerifiedBadge': false });
      }
    }
  }

  promotion.paymentStatus = paymentStatus;
  await promotion.save();
  return promotion;
};

// ══════════════════════════════════════════════
//  CRON
// ══════════════════════════════════════════════

const runExpiryCron = async () => {
  const result = await expireOverduePromotions();
  return result;
};

// ══════════════════════════════════════════════
//  ADMIN: TOGGLE PLAN isActive
// ══════════════════════════════════════════════

const adminTogglePromotionPlanIsActiveInDB = async (id: string) => {
  const plan = await PromotionPlan.findById(id);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Promotion plan not found');

  plan.isActive = !plan.isActive;
  await plan.save();
  return plan;
};

// ══════════════════════════════════════════════
//  ADMIN: TOGGLE VENDOR PURCHASED PROMOTION isActive
// ══════════════════════════════════════════════

const adminToggleVendorPromotionIsActiveInDB = async (id: string) => {
  const promotion = await VendorPromotion.findById(id);
  if (!promotion) throw new AppError(httpStatus.NOT_FOUND, 'Vendor promotion not found');

  promotion.isActive = !promotion.isActive;
  await promotion.save();
  return promotion;
};

export const PromotionServices = {
  // Admin: Plan CRUD
  createPromotionPlanIntoDB,
  updatePromotionPlanInDB,
  deletePromotionPlanFromDB,
  getAllPromotionPlansFromDB,
  getSinglePromotionPlanFromDB,

  // Vendor
  purchasePromotionIntoDB,
  purchaseVerifiedPromotionIntoDB,
  getMyPromotionsFromDB,
  cancelMyPromotionFromDB,

  // Public / Admin
  getActivePromotionsFromDB,
  adminGetAllPromotionsFromDB,
  adminUpdatePaymentStatusInDB,

  // Cron
  runExpiryCron,

  // Toggle
  adminTogglePromotionPlanIsActiveInDB,
  adminToggleVendorPromotionIsActiveInDB,
};

// Named export for cron job
export { expireOverduePromotions };

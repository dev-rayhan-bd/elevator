import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { PromotionPlan, VendorPromotion } from './promotion.model';
import { TPromotionPlanConfig, TVendorPromotion } from './promotion.interface';
import { User } from '../User/user.model';
import { UserServices } from '../User/user.services';
import { Verification } from '../Verification/verification.model';
import { sendNotificationToAdmins } from '../../utils/sendNotification';
import { VendorService } from '../VendorService/vendorService.model';

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

        // Trigger visibility score recalculation when promotion expires
        void UserServices.calculateAndUpdateVisibilityScore(vendorId.toString());
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
    throw new AppError(
      httpStatus.BAD_REQUEST, 
      'This plan cannot be deleted because it has already been purchased by vendors.'
    );
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

  // ── For sponsored and featured listings, service selection is mandatory ──
  if (['sponsored', 'featured'].includes(plan.promotionCategory) && !payload.service) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Service selection is required. Please select which service you want to promote for ${plan.promotionCategory} listing.`,
    );
  }

  // ── Duplicate prevention: check if this service (or vendor) already has active unexpired promotion ──
  const now = new Date();
  if (payload.service) {
    const serviceDoc = await VendorService.findById(payload.service);
    if (!serviceDoc) {
      throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
    }
    if (serviceDoc.vendor.toString() !== vendorId) {
      throw new AppError(httpStatus.FORBIDDEN, 'You can only promote your own services');
    }

    const existingActive = await VendorPromotion.findOne({
      vendor: new Types.ObjectId(vendorId),
      service: new Types.ObjectId(payload.service),
      promotionCategory: plan.promotionCategory,
      status: 'active',
      isActive: true,
      endDate: { $gte: now },
    });
    if (existingActive) {
      throw new AppError(
        httpStatus.CONFLICT,
        `This service already has an active ${plan.promotionCategory} promotion`,
      );
    }
  } else {
    const existingActive = await VendorPromotion.findOne({
      vendor: new Types.ObjectId(vendorId),
      service: null,
      promotionCategory: plan.promotionCategory,
      status: 'active',
      isActive: true,
      endDate: { $gte: now },
    });
    if (existingActive) {
      throw new AppError(
        httpStatus.CONFLICT,
        `You already have an active ${plan.promotionCategory} promotion`,
      );
    }
  }

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
    paymentStatus: 'paid',
    isPostCreated: false,
  };

  if (payload.service) {
    promotionData.service = new Types.ObjectId(payload.service);
  }

  const result = await VendorPromotion.create(promotionData);

  // Populate service and plan for clear API response
  await result.populate('service', 'title images price pricingType');
  await result.populate('plan', 'promotionCategory durationTitle durationDays price');

  // ── Sync User flags immediately (sponsored/featured start right away) ──
  if (plan.promotionCategory === 'sponsored') {
    await User.findByIdAndUpdate(vendorId, { isSponsored: true });
  } else if (plan.promotionCategory === 'featured') {
    await User.findByIdAndUpdate(vendorId, { isFeatured: true });
  }

  // Trigger visibility score recalculation for Ads & Promotion task
  void UserServices.calculateAndUpdateVisibilityScore(vendorId);

  return result;
};

// ══════════════════════════════════════════════
//  VENDOR: PURCHASE VERIFIED PROMOTION (with documents)
// ══════════════════════════════════════════════

const purchaseVerifiedPromotionIntoDB = async (
  vendorId: string,
  payload: { 
    planId?: string; 
    documents?: string[];
    cnicFront?: string;
    cnicBack?: string;
    ntn?: string;
    incorporationCertificate?: string;
    businessName?: string;
    fullAddress?: string;
    ownerName?: string;
    registeredPhone?: string;
    notes?: string;
  },
) => {
  let plan: any;
  if (payload.planId) {
    plan = await PromotionPlan.findById(payload.planId);
  }
  if (!plan) {
    const existingPromo = await VendorPromotion.findOne({
      vendor: new Types.ObjectId(vendorId),
      promotionCategory: 'verified',
      status: 'pending',
    }).populate('plan');
    if (existingPromo && existingPromo.plan) {
      plan = existingPromo.plan;
    } else {
      plan = await PromotionPlan.findOne({
        promotionCategory: 'verified',
        isActive: true,
      });
    }
  }
  if (!plan || !plan.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Verified promotion plan not found or inactive');
  }

  // Only 'verified' category allowed here
  if (plan.promotionCategory !== 'verified') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This endpoint is only for verified promotion. Use /promotion/purchase for other categories.',
    );
  }

  // Duplicate check — block if active; allow updating documents if pending
  const existingVerified = await VendorPromotion.findOne({
    vendor: new Types.ObjectId(vendorId),
    promotionCategory: 'verified',
    status: { $in: ['pending', 'active'] },
  });
  if (existingVerified && existingVerified.status === 'active') {
    throw new AppError(
      httpStatus.CONFLICT,
      'You already have an active verified badge promotion',
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

  let vendorPromotion: any;
  if (existingVerified && existingVerified.status === 'pending') {
    existingVerified.plan = plan._id;
    existingVerified.price = plan.price;
    existingVerified.startDate = now;
    existingVerified.endDate = endDate;
    await existingVerified.save();
    vendorPromotion = existingVerified;
  } else {
    vendorPromotion = await VendorPromotion.create(promotionData);
  }

  // ── Create/update Verification record (documents stored in Verification model) ──
  const docs = Array.from(
    new Set(
      [
        ...(payload.documents || []),
        payload.cnicFront,
        payload.cnicBack,
        payload.ntn,
        payload.incorporationCertificate,
      ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0),
    ),
  );

  const existingVerification = await Verification.findOne({ vendor: vendorId });
  const notesText = payload.notes || (docs.length > 0 
    ? 'Submitted via verified promotion purchase with documents' 
    : 'Paid Individual Verification (No Documents)');

  if (existingVerification) {
    if (docs.length > 0) {
      existingVerification.documents = docs;
    }
    if (payload.cnicFront) existingVerification.cnicFront = payload.cnicFront;
    if (payload.cnicBack) existingVerification.cnicBack = payload.cnicBack;
    if (payload.ntn) existingVerification.ntn = payload.ntn;
    if (payload.incorporationCertificate)
      existingVerification.incorporationCertificate = payload.incorporationCertificate;
    
    if (payload.businessName) existingVerification.businessName = payload.businessName;
    if (payload.fullAddress) existingVerification.fullAddress = payload.fullAddress;
    if (payload.ownerName) existingVerification.ownerName = payload.ownerName;
    if (payload.registeredPhone) existingVerification.registeredPhone = payload.registeredPhone;
    if (payload.notes) existingVerification.notes = payload.notes;

    existingVerification.documents = Array.from(
      new Set(
        [
          ...(existingVerification.documents || []),
          existingVerification.cnicFront,
          existingVerification.cnicBack,
          existingVerification.ntn,
          existingVerification.incorporationCertificate,
        ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0),
      ),
    );

    existingVerification.status = 'pending';
    existingVerification.rejectedReason = undefined;
    existingVerification.verifiedBy = undefined;
    existingVerification.verifiedAt = undefined;
    await existingVerification.save();
  } else {
    await Verification.create({
      vendor: new Types.ObjectId(vendorId),
      documents: docs,
      cnicFront: payload.cnicFront,
      cnicBack: payload.cnicBack,
      ntn: payload.ntn,
      incorporationCertificate: payload.incorporationCertificate,
      businessName: payload.businessName,
      fullAddress: payload.fullAddress,
      ownerName: payload.ownerName,
      registeredPhone: payload.registeredPhone,
      notes: notesText,
      status: 'pending',
    });
  }

  // Also update user's profile documents & details
  const updateObj: Record<string, any> = {};
  if (docs.length > 0) {
    updateObj['vendor.documents'] = docs;
  }
  if (payload.businessName) updateObj['vendor.businessName'] = payload.businessName;
  if (payload.ownerName) updateObj['vendor.ownerName'] = payload.ownerName;
  if (payload.fullAddress) updateObj['vendor.location.address'] = payload.fullAddress;
  if (payload.registeredPhone) updateObj['vendor.whatsappNumber'] = payload.registeredPhone;
  if (Object.keys(updateObj).length > 0) {
    await User.findByIdAndUpdate(vendorId, { $set: updateObj });
  }

  // Notify admins of new verified promotion request pending approval
  try {
    const vendorUser = await User.findById(vendorId).select('vendor fullName firstName lastName');
    const businessName =
      payload.businessName ||
      vendorUser?.vendor?.businessName ||
      vendorUser?.fullName ||
      `${vendorUser?.firstName || ''} ${vendorUser?.lastName || ''}`.trim() ||
      'Vendor';

    void sendNotificationToAdmins(
      'New Verified Promotion Request 🛡️',
      `Vendor "${businessName}" has submitted a Verified Promotion request pending admin review.`,
      'promotion_pending',
      { promotionId: vendorPromotion._id.toString(), vendorId, businessName },
    );
  } catch (err) {
    console.error('Failed to notify admins of verified promotion request:', err);
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

  const category = promotion.promotionCategory;

  promotion.status = 'cancelled';
  promotion.isActive = false;
  await promotion.save();

  // ── Revert User flag only if no other active promotion of same category ──
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

  // Trigger visibility score recalculation (dynamic reversion)
  void UserServices.calculateAndUpdateVisibilityScore(vendorId.toString());

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
      .populate('vendor', 'firstName lastName fullName email image lat long vendor')
      .populate('service', 'title images pricingType price')
      .populate('plan', 'promotionCategory durationTitle durationDays isPopular')
      .sort('-createdAt'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const rawResult = await promotionQuery.modelQuery;
  const meta = await promotionQuery.countTotal();

  const result = rawResult.map((item: any) => {
    const promo = item.toObject ? item.toObject() : { ...item };
    if (promo.vendor && typeof promo.vendor === 'object') {
      const bName =
        promo.vendor.vendor?.businessName ||
        promo.vendor.businessName ||
        promo.vendor.fullName ||
        `${promo.vendor.firstName || ''} ${promo.vendor.lastName || ''}`.trim() ||
        'Vendor';
      promo.vendor.businessName = bName;
      promo.businessName = bName;
      if (promo.vendor.vendor) {
        promo.vendor.vendor.businessName = bName;
      }
      if (!promo.vendor.email && promo.vendor.vendor?.email) {
        promo.vendor.email = promo.vendor.vendor.email;
      }
    }
    return promo;
  });

  return { meta, result };
};

const adminGetAllPromotionsFromDB = async (query: Record<string, unknown>) => {
  await expireOverduePromotions();

  // ── Auto-sync: If vendor is verified, ensure their verified promotion is paid and active ──
  try {
    const pendingVerifiedPromos = await VendorPromotion.find({
      promotionCategory: 'verified',
      $or: [{ paymentStatus: 'pending' }, { isActive: false }, { status: 'pending' }],
    });

    for (const promo of pendingVerifiedPromos) {
      const vendorUser = await User.findById(promo.vendor).select('vendor.isVerifiedBadge');
      if (vendorUser?.vendor?.isVerifiedBadge) {
        promo.paymentStatus = 'paid';
        promo.status = 'active';
        promo.isActive = true;
        await promo.save();
      }
    }
  } catch (err) {
    console.error('Error auto-syncing verified promotions:', err);
  }

  const promotionQuery = new QueryBuilder(
    VendorPromotion.find()
      .populate('vendor', 'firstName lastName fullName email image lat long vendor')
      .populate('service', 'title images')
      .populate('plan', 'promotionCategory durationTitle durationDays isPopular'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const rawResult = await promotionQuery.modelQuery;
  const meta = await promotionQuery.countTotal();

  const result = rawResult.map((item: any) => {
    const promo = item.toObject ? item.toObject() : { ...item };
    if (promo.vendor && typeof promo.vendor === 'object') {
      const bName =
        promo.vendor.vendor?.businessName ||
        promo.vendor.businessName ||
        promo.vendor.fullName ||
        `${promo.vendor.firstName || ''} ${promo.vendor.lastName || ''}`.trim() ||
        'Vendor';
      promo.vendor.businessName = bName;
      promo.businessName = bName;
      if (promo.vendor.vendor) {
        promo.vendor.vendor.businessName = bName;
      }
      if (!promo.vendor.email && promo.vendor.vendor?.email) {
        promo.vendor.email = promo.vendor.vendor.email;
      }
    }
    return promo;
  });

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
    if (promotion.status === 'pending') {
      const now = new Date();
      const originalDuration =
        promotion.endDate.getTime() - promotion.startDate.getTime();
      promotion.startDate = now;
      promotion.endDate = new Date(
        now.getTime() + (originalDuration > 0 ? originalDuration : 30 * 24 * 60 * 60 * 1000),
      );
      promotion.status = 'active';
    }
    promotion.isActive = true;

    // Set flag when payment is confirmed
    if (category === 'sponsored') {
      await User.findByIdAndUpdate(vendorId, { isSponsored: true });
    } else if (category === 'featured') {
      await User.findByIdAndUpdate(vendorId, { isFeatured: true });
    } else if (category === 'verified') {
      await User.findByIdAndUpdate(vendorId, { 'vendor.isVerifiedBadge': true });
      await Verification.findOneAndUpdate(
        { vendor: vendorId, status: 'pending' },
        { status: 'verified', verifiedAt: new Date() },
      );
    }

    // Trigger visibility score recalculation for Ads & Promotion task
    void UserServices.calculateAndUpdateVisibilityScore(vendorId.toString());
  } else if (paymentStatus === 'refunded' && promotion.paymentStatus === 'paid') {
    promotion.isActive = false;
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

    // Trigger visibility score recalculation (dynamic reversion)
    void UserServices.calculateAndUpdateVisibilityScore(vendorId.toString());
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

  const vendorId = promotion.vendor.toString();
  const category = promotion.promotionCategory;

  // ── Sync User flags based on new active state ──
  if (promotion.isActive && promotion.status === 'active') {
    // Promotion reactivated → set flag
    if (category === 'sponsored') {
      await User.findByIdAndUpdate(vendorId, { isSponsored: true });
    } else if (category === 'featured') {
      await User.findByIdAndUpdate(vendorId, { isFeatured: true });
    } else if (category === 'verified') {
      await User.findByIdAndUpdate(vendorId, { 'vendor.isVerifiedBadge': true });
    }
  } else {
    // Promotion deactivated → revert flag (only if no other active)
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

  // Trigger visibility score recalculation
  void UserServices.calculateAndUpdateVisibilityScore(vendorId);

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

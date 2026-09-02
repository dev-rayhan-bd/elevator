import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Banner, BannerSlot, BannerTracking } from './banner.model';
import { TBanner, TBannerSlot } from './banner.interface';

// ── Utility: Mark expired banners ──
const expireOverdueBanners = async () => {
  const now = new Date();
  const result = await Banner.updateMany(
    { endDate: { $lte: now }, status: 'approved', isActive: true, isDeleted: { $ne: true } },
    { $set: { status: 'expired', isActive: false } },
  );
  return result;
};

// ══════════════════════════════════════════════
//  ADMIN: SLOT MANAGEMENT
// ══════════════════════════════════════════════

const createSlotIntoDB = async (payload: TBannerSlot) => {
  const existing = await BannerSlot.findOne({ slotType: payload.slotType });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'Slot type already exists');
  }
  const result = await BannerSlot.create(payload);
  return result;
};

const updateSlotInDB = async (id: string, payload: Partial<TBannerSlot>) => {
  if (payload.slotType) {
    const duplicate = await BannerSlot.findOne({
      slotType: payload.slotType,
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new AppError(httpStatus.CONFLICT, 'Slot type already taken');
    }
  }
  const result = await BannerSlot.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Slot not found');
  return result;
};

const deleteSlotFromDB = async (id: string) => {
  // Soft-check: don't delete if banners exist for this slot
  const bannerCount = await Banner.countDocuments({ slot: id, isDeleted: { $ne: true } });
  if (bannerCount > 0) {
    // Instead of deleting, just deactivate
    const result = await BannerSlot.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Slot not found');
    return result;
  }
  const result = await BannerSlot.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Slot not found');
  return result;
};

const getAllSlotsFromDB = async (query: Record<string, unknown>) => {
  const slotQuery = new QueryBuilder(BannerSlot.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const slots = await slotQuery.modelQuery;
  const meta = await slotQuery.countTotal();

  const now = new Date();
  const result = await Promise.all(
    slots.map(async (slot) => {
      const activeCount = await Banner.countDocuments({
        slot: slot._id,
        status: 'approved',
        isActive: true,
        isDeleted: { $ne: true },
        startDate: { $lte: now },
        endDate: { $gte: now },
      });

      return {
        ...slot.toObject(),
        totalActive: activeCount,
        remaining: Math.max(0, slot.maxActive - activeCount),
      };
    }),
  );

  return { meta, result };
};

const getSingleSlotFromDB = async (id: string) => {
  const result = await BannerSlot.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Slot not found');
  return result;
};

// ══════════════════════════════════════════════
//  VENDOR: BANNER BOOKING
// ══════════════════════════════════════════════

const bookBannerIntoDB = async (
  vendorId: string,
  payload: { slot: string; title: string; image: string; link?: string },
) => {
  // Validate slot exists and is active
  const slot = await BannerSlot.findById(payload.slot);
  if (!slot) throw new AppError(httpStatus.NOT_FOUND, 'Slot not found');
  if (!slot.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Slot is not available');
  }

  const bannerData: Partial<TBanner> = {
    vendor: new Types.ObjectId(vendorId),
    slot: new Types.ObjectId(payload.slot),
    title: payload.title,
    image: payload.image,
    link: payload.link,
    price: slot.price,
    status: 'pending',
    isActive: true,
    isDeleted: false,
    impressions: 0,
    clicks: 0,
  };

  const result = await Banner.create(bannerData);
  return result;
};

const getMyBannersFromDB = async (
  vendorId: string,
  query: Record<string, unknown>,
) => {
  // Auto-expire before fetching
  await expireOverdueBanners();

  const filterCondition: Record<string, any> = { vendor: new Types.ObjectId(vendorId) };

  if (query.isDeleted === 'true' || query.isDeleted === true) {
    filterCondition.isDeleted = true;
  } else if (query.isDeleted === 'all' || query.includeDeleted === 'true' || query.includeDeleted === true) {
    // include both deleted and non-deleted
  } else {
    filterCondition.isDeleted = { $ne: true };
  }

  const queryObj = { ...query };
  delete queryObj.isDeleted;
  delete queryObj.includeDeleted;

  const bannerQuery = new QueryBuilder(
    Banner.find(filterCondition)
      .populate('slot', 'slotType title dimensions')
      .sort('-createdAt'),
    queryObj,
  )
    .filter()
    .paginate()
    .fields();

  const result = await bannerQuery.modelQuery;
  const meta = await bannerQuery.countTotal();
  return { meta, result };
};

const deleteMyBannerFromDB = async (vendorId: string, bannerId: string) => {
  const banner = await Banner.findOne({
    _id: bannerId,
    vendor: vendorId,
    isDeleted: { $ne: true },
  });
  if (!banner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Banner not found or unauthorized');
  }
  if (banner.status === 'approved') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot delete an approved banner. Contact admin.',
    );
  }
  await Banner.findByIdAndUpdate(bannerId, { isDeleted: true });
  return banner;
};

// ══════════════════════════════════════════════
//  PUBLIC: DISPLAY
// ══════════════════════════════════════════════

const getActiveBannersFromDB = async (query: Record<string, unknown>) => {
  // Auto-expire before fetching
  await expireOverdueBanners();

  const now = new Date();
  const bannerQuery = new QueryBuilder(
    Banner.find({
      status: 'approved',
      isActive: true,
      isDeleted: { $ne: true },
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('slot', 'slotType title dimensions')
      .select('title image link slot startDate endDate impressions clicks'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await bannerQuery.modelQuery;
  const meta = await bannerQuery.countTotal();

  // Group by slotType for easy frontend consumption
  const grouped: Record<string, typeof result> = {};
  for (const banner of result) {
    const key = (banner as any).slot?.slotType || 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(banner);
  }

  return { meta, result, grouped };
};

const getAvailableSlotsFromDB = async () => {
  const slots = await BannerSlot.find({ isActive: true }).lean();
  const totalSlot = await BannerSlot.countDocuments();

  const now = new Date();
  const result = await Promise.all(
    slots.map(async (slot) => {
      const activeCount = await Banner.countDocuments({
        slot: slot._id,
        status: 'approved',
        isActive: true,
        isDeleted: { $ne: true },
        startDate: { $lte: now },
        endDate: { $gte: now },
      });

      return {
        ...slot,
        totalActive: activeCount,
        remaining: Math.max(0, slot.maxActive - activeCount),
      };
    }),
  );

  return { totalSlot, result };
};

// ══════════════════════════════════════════════
//  ADMIN: BANNER APPROVAL / REJECTION
// ══════════════════════════════════════════════

const adminGetAllBannersFromDB = async (query: Record<string, unknown>) => {
  await expireOverdueBanners();

  const filterCondition: Record<string, any> = {};

  if (query.isDeleted === 'true' || query.isDeleted === true) {
    filterCondition.isDeleted = true;
  } else if (query.isDeleted === 'all' || query.includeDeleted === 'true' || query.includeDeleted === true) {
    // include both deleted and non-deleted
  } else {
    filterCondition.isDeleted = { $ne: true };
  }

  if (query.createdByType === 'admin') {
    filterCondition.createdByType = 'admin';
  } else if (query.createdByType === 'vendor') {
    filterCondition.createdByType = { $ne: 'admin' };
  }

  const queryObj = { ...query };
  delete queryObj.isDeleted;
  delete queryObj.includeDeleted;
  delete queryObj.createdByType;

  const bannerQuery = new QueryBuilder(
    Banner.find(filterCondition)
      .populate('vendor', 'firstName lastName fullName email image')
      .populate('slot', 'slotType title price dimensions'),
    queryObj,
  )
    .search(['title'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await bannerQuery.modelQuery;
  const meta = await bannerQuery.countTotal();
  return { meta, result };
};

const adminUpdateBannerStatusInDB = async (
  bannerId: string,
  status: 'approved' | 'rejected',
) => {
  const banner = await Banner.findOne({ _id: bannerId, isDeleted: { $ne: true } }).populate('slot');
  if (!banner) throw new AppError(httpStatus.NOT_FOUND, 'Banner not found');
  if (banner.status !== 'pending') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Banner is already ${banner.status}`,
    );
  }

  const updateData: Record<string, unknown> = { status };

  // If approving, set startDate = now + calculate endDate from slot duration
  if (status === 'approved') {
    const slot = banner.slot as unknown as TBannerSlot;
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + slot.durationDays);

    // Check maxActive capacity
    const activeCount = await Banner.countDocuments({
      _id: { $ne: bannerId },
      slot: banner.slot,
      status: 'approved',
      isActive: true,
      isDeleted: { $ne: true },
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    if (activeCount >= slot.maxActive) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Slot capacity reached (max ${slot.maxActive} active). Cannot approve more banners for this slot.`,
      );
    }

    updateData.startDate = now;
    updateData.endDate = endDate;
  }

  const result = await Banner.findByIdAndUpdate(bannerId, updateData, {
    new: true,
  });
  return result;
};

const adminToggleBannerIsActiveInDB = async (bannerId: string) => {
  const banner = await Banner.findOne({ _id: bannerId, isDeleted: { $ne: true } });
  if (!banner) throw new AppError(httpStatus.NOT_FOUND, 'Banner not found');

  const result = await Banner.findByIdAndUpdate(
    bannerId,
    { isActive: !banner.isActive },
    { new: true },
  );
  return result;
};

const adminDeleteBannerFromDB = async (bannerId: string) => {
  const banner = await Banner.findOne({ _id: bannerId, isDeleted: { $ne: true } });
  if (!banner) throw new AppError(httpStatus.NOT_FOUND, 'Banner not found');

  const result = await Banner.findByIdAndUpdate(
    bannerId,
    { isDeleted: true },
    { new: true },
  );
  return result;
};

// ══════════════════════════════════════════════
//  TRACKING: Impression & Click
// ══════════════════════════════════════════════

const trackImpressionInDB = async (bannerId: string, clientIp: string) => {
  // Check if same IP already tracked in last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await BannerTracking.findOne({
    banner: bannerId,
    ip: clientIp,
    type: 'impression',
    createdAt: { $gte: since },
  });
  if (existing) {
    // Already tracked — return current count without incrementing
    const banner = await Banner.findById(bannerId).select('impressions');
    if (!banner) throw new AppError(httpStatus.NOT_FOUND, 'Banner not found');
    return { impressions: banner.impressions, cooldown: true };
  }

  // New unique impression
  await BannerTracking.create({
    banner: bannerId,
    ip: clientIp,
    type: 'impression',
  });

  const result = await Banner.findByIdAndUpdate(
    bannerId,
    { $inc: { impressions: 1 } },
    { new: true },
  );
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Banner not found');
  return { impressions: result.impressions, cooldown: false };
};

const trackClickInDB = async (bannerId: string, clientIp: string) => {
  // Check if same IP already tracked in last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await BannerTracking.findOne({
    banner: bannerId,
    ip: clientIp,
    type: 'click',
    createdAt: { $gte: since },
  });
  if (existing) {
    const banner = await Banner.findById(bannerId).select('clicks');
    if (!banner) throw new AppError(httpStatus.NOT_FOUND, 'Banner not found');
    return { clicks: banner.clicks, cooldown: true };
  }

  // New unique click
  await BannerTracking.create({
    banner: bannerId,
    ip: clientIp,
    type: 'click',
  });

  const result = await Banner.findByIdAndUpdate(
    bannerId,
    { $inc: { clicks: 1 } },
    { new: true },
  );
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Banner not found');
  return { clicks: result.clicks, cooldown: false };
};

// ══════════════════════════════════════════════
//  CRON: Manual expiry trigger
// ══════════════════════════════════════════════

const runExpiryCron = async () => {
  const result = await expireOverdueBanners();
  return { message: 'Expired banners processed', modifiedCount: result.modifiedCount };
};

const createAdminBannerIntoDB = async (payload: {
  slot: string;
  title: string;
  image: string;
  link?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  price?: number;
  isActive?: boolean;
}) => {
  const slot = await BannerSlot.findById(payload.slot);
  if (!slot) throw new AppError(httpStatus.NOT_FOUND, 'Slot not found');

  const start = payload.startDate ? new Date(payload.startDate) : new Date();
  let end: Date;
  if (payload.endDate) {
    end = new Date(payload.endDate);
  } else {
    end = new Date(start);
    end.setDate(end.getDate() + (slot.durationDays || 30));
  }

  const bannerData: Partial<TBanner> = {
    slot: new Types.ObjectId(payload.slot),
    title: payload.title,
    image: payload.image,
    link: payload.link,
    startDate: start,
    endDate: end,
    price: payload.price !== undefined ? payload.price : slot.price,
    status: 'approved',
    isActive: payload.isActive !== undefined ? payload.isActive : true,
    isDeleted: false,
    createdByType: 'admin',
    impressions: 0,
    clicks: 0,
  };

  const result = await Banner.create(bannerData);
  return result;
};

export const BannerServices = {
  // Slot management (Admin)
  createSlotIntoDB,
  updateSlotInDB,
  deleteSlotFromDB,
  getAllSlotsFromDB,
  getSingleSlotFromDB,
  // Banner booking (Vendor)
  bookBannerIntoDB,
  getMyBannersFromDB,
  deleteMyBannerFromDB,
  // Public display
  getActiveBannersFromDB,
  getAvailableSlotsFromDB,
  // Admin banner management
  createAdminBannerIntoDB,
  adminGetAllBannersFromDB,
  adminUpdateBannerStatusInDB,
  adminToggleBannerIsActiveInDB,
  adminDeleteBannerFromDB,
  // Tracking
  trackImpressionInDB,
  trackClickInDB,
  // Cron
  runExpiryCron,
};

// Named export for cron job
export { expireOverdueBanners };

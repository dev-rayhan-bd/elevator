import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { BannerServices } from './banner.services';
import uploadImage from '../../middleware/upload';

// ══════════════════════════════════════════════
//  ADMIN: SLOT CRUD
// ══════════════════════════════════════════════

const createSlot = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.createSlotIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Banner slot created successfully',
    data: result,
  });
});

const updateSlot = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.updateSlotInDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Banner slot updated successfully',
    data: result,
  });
});

const deleteSlot = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.deleteSlotFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Banner slot deleted successfully',
    data: result,
  });
});

const getAllSlots = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.getAllSlotsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Banner slots retrieved successfully',
    data: result,
  });
});

const getSingleSlot = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.getSingleSlotFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Banner slot retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  VENDOR: BANNER BOOKING
// ══════════════════════════════════════════════

const bookBanner = catchAsync(async (req: Request, res: Response) => {
  let imageUrl = '';
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...rawData, image: imageUrl };
  const vendorId = (req as any).user.userId;

  const result = await BannerServices.bookBannerIntoDB(vendorId, payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Banner booked successfully. Awaiting admin approval.',
    data: result,
  });
});

const getMyBanners = catchAsync(async (req: Request, res: Response) => {
  const vendorId = (req as any).user.userId;
  const result = await BannerServices.getMyBannersFromDB(vendorId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My banners retrieved successfully',
    data: result,
  });
});

const deleteMyBanner = catchAsync(async (req: Request, res: Response) => {
  const vendorId = (req as any).user.userId;
  const result = await BannerServices.deleteMyBannerFromDB(
    vendorId,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Banner deleted successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  PUBLIC
// ══════════════════════════════════════════════

const getActiveBanners = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.getActiveBannersFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Active banners retrieved successfully',
    data: result,
  });
});

const getAvailableSlots = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.getAvailableSlotsFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Available slots retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  ADMIN: BANNER MANAGEMENT
// ══════════════════════════════════════════════

const adminGetAllBanners = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.adminGetAllBannersFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All banners retrieved successfully',
    data: result,
  });
});

const adminUpdateBannerStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.body;
  const result = await BannerServices.adminUpdateBannerStatusInDB(
    req.params.id,
    status,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Banner ${status} successfully`,
    data: result,
  });
});

const adminToggleBannerIsActive = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.adminToggleBannerIsActiveInDB(
    req.params.id,
  );
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Banner not found',
      data: null,
    });
    return;
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Banner ${result.isActive ? 'activated' : 'deactivated'} successfully`,
    data: result,
  });
});

const adminDeleteBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.adminDeleteBannerFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Banner deleted successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  TRACKING
// ══════════════════════════════════════════════

const trackImpression = catchAsync(async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const result = await BannerServices.trackImpressionInDB(req.params.id, clientIp);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.cooldown ? 'Impression already counted (cooldown)' : 'Impression tracked',
    data: result,
  });
});

const trackClick = catchAsync(async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  const result = await BannerServices.trackClickInDB(req.params.id, clientIp);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.cooldown ? 'Click already counted (cooldown)' : 'Click tracked',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  CRON
// ══════════════════════════════════════════════

const runExpiryCron = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerServices.runExpiryCron();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Expiry cron executed',
    data: result,
  });
});

const createAdminBanner = catchAsync(async (req: Request, res: Response) => {
  let imageUrl = '';
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...rawData, image: imageUrl || rawData.image };

  if (!payload.image) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Banner image is required');
  }

  const result = await BannerServices.createAdminBannerIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Admin banner created and published successfully',
    data: result,
  });
});

export const BannerControllers = {
  // Slot (Admin)
  createSlot,
  updateSlot,
  deleteSlot,
  getAllSlots,
  getSingleSlot,
  // Banner booking (Vendor)
  bookBanner,
  getMyBanners,
  deleteMyBanner,
  // Public
  getActiveBanners,
  getAvailableSlots,
  // Admin
  createAdminBanner,
  adminGetAllBanners,
  adminUpdateBannerStatus,
  adminToggleBannerIsActive,
  adminDeleteBanner,
  // Tracking
  trackImpression,
  trackClick,
  // Cron
  runExpiryCron,
};

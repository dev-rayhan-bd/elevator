import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PromotionServices } from './promotion.services';
import uploadImage from '../../middleware/upload';

// ══════════════════════════════════════════════
//  ADMIN: PROMOTION PLAN CRUD
// ══════════════════════════════════════════════

const createPromotionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.createPromotionPlanIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Promotion plan created successfully',
    data: result,
  });
});

const updatePromotionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.updatePromotionPlanInDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promotion plan updated successfully',
    data: result,
  });
});

const deletePromotionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.deletePromotionPlanFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promotion plan deleted successfully',
    data: result,
  });
});

const getAllPromotionPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.getAllPromotionPlansFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promotion plans retrieved successfully',
    data: result,
  });
});

const getSinglePromotionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.getSinglePromotionPlanFromDB(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promotion plan retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  VENDOR: PROMOTION PURCHASE & MANAGEMENT
// ══════════════════════════════════════════════

const purchasePromotion = catchAsync(async (req: Request, res: Response) => {
  const vendorId = (req as any).user.userId;
  const result = await PromotionServices.purchasePromotionIntoDB(
    vendorId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Promotion purchased successfully',
    data: result,
  });
});

// ── Purchase Verified Promotion (with documents) ──
const purchaseVerifiedPromotion = catchAsync(async (req: Request, res: Response) => {
  const vendorId = (req as any).user.userId;

  // Handle multipart: parse JSON from data field if present
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;

  // Upload files to Cloudinary if present
  const files = req.files as Express.Multer.File[] | undefined;
  const uploadedUrls: string[] = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const url = await uploadImage(req, file);
      uploadedUrls.push(url);
    }
  }

  // Merge uploaded URLs with any provided document URLs
  const documents = [...(rawData.documents || []), ...uploadedUrls];

  const result = await PromotionServices.purchaseVerifiedPromotionIntoDB(
    vendorId,
    { planId: rawData.planId, documents },
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Verified promotion purchased successfully. Awaiting admin review.',
    data: result,
  });
});

const getMyPromotions = catchAsync(async (req: Request, res: Response) => {
  const vendorId = (req as any).user.userId;
  const result = await PromotionServices.getMyPromotionsFromDB(
    vendorId,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My promotions retrieved successfully',
    data: result,
  });
});

const cancelMyPromotion = catchAsync(async (req: Request, res: Response) => {
  const vendorId = (req as any).user.userId;
  const result = await PromotionServices.cancelMyPromotionFromDB(
    vendorId,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promotion cancelled successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  PUBLIC
// ══════════════════════════════════════════════

const getActivePromotions = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.getActivePromotionsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Active promotions retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  ADMIN: PROMOTION MANAGEMENT
// ══════════════════════════════════════════════

const adminGetAllPromotions = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.adminGetAllPromotionsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All promotions retrieved successfully',
    data: result,
  });
});

const adminUpdatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { paymentStatus } = req.body;
  const result = await PromotionServices.adminUpdatePaymentStatusInDB(
    req.params.id,
    paymentStatus,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Payment status updated to ${paymentStatus}`,
    data: result,
  });
});

// ══════════════════════════════════════════════
//  ADMIN: TOGGLE VENDOR PURCHASED PROMOTION isActive
// ══════════════════════════════════════════════

const adminToggleVendorPromotionIsActive = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.adminToggleVendorPromotionIsActiveInDB(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Vendor promotion ${result.isActive ? 'activated' : 'deactivated'} successfully`,
    data: result,
  });
});

// ══════════════════════════════════════════════
//  ADMIN: TOGGLE PLAN isActive
// ══════════════════════════════════════════════

const adminTogglePromotionPlanIsActive = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.adminTogglePromotionPlanIsActiveInDB(
    req.params.id,
  );
  if (!result) {
    sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Promotion plan not found',
      data: null,
    });
    return;
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Promotion plan ${result.isActive ? 'activated' : 'deactivated'} successfully`,
    data: result,
  });
});

// ══════════════════════════════════════════════
//  CRON
// ══════════════════════════════════════════════

const runExpiryCron = catchAsync(async (req: Request, res: Response) => {
  const result = await PromotionServices.runExpiryCron();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promotion expiry cron executed',
    data: result,
  });
});

export const PromotionControllers = {
  // Plan (Admin)
  createPromotionPlan,
  updatePromotionPlan,
  deletePromotionPlan,
  getAllPromotionPlans,
  getSinglePromotionPlan,

  // Vendor
  purchasePromotion,
  purchaseVerifiedPromotion,
  getMyPromotions,
  cancelMyPromotion,

  // Public
  getActivePromotions,

  // Admin management
  adminGetAllPromotions,
  adminUpdatePaymentStatus,

  // Cron
  runExpiryCron,

  // Toggle
  adminTogglePromotionPlanIsActive,
  adminToggleVendorPromotionIsActive,
};

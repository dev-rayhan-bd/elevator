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
  let rawData = req.body;
  if (req.body.data) {
    try {
      rawData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } catch (e) {
      rawData = req.body;
    }
  }

  const payload: any = { ...req.body, ...rawData };
  const allDocUrls: string[] = [];

  // If initial documents passed in body
  if (payload.documents) {
    if (Array.isArray(payload.documents)) {
      payload.documents.forEach((d: any) => {
        if (typeof d === 'string' && d.trim()) allDocUrls.push(d.trim());
      });
    } else if (typeof payload.documents === 'string' && payload.documents.trim()) {
      allDocUrls.push(payload.documents.trim());
    }
  }

  // Upload files to Cloudinary if present
  const allFiles: Express.Multer.File[] = [];
  if (req.files) {
    if (Array.isArray(req.files)) {
      allFiles.push(...req.files);
    } else {
      allFiles.push(...Object.values(req.files).flat());
    }
  }
  if (req.file) {
    allFiles.push(req.file);
  }

  for (const file of allFiles) {
    const url = await uploadImage(req, file);
    allDocUrls.push(url);

    const fLower = (file.fieldname || '').toLowerCase();
    if (fLower === 'cnicfront' || fLower === 'cnic_front' || fLower.includes('front')) {
      payload.cnicFront = url;
    } else if (fLower === 'cnicback' || fLower === 'cnic_back' || fLower.includes('back')) {
      payload.cnicBack = url;
    } else if (fLower === 'ntn' || fLower.includes('ntn') || fLower.includes('tax')) {
      payload.ntn = url;
    } else if (
      fLower === 'incorporationcertificate' ||
      fLower === 'incorporation_certificate' ||
      fLower.includes('incorporation') ||
      fLower.includes('certificate') ||
      fLower.includes('license')
    ) {
      payload.incorporationCertificate = url;
    }
  }

  // Also include distinct fields if already passed as string URLs in payload
  ['cnicFront', 'cnicBack', 'ntn', 'incorporationCertificate'].forEach((f) => {
    if (typeof payload[f] === 'string' && payload[f].trim()) {
      allDocUrls.push(payload[f].trim());
    }
  });

  if (!payload.cnicFront && allDocUrls.length >= 1) payload.cnicFront = allDocUrls[0];
  if (!payload.cnicBack && allDocUrls.length >= 2) payload.cnicBack = allDocUrls[1];

  payload.documents = Array.from(new Set(allDocUrls));

  const result = await PromotionServices.purchaseVerifiedPromotionIntoDB(
    vendorId,
    { 
      planId: payload.planId, 
      documents: payload.documents,
      cnicFront: payload.cnicFront,
      cnicBack: payload.cnicBack,
      ntn: payload.ntn,
      incorporationCertificate: payload.incorporationCertificate,
      businessName: payload.businessName || rawData.businessName,
      fullAddress: payload.fullAddress || rawData.fullAddress,
      ownerName: payload.ownerName || rawData.ownerName,
      registeredPhone: payload.registeredPhone || rawData.registeredPhone,
      notes: payload.notes || rawData.notes,
    },
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Verified promotion request submitted successfully. Awaiting admin review.',
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

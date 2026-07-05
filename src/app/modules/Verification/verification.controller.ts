import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import uploadImage from '../../middleware/upload';
import { VerificationServices } from './verification.services';

// ══════════════════════════════════════════════
//  VENDOR: SUBMIT VERIFICATION REQUEST
// ══════════════════════════════════════════════

const submitVerification = catchAsync(async (req: Request, res: Response) => {
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

  const documents = [...(rawData.documents || []), ...uploadedUrls];
  if (documents.length === 0) {
    throw new Error('At least one document is required (upload or provide URL)');
  }

  const payload = { ...rawData, documents };

  const result = await VerificationServices.submitVerificationIntoDB(
    vendorId,
    payload,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Verification request submitted successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  VENDOR: GET MY VERIFICATION
// ══════════════════════════════════════════════

const getMyVerification = catchAsync(async (req: Request, res: Response) => {
  const vendorId = (req as any).user.userId;
  const result = await VerificationServices.getMyVerificationFromDB(vendorId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Verification request retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  ADMIN: GET ALL VERIFICATION REQUESTS
// ══════════════════════════════════════════════

const adminGetAllVerifications = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await VerificationServices.adminGetAllVerificationsFromDB(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Verification requests retrieved successfully',
      data: result,
    });
  },
);

// ══════════════════════════════════════════════
//  ADMIN: UPDATE VERIFICATION STATUS
// ══════════════════════════════════════════════

const adminUpdateVerificationStatus = catchAsync(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user.userId;
    const result =
      await VerificationServices.adminUpdateVerificationStatusInDB(
        req.params.id,
        adminId,
        req.body,
      );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Verification ${req.body.status} successfully`,
      data: result,
    });
  },
);

// ══════════════════════════════════════════════
//  ADMIN: GET SINGLE VERIFICATION
// ══════════════════════════════════════════════

const getSingleVerification = catchAsync(
  async (req: Request, res: Response) => {
    const result = await VerificationServices.getSingleVerificationFromDB(
      req.params.id,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Verification request retrieved successfully',
      data: result,
    });
  },
);

export const VerificationControllers = {
  submitVerification,
  getMyVerification,
  adminGetAllVerifications,
  adminUpdateVerificationStatus,
  getSingleVerification,
};

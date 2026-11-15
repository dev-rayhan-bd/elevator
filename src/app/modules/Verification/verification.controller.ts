import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import uploadImage from '../../middleware/upload';
import { VerificationServices } from './verification.services';

// ══════════════════════════════════════════════
//  VENDOR: SUBMIT VERIFICATION REQUEST
// ══════════════════════════════════════════════

const submitVerification = catchAsync(async (req: Request, res: Response) => {
  const vendorId = (req as any).user.userId;

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
  if (req.files) {
    const fileList: Express.Multer.File[] = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files).flat();

    for (const file of fileList) {
      const url = await uploadImage(req, file);
      allDocUrls.push(url);

      const field = file.fieldname;
      if (field === 'cnicFront' || field === 'cnic_front') {
        payload.cnicFront = url;
      } else if (field === 'cnicBack' || field === 'cnic_back') {
        payload.cnicBack = url;
      } else if (field === 'ntn') {
        payload.ntn = url;
      } else if (field === 'incorporationCertificate' || field === 'incorporation_certificate') {
        payload.incorporationCertificate = url;
      }
    }
  }

  // Also include distinct fields if already passed as string URLs in payload
  ['cnicFront', 'cnicBack', 'ntn', 'incorporationCertificate'].forEach((f) => {
    if (typeof payload[f] === 'string' && payload[f].trim()) {
      allDocUrls.push(payload[f].trim());
    }
  });

  // Persist all uploaded files (cnicFront, cnicBack, ntn, incorporationCertificate) and ALSO fill documents[] with those URLs
  payload.documents = Array.from(new Set(allDocUrls));

  // Ensure at least some document or specific field was provided
  const hasSpecificDocs =
    payload.cnicFront ||
    payload.cnicBack ||
    payload.ntn ||
    payload.incorporationCertificate ||
    payload.documents.length > 0;

  if (!hasSpecificDocs) {
    throw new AppError(httpStatus.BAD_REQUEST, 'At least one verification document is required');
  }

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

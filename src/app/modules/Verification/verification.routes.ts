import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { upload } from '../../middleware/multer';
import { USER_ROLE } from '../Auth/auth.constant';
import { VerificationControllers } from './verification.controller';
import { VerificationValidations } from './verification.validation';

const router = express.Router();
const uploadDocs = upload.array('documents', 10) as unknown as RequestHandler;

// ══════════════════════════════════════════════
//  VENDOR ROUTES
// ══════════════════════════════════════════════

// Submit verification request (multipart supported)
router.post(
  '/',
  auth(USER_ROLE.vendor),
  uploadDocs,
  validateRequest(VerificationValidations.submitVerificationSchema),
  VerificationControllers.submitVerification,
);

// Get my verification status
router.get(
  '/my-verification',
  auth(USER_ROLE.vendor),
  VerificationControllers.getMyVerification,
);

// ══════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════

// Get all verification requests
router.get(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  VerificationControllers.adminGetAllVerifications,
);

// Get single verification request
router.get(
  '/admin/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  VerificationControllers.getSingleVerification,
);

// Approve / reject verification
router.patch(
  '/admin/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(VerificationValidations.updateVerificationStatusSchema),
  VerificationControllers.adminUpdateVerificationStatus,
);

export const VerificationRoutes = router;

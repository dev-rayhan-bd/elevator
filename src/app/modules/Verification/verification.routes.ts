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

// ══════════════════════════════════════════════
//  VENDOR ROUTES
// ══════════════════════════════════════════════

// Submit verification request (multipart supported)
router.post(
  '/',
  /*
    #swagger.tags = ['Verification']
    #swagger.summary = 'Submit verification request'
    #swagger.description = 'Submit vendor business verification details and documents.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $businessType: 'llc',
        $taxId: '123456789',
        $idDocumentType: 'nid'
      }
    }
  */
  auth(USER_ROLE.vendor),
  uploadDocs,
  validateRequest(VerificationValidations.submitVerificationSchema),
  VerificationControllers.submitVerification,
);

// Get my verification status
router.get(
  '/my-verification',
  /*
    #swagger.tags = ['Verification']
    #swagger.summary = 'Get my verification status'
  */
  auth(USER_ROLE.vendor),
  VerificationControllers.getMyVerification,
);

// ══════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════

// Get all verification requests
router.get(
  '/admin',
  /*
    #swagger.tags = ['Verification']
    #swagger.summary = 'Get all verification requests (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  VerificationControllers.adminGetAllVerifications,
);

// Get single verification request
router.get(
  '/admin/:id',
  /*
    #swagger.tags = ['Verification']
    #swagger.summary = 'Get single verification request (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  VerificationControllers.getSingleVerification,
);

// Approve / reject verification
router.patch(
  '/admin/:id/status',
  /*
    #swagger.tags = ['Verification']
    #swagger.summary = 'Update verification status (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $status: 'approved',
        adminNote: 'Documents verified successfully'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(VerificationValidations.updateVerificationStatusSchema),
  VerificationControllers.adminUpdateVerificationStatus,
);

export const VerificationRoutes = router;

import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { upload } from '../../middleware/multer';
import { DisputeControllers } from './dispute.controller';
import { DisputeValidations } from './dispute.validation';
import { USER_ROLE } from '../Auth/auth.constant';

const router = express.Router();

// ──────────────────────────────────────────────────────────────
//  User / Vendor Routes
// ──────────────────────────────────────────────────────────────

// Create dispute (with optional evidence upload)
router.post(
  '/',
  auth(USER_ROLE.user, USER_ROLE.vendor),
  upload.array('evidence', 5) as any,
  DisputeControllers.createDispute,
);

// Get disputes where I am disputer or respondent
router.get(
  '/my-disputes',
  auth(USER_ROLE.user, USER_ROLE.vendor),
  DisputeControllers.getMyDisputes,
);

// ──────────────────────────────────────────────────────────────
//  Admin / SuperAdmin Routes
// ──────────────────────────────────────────────────────────────

// Get all disputes (with QueryBuilder filters)
router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.getAllDisputes,
);

// Get single dispute details (includes adminNotes)
router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.getDisputeDetails,
);

// Update dispute status / priority
router.patch(
  '/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(DisputeValidations.updateDisputeStatusValidationSchema),
  DisputeControllers.updateDisputeStatus,
);

// Add internal admin note
router.post(
  '/:id/notes',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(DisputeValidations.addAdminNoteValidationSchema),
  DisputeControllers.addAdminNote,
);

// Export dispute report
router.get(
  '/:id/export',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.exportDisputeReport,
);

export const DisputeRoutes = router;

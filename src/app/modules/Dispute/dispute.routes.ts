import express from 'express';
import auth from '../../middleware/auth';
import { upload } from '../../middleware/multer';
import { DisputeControllers } from './dispute.controller';
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

// Get disputes submitted by me
router.get(
  '/my-disputes',
  auth(USER_ROLE.user, USER_ROLE.vendor),
  DisputeControllers.getMyDisputes,
);

// ──────────────────────────────────────────────────────────────
//  Admin / SuperAdmin Routes
// ──────────────────────────────────────────────────────────────

// Summary statistics for dashboard cards (Total, Submitted, Under Review, Closed)
router.get(
  '/summary-stats',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.getDisputeSummaryStats,
);

// Get all disputes (with QueryBuilder search & status filter)
router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.getAllDisputes,
);

// ──────────────────────────────────────────────────────────────
//  Shared (Admin & Submitter) Detail & Response Routes
// ──────────────────────────────────────────────────────────────

// Get single dispute details (includes adminNotes for admin only)
router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.user, USER_ROLE.vendor),
  DisputeControllers.getDisputeDetails,
);

// Post response / reply (Admin responds or requests info, submitter replies)
router.post(
  '/:id/responses',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.user, USER_ROLE.vendor),
  upload.array('attachments', 5) as any,
  DisputeControllers.addDisputeResponse,
);

// ──────────────────────────────────────────────────────────────
//  Admin Only Action Routes
// ──────────────────────────────────────────────────────────────

// Update dispute status (Submitted / Under Review / Closed)
router.patch(
  '/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.updateDisputeStatus,
);

// Add internal admin note (Private to WePlan team)
router.post(
  '/:id/notes',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.addAdminNote,
);

// Export dispute report PDF
router.get(
  '/:id/export',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.exportDisputeReport,
);

export const DisputeRoutes = router;

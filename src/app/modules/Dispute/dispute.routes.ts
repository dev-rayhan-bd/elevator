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

// ──────────────────────────────────────────────────────────────
//  User / Vendor Routes
// ──────────────────────────────────────────────────────────────

// Create dispute (with optional evidence upload)
router.post(
  '/',
  /*
    #swagger.tags = ['Dispute']
    #swagger.summary = 'Create new dispute ticket'
    #swagger.description = 'Submit a dispute ticket against a quote/service with optional evidence attachments.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $respondentId: '60d5ecb8b5c9c123456789ab',
        quoteId: '60d5ecb8b5c9c123456789ac',
        $reason: 'Service quality did not match agreed quote deliverables',
        $description: 'Detailed explanation of the dispute issue...'
      }
    }
  */
  auth(USER_ROLE.user, USER_ROLE.vendor),
  upload.array('evidence', 5) as any,
  DisputeControllers.createDispute,
);

// Get disputes where I am disputer or respondent
router.get(
  '/my-disputes',
  /*
    #swagger.tags = ['Dispute']
    #swagger.summary = 'Get my disputes'
  */
  auth(USER_ROLE.user, USER_ROLE.vendor),
  DisputeControllers.getMyDisputes,
);

// ──────────────────────────────────────────────────────────────
//  Admin / SuperAdmin Routes
// ──────────────────────────────────────────────────────────────

// Get all disputes (with QueryBuilder filters)
router.get(
  '/',
  /*
    #swagger.tags = ['Dispute']
    #swagger.summary = 'Get all disputes (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.getAllDisputes,
);

// Get single dispute details (includes adminNotes)
router.get(
  '/:id',
  /*
    #swagger.tags = ['Dispute']
    #swagger.summary = 'Get single dispute details (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.getDisputeDetails,
);

// Update dispute status / priority
router.patch(
  '/:id/status',
  /*
    #swagger.tags = ['Dispute']
    #swagger.summary = 'Update dispute status / priority (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $status: 'resolved',
        priority: 'high'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(DisputeValidations.updateDisputeStatusValidationSchema),
  DisputeControllers.updateDisputeStatus,
);

// Add internal admin note
router.post(
  '/:id/notes',
  /*
    #swagger.tags = ['Dispute']
    #swagger.summary = 'Add admin internal note to dispute (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $note: 'Investigated invoice details and contacted both parties.'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(DisputeValidations.addAdminNoteValidationSchema),
  DisputeControllers.addAdminNote,
);

// Export dispute report
router.get(
  '/:id/export',
  /*
    #swagger.tags = ['Dispute']
    #swagger.summary = 'Export dispute report PDF/JSON (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DisputeControllers.exportDisputeReport,
);

export const DisputeRoutes = router;

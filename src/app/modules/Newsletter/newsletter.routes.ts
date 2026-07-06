import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { NewsletterControllers } from './newsletter.controller';
import { NewsletterValidations } from './newsletter.validation';

const router = express.Router();

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

// Subscribe to newsletter
router.post(
  '/subscribe',
  validateRequest(NewsletterValidations.subscribeSchema),
  NewsletterControllers.subscribe,
);

// Unsubscribe from newsletter
router.post(
  '/unsubscribe',
  validateRequest(
    NewsletterValidations.subscribeSchema.pick({ email: true }),
  ),
  NewsletterControllers.unsubscribe,
);

// ══════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════

// Get subscriber stats (dashboard overview)
router.get(
  '/admin/stats',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  NewsletterControllers.getSubscriberStats,
);

// Get all subscribers (with search, filter, paginate)
router.get(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  NewsletterControllers.getAllSubscribers,
);

// Get single subscriber
router.get(
  '/admin/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  NewsletterControllers.getSingleSubscriber,
);

// Add subscriber manually
router.post(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(NewsletterValidations.adminAddSubscriberSchema),
  NewsletterControllers.addSubscriber,
);

// Bulk import subscribers
router.post(
  '/admin/bulk-import',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(NewsletterValidations.bulkImportSchema),
  NewsletterControllers.bulkImport,
);

// Update subscriber details
router.patch(
  '/admin/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(NewsletterValidations.updateSubscriberSchema),
  NewsletterControllers.updateSubscriber,
);

// Update subscriber status (active/unsubscribed/blocked)
router.patch(
  '/admin/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(NewsletterValidations.updateSubscriberStatusSchema),
  NewsletterControllers.updateSubscriberStatus,
);

// Soft-delete subscriber
router.delete(
  '/admin/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  NewsletterControllers.deleteSubscriber,
);

export const NewsletterRoutes = router;

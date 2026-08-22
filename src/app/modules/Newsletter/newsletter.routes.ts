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

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

// Subscribe to newsletter
router.post(
  '/subscribe',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Subscribe to email newsletter'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $email: 'subscriber@example.com',
        name: 'John'
      }
    }
  */
  validateRequest(NewsletterValidations.subscribeSchema),
  NewsletterControllers.subscribe,
);

// Unsubscribe from newsletter
router.post(
  '/unsubscribe',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Unsubscribe from newsletter'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $email: 'subscriber@example.com'
      }
    }
  */
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
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Get newsletter subscriber analytics (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  NewsletterControllers.getSubscriberStats,
);

// Get all subscribers (with search, filter, paginate)
router.get(
  '/admin',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Get all newsletter subscribers (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  NewsletterControllers.getAllSubscribers,
);

// Get single subscriber
router.get(
  '/admin/:id',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Get single subscriber (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  NewsletterControllers.getSingleSubscriber,
);

// Add subscriber manually
router.post(
  '/admin',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Add subscriber manually (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $email: 'newsubscriber@example.com',
        name: 'Jane Doe'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(NewsletterValidations.adminAddSubscriberSchema),
  NewsletterControllers.addSubscriber,
);

// Bulk import subscribers
router.post(
  '/admin/bulk-import',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Bulk import subscribers (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $subscribers: [
          { email: 'sub1@example.com', name: 'User 1' },
          { email: 'sub2@example.com', name: 'User 2' }
        ]
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(NewsletterValidations.bulkImportSchema),
  NewsletterControllers.bulkImport,
);

// Update subscriber details
router.patch(
  '/admin/:id',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Update subscriber details (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(NewsletterValidations.updateSubscriberSchema),
  NewsletterControllers.updateSubscriber,
);

// Update subscriber status (active/unsubscribed/blocked)
router.patch(
  '/admin/:id/status',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Update subscriber status (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $status: 'unsubscribed'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(NewsletterValidations.updateSubscriberStatusSchema),
  NewsletterControllers.updateSubscriberStatus,
);

// Soft-delete subscriber
router.delete(
  '/admin/:id',
  /*
    #swagger.tags = ['Newsletter']
    #swagger.summary = 'Delete subscriber (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  NewsletterControllers.deleteSubscriber,
);

export const NewsletterRoutes = router;

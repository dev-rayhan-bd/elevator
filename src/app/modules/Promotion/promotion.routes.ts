import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { upload } from '../../middleware/multer';
import { USER_ROLE } from '../Auth/auth.constant';
import { PromotionControllers } from './promotion.controller';
import { PromotionValidations } from './promotion.validation';

const router = express.Router();
const uploadDocs = upload.array('documents', 10) as unknown as RequestHandler;

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

// Get active promoted vendors/services (for frontend display)
router.get('/active',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Get active promoted listings'
  */
  PromotionControllers.getActivePromotions
);

// Get all promotion plans with pricing (for vendor purchase page)
router.get('/plans',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Get all promotion plans and pricing'
  */
  PromotionControllers.getAllPromotionPlans
);

// ══════════════════════════════════════════════
//  VENDOR ROUTES
// ══════════════════════════════════════════════

// Purchase a promotion (sponsored, featured, inspiration — NOT verified)
router.post(
  '/purchase',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Purchase promotion plan (Vendor)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $planId: '60d5ecb8b5c9c123456789ab',
        serviceId: '60d5ecb8b5c9c123456789ac'
      }
    }
  */
  auth(USER_ROLE.vendor),
  validateRequest(PromotionValidations.purchasePromotionSchema),
  PromotionControllers.purchasePromotion,
);

// Purchase verified promotion (requires document upload)
router.post(
  '/purchase-verified',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Purchase verified badge promotion (Vendor)'
  */
  auth(USER_ROLE.vendor),
  uploadDocs,
  PromotionControllers.purchaseVerifiedPromotion,
);

// Get my promotions
router.get(
  '/my-promotions',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Get vendor purchased promotions'
  */
  auth(USER_ROLE.vendor),
  PromotionControllers.getMyPromotions,
);

// Cancel my promotion
router.delete(
  '/my-promotions/:id',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Cancel vendor promotion'
  */
  auth(USER_ROLE.vendor),
  PromotionControllers.cancelMyPromotion,
);

// ══════════════════════════════════════════════
//  ADMIN: PROMOTION PLAN MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/plans/admin',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Get promotion plans (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.getAllPromotionPlans,
);

router.get(
  '/plans/admin/:id',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Get single promotion plan (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.getSinglePromotionPlan,
);

router.post(
  '/plans',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Create new promotion plan (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Featured Vendor Monthly',
        $type: 'featured',
        $price: 99,
        $durationDays: 30
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(PromotionValidations.createPromotionPlanSchema),
  PromotionControllers.createPromotionPlan,
);

router.patch(
  '/plans/:id',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Update promotion plan (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(PromotionValidations.updatePromotionPlanSchema),
  PromotionControllers.updatePromotionPlan,
);

// Toggle plan isActive (on/off)
router.patch(
  '/plans/:id/toggle-active',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Toggle promotion plan active status'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.adminTogglePromotionPlanIsActive,
);

router.delete(
  '/plans/:id',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Delete promotion plan'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.deletePromotionPlan,
);

// ══════════════════════════════════════════════
//  ADMIN: PROMOTION MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/admin',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Get vendor purchased promotions list (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.adminGetAllPromotions,
);

router.patch(
  '/admin/:id/payment-status',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Update promotion payment status (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $paymentStatus: 'paid'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.adminUpdatePaymentStatus,
);

// Toggle vendor purchased promotion isActive (on/off)
router.patch(
  '/admin/:id/toggle-active',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Toggle vendor promotion status (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.adminToggleVendorPromotionIsActive,
);

// ══════════════════════════════════════════════
//  CRON (admin triggered)
// ══════════════════════════════════════════════

router.post(
  '/expire-cron',
  /*
    #swagger.tags = ['Promotion']
    #swagger.summary = 'Run promotion expiry cron manually'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.runExpiryCron,
);

export const PromotionRoutes = router;

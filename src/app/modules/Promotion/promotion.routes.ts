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

// Get active promoted vendors/services (for frontend display)
router.get('/active', PromotionControllers.getActivePromotions);

// Get all promotion plans with pricing (for vendor purchase page)
router.get('/plans', PromotionControllers.getAllPromotionPlans);

// ══════════════════════════════════════════════
//  VENDOR ROUTES
// ══════════════════════════════════════════════

// Purchase a promotion (sponsored, featured, inspiration — NOT verified)
router.post(
  '/purchase',
  auth(USER_ROLE.vendor),
  validateRequest(PromotionValidations.purchasePromotionSchema),
  PromotionControllers.purchasePromotion,
);

// Purchase verified promotion (requires document upload)
router.post(
  '/purchase-verified',
  auth(USER_ROLE.vendor),
  uploadDocs,
  PromotionControllers.purchaseVerifiedPromotion,
);

// Get my promotions
router.get(
  '/my-promotions',
  auth(USER_ROLE.vendor),
  PromotionControllers.getMyPromotions,
);

// Cancel my promotion
router.delete(
  '/my-promotions/:id',
  auth(USER_ROLE.vendor),
  PromotionControllers.cancelMyPromotion,
);

// ══════════════════════════════════════════════
//  ADMIN: PROMOTION PLAN MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/plans/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.getAllPromotionPlans,
);

router.get(
  '/plans/admin/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.getSinglePromotionPlan,
);

router.post(
  '/plans',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(PromotionValidations.createPromotionPlanSchema),
  PromotionControllers.createPromotionPlan,
);

router.patch(
  '/plans/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(PromotionValidations.updatePromotionPlanSchema),
  PromotionControllers.updatePromotionPlan,
);

// Toggle plan isActive (on/off)
router.patch(
  '/plans/:id/toggle-active',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.adminTogglePromotionPlanIsActive,
);

router.delete(
  '/plans/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.deletePromotionPlan,
);

// ══════════════════════════════════════════════
//  ADMIN: PROMOTION MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.adminGetAllPromotions,
);

router.patch(
  '/admin/:id/payment-status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.adminUpdatePaymentStatus,
);

// Toggle vendor purchased promotion isActive (on/off)
router.patch(
  '/admin/:id/toggle-active',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.adminToggleVendorPromotionIsActive,
);

// ══════════════════════════════════════════════
//  CRON (admin triggered)
// ══════════════════════════════════════════════

router.post(
  '/expire-cron',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  PromotionControllers.runExpiryCron,
);

export const PromotionRoutes = router;

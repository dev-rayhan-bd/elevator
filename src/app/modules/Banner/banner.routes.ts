import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { upload } from '../../middleware/multer';
import { USER_ROLE } from '../Auth/auth.constant';
import { BannerControllers } from './banner.controller';
import { BannerValidations } from './banner.validation';

const router = express.Router();
const uploadImage = upload.single('image') as unknown as RequestHandler;

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

// Get all active banners (for frontend display)
router.get('/active', BannerControllers.getActiveBanners);

// Get available slot types with pricing (for vendor booking page)
router.get('/available-slots', BannerControllers.getAvailableSlots);

// Track impression (called when banner is viewed)
router.patch('/:id/impression', BannerControllers.trackImpression);

// Track click (called when banner is clicked)
router.patch('/:id/click', BannerControllers.trackClick);

// ══════════════════════════════════════════════
//  VENDOR ROUTES
// ══════════════════════════════════════════════

// Book a banner (vendor)
router.post(
  '/book',
  auth(USER_ROLE.vendor),
  uploadImage,
  BannerControllers.bookBanner,
);

// Get my banners (vendor)
router.get(
  '/my-banners',
  auth(USER_ROLE.vendor),
  BannerControllers.getMyBanners,
);

// Delete my banner (vendor)
router.delete(
  '/my-banners/:id',
  auth(USER_ROLE.vendor),
  BannerControllers.deleteMyBanner,
);

// ══════════════════════════════════════════════
//  ADMIN: SLOT MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/slots',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.vendor),
  BannerControllers.getAllSlots,
);

router.get(
  '/slots/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.getSingleSlot,
);

router.post(
  '/slots',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BannerValidations.createSlotSchema),
  BannerControllers.createSlot,
);

router.patch(
  '/slots/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BannerValidations.updateSlotSchema),
  BannerControllers.updateSlot,
);

router.delete(
  '/slots/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.deleteSlot,
);

// ══════════════════════════════════════════════
//  ADMIN: BANNER MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.adminGetAllBanners,
);

router.patch(
  '/admin/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BannerValidations.updateBannerStatusSchema),
  BannerControllers.adminUpdateBannerStatus,
);

// Toggle banner isActive (on/off)
router.patch(
  '/admin/:id/toggle-active',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.adminToggleBannerIsActive,
);

// ══════════════════════════════════════════════
//  CRON (admin triggered)
// ══════════════════════════════════════════════

router.post(
  '/expire-cron',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.runExpiryCron,
);

export const BannerRoutes = router;

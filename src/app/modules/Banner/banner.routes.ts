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

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

// Get all active banners (for frontend display)
router.get('/active',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Get active promotional banners'
  */
  BannerControllers.getActiveBanners
);

// Get available slot types with pricing (for vendor booking page)
router.get('/available-slots',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Get available banner slots and pricing'
  */
  BannerControllers.getAvailableSlots
);

// Track impression (called when banner is viewed)
router.patch('/:id/impression',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Track banner impression'
  */
  BannerControllers.trackImpression
);

// Track click (called when banner is clicked)
router.patch('/:id/click',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Track banner click'
  */
  BannerControllers.trackClick
);

// ══════════════════════════════════════════════
//  VENDOR ROUTES
// ══════════════════════════════════════════════

// Book a banner (vendor)
router.post(
  '/book',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Book a banner slot (Vendor)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $slotId: '60d5ecb8b5c9c123456789ab',
        $startDate: '2026-09-01',
        $endDate: '2026-09-30',
        redirectUrl: 'https://example.com'
      }
    }
  */
  auth(USER_ROLE.vendor),
  uploadImage,
  BannerControllers.bookBanner,
);

// Get my banners (vendor)
router.get(
  '/my-banners',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Get vendor booked banners'
  */
  auth(USER_ROLE.vendor),
  BannerControllers.getMyBanners,
);

// Delete my banner (vendor)
router.delete(
  '/my-banners/:id',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Delete vendor banner'
  */
  auth(USER_ROLE.vendor),
  BannerControllers.deleteMyBanner,
);

// ══════════════════════════════════════════════
//  ADMIN: SLOT MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/slots',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Get all banner slots'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.vendor),
  BannerControllers.getAllSlots,
);

router.get(
  '/slots/:id',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Get single banner slot details'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.getSingleSlot,
);

router.post(
  '/slots',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Create new banner slot (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Homepage Hero Top',
        $price: 50,
        $durationDays: 30
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BannerValidations.createSlotSchema),
  BannerControllers.createSlot,
);

router.patch(
  '/slots/:id',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Update banner slot (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BannerValidations.updateSlotSchema),
  BannerControllers.updateSlot,
);

router.delete(
  '/slots/:id',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Delete banner slot (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.deleteSlot,
);

// ══════════════════════════════════════════════
//  ADMIN: BANNER MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/admin',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Get all banners (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.adminGetAllBanners,
);

router.patch(
  '/admin/:id/status',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Approve or reject banner booking (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $status: 'approved'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BannerValidations.updateBannerStatusSchema),
  BannerControllers.adminUpdateBannerStatus,
);

// Toggle banner isActive (on/off)
router.patch(
  '/admin/:id/toggle-active',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Toggle banner active status (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.adminToggleBannerIsActive,
);

// Delete banner (Admin - Soft Delete)
router.delete(
  '/admin/:id',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Soft delete banner (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.adminDeleteBanner,
);

// ══════════════════════════════════════════════
//  CRON (admin triggered)
// ══════════════════════════════════════════════

router.post(
  '/expire-cron',
  /*
    #swagger.tags = ['Banner']
    #swagger.summary = 'Run banner expiry cron job manually'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BannerControllers.runExpiryCron,
);

export const BannerRoutes = router;

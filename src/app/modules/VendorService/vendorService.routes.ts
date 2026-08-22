import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import optionalAuth from '../../middleware/optionalAuth';
import { USER_ROLE } from '../Auth/auth.constant';
import { VendorServiceControllers } from './vendorService.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();

const uploadImages = upload.array('images', 10) as unknown as RequestHandler;

// ── Public Routes (optionalAuth = logged-in user isFav field) ──
router.get('/public',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get public vendor services list'
  */
  optionalAuth,
  VendorServiceControllers.getPublicVendorServices
);
router.get('/public/all',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get all published services'
  */
  VendorServiceControllers.getAllPublishedServices
);
router.get('/public/recent-vendors',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get recently registered vendors'
  */
  VendorServiceControllers.getRecentVendors
);
router.get('/public/featured-vendors',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get featured vendor services'
  */
  optionalAuth,
  VendorServiceControllers.getFeaturedVendorServices
);
router.get('/public/:id/similar',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get similar vendor services'
  */
  VendorServiceControllers.getSimilarServices
);
router.get('/public/venues/karachi',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get venues in Karachi'
  */
  optionalAuth,
  VendorServiceControllers.getKarachiVenues
);
router.get('/public/:id',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get single vendor service details'
  */
  optionalAuth,
  VendorServiceControllers.getSingleVendorService
);
router.get('/public/vendor/:vendorId',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get active services by vendor ID'
  */
  optionalAuth,
  VendorServiceControllers.getActiveServicesByVendor
);

// ── Vendor Routes ──
router.get(
  '/my-services',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get vendor published services'
  */
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getMyServices,
);

router.get(
  '/my-services/list',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get vendor services list'
  */
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getMyServicesList,
);

router.post(
  '/',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Create vendor service'
    #swagger.description = 'Create a new service offering for the vendor.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $title: 'Royal Wedding Decoration',
        $categoryId: '60d5ecb8b5c9c123456789ab',
        $subcategoryId: '60d5ecb8b5c9c123456789ac',
        $description: 'Luxury wedding stage setup with floral arch',
        $startingPrice: 1500,
        serviceAreaId: '60d5ecb8b5c9c123456789ad'
      }
    }
  */
  auth(USER_ROLE.vendor),
  uploadImages,
  VendorServiceControllers.createVendorService,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Update vendor service'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        title: 'Updated Service Title',
        startingPrice: 1800
      }
    }
  */
  auth(USER_ROLE.vendor),
  uploadImages,
  VendorServiceControllers.updateVendorService,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Delete vendor service'
  */
  auth(USER_ROLE.vendor),
  VendorServiceControllers.deleteVendorService,
);

// ── Draft Routes (Vendor) ──
router.get(
  '/my-drafts',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get vendor draft services'
  */
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getMyDrafts,
);

router.post(
  '/draft',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Save service draft'
  */
  auth(USER_ROLE.vendor),
  uploadImages,
  VendorServiceControllers.saveDraft,
);

router.patch(
  '/draft/:id/publish',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Publish service draft'
  */
  auth(USER_ROLE.vendor),
  uploadImages,
  VendorServiceControllers.publishDraft,
);

router.delete(
  '/draft/:id',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Delete draft service'
  */
  auth(USER_ROLE.vendor),
  VendorServiceControllers.deleteDraft,
);

// ── Image Management Route (Vendor) ──
router.patch(
  '/:id/remove-images',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Delete images from vendor service'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $imageUrls: ['https://res.cloudinary.com/image1.jpg']
      }
    }
  */
  auth(USER_ROLE.vendor),
  VendorServiceControllers.deleteServiceImages,
);

// ── Favourite Routes (any authenticated user) ──
router.post(
  '/fav/:serviceId',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Toggle favourite vendor service'
  */
  auth(USER_ROLE.user, USER_ROLE.vendor),
  VendorServiceControllers.toggleFavService,
);

router.get(
  '/my-favs',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get my favourite services'
  */
  auth(USER_ROLE.user, USER_ROLE.vendor),
  VendorServiceControllers.getFavServices,
);

// ── Lead Tracking: WhatsApp / Call Click (optional auth) ──
router.post(
  '/track-contact',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Track vendor contact click (call/whatsapp)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $vendorId: '60d5ecb8b5c9c123456789ab',
        $serviceId: '60d5ecb8b5c9c123456789ac',
        $contactType: 'whatsapp'
      }
    }
  */
  optionalAuth,
  VendorServiceControllers.trackContactClick,
);

// ── Lead Stats: Vendor sees own click counts (vendor auth) ──
router.get(
  '/lead-stats',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get lead contact statistics for vendor'
  */
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getLeadStats,
);

// ── View Tracking: Record profile / service views (optional auth) ──
router.post(
  '/track-view',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Track vendor service view'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $serviceId: '60d5ecb8b5c9c123456789ac'
      }
    }
  */
  optionalAuth,
  VendorServiceControllers.trackServiceView,
);

// ── View Stats: Vendor profile view analytics ──
router.get(
  '/view-stats',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get view analytics for vendor'
  */
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getViewStats,
);

// ── Admin Routes ──
router.get(
  '/admin/all',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Get all vendor services (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  VendorServiceControllers.getAllVendorServices,
);

router.patch(
  '/admin/:id/status',
  /*
    #swagger.tags = ['VendorService']
    #swagger.summary = 'Toggle vendor service active/inactive status (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $status: 'active'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  VendorServiceControllers.adminToggleServiceStatus,
);

export const VendorServiceRoutes = router;

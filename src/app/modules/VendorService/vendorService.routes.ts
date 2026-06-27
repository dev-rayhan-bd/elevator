import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { VendorServiceControllers } from './vendorService.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();

const uploadImages = upload.array('images', 10) as unknown as RequestHandler;

// ── Public Routes ──
router.get('/public', VendorServiceControllers.getPublicVendorServices);
router.get('/public/all', VendorServiceControllers.getAllPublishedServices);
router.get('/public/:id', VendorServiceControllers.getSingleVendorService);

// ── Vendor Routes ──
router.get(
  '/my-services',
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getMyServices,
);

router.get(
  '/my-services/list',
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getMyServicesList,
);

router.post(
  '/',
  auth(USER_ROLE.vendor),
  uploadImages,
  VendorServiceControllers.createVendorService,
);

router.patch(
  '/:id',
  auth(USER_ROLE.vendor),
  uploadImages,
  VendorServiceControllers.updateVendorService,
);

router.delete(
  '/:id',
  auth(USER_ROLE.vendor),
  VendorServiceControllers.deleteVendorService,
);

// ── Draft Routes (Vendor) ──
router.get(
  '/my-drafts',
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getMyDrafts,
);

router.post(
  '/draft',
  auth(USER_ROLE.vendor),
  uploadImages,
  VendorServiceControllers.saveDraft,
);

router.patch(
  '/draft/:id/publish',
  auth(USER_ROLE.vendor),
  uploadImages,
  VendorServiceControllers.publishDraft,
);

router.delete(
  '/draft/:id',
  auth(USER_ROLE.vendor),
  VendorServiceControllers.deleteDraft,
);

// ── Image Management Route (Vendor) ──
router.patch(
  '/:id/remove-images',
  auth(USER_ROLE.vendor),
  VendorServiceControllers.deleteServiceImages,
);

// ── Admin Routes ──
router.get(
  '/admin/all',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  VendorServiceControllers.getAllVendorServices,
);

router.patch(
  '/admin/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  VendorServiceControllers.adminToggleServiceStatus,
);

export const VendorServiceRoutes = router;

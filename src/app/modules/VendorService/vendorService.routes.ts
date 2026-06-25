import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { VendorServiceControllers } from './vendorService.controller';
import { VendorServiceValidations } from './vendorService.validation';

const router = express.Router();

// ── Public Routes ──
router.get('/public', VendorServiceControllers.getPublicVendorServices);
router.get('/public/:id', VendorServiceControllers.getSingleVendorService);

// ── Vendor Routes ──
router.get(
  '/my-services',
  auth(USER_ROLE.vendor),
  VendorServiceControllers.getMyServices,
);

router.post(
  '/',
  auth(USER_ROLE.vendor),
  validateRequest(VendorServiceValidations.createVendorServiceSchema),
  VendorServiceControllers.createVendorService,
);

router.patch(
  '/:id',
  auth(USER_ROLE.vendor),
  validateRequest(VendorServiceValidations.updateVendorServiceSchema),
  VendorServiceControllers.updateVendorService,
);

router.delete(
  '/:id',
  auth(USER_ROLE.vendor),
  VendorServiceControllers.deleteVendorService,
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

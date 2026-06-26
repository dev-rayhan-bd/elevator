import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { ServicePackageControllers } from './package.controller';
import { ServicePackageValidations } from './package.validation';

const router = express.Router();

// ── Public Routes ──
router.get(
  '/public/:vendorId',
  ServicePackageControllers.getPublicVendorPackages,
);

// ── Vendor Routes (auth required) ──
router.get(
  '/my-packages',
  auth(USER_ROLE.vendor),
  ServicePackageControllers.getMyPackages,
);

router.post(
  '/',
  auth(USER_ROLE.vendor),
  validateRequest(ServicePackageValidations.createServicePackageSchema),
  ServicePackageControllers.createPackage,
);

router.patch(
  '/:id',
  auth(USER_ROLE.vendor),
  validateRequest(ServicePackageValidations.updateServicePackageSchema),
  ServicePackageControllers.updatePackage,
);

router.delete(
  '/:id',
  auth(USER_ROLE.vendor),
  ServicePackageControllers.deletePackage,
);

export const ServicePackageRoutes = router;

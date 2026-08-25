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
  /*
    #swagger.tags = ['Service-package']
    #swagger.summary = 'Get public packages by vendor ID'
    #swagger.description = 'Fetch all active service packages belonging to a specific vendor.'
    #swagger.responses[200] = {
      description: 'Vendor packages fetched successfully',
      schema: {
        success: true,
        statusCode: 200,
        message: 'Vendor packages fetched successfully',
        data: []
      }
    }
  */
  ServicePackageControllers.getPublicVendorPackages,
);

// ── Vendor Routes (auth required) ──
router.get(
  '/my-packages',
  /*
    #swagger.tags = ['Service-package']
    #swagger.summary = 'Get logged-in vendor packages'
    #swagger.description = 'Fetch all packages and package stats belonging to the authenticated vendor.'
    #swagger.responses[200] = {
      description: 'Vendor packages and stats fetched successfully'
    }
  */
  auth(USER_ROLE.vendor),
  ServicePackageControllers.getMyPackages,
);

router.post(
  '/',
  /*
    #swagger.tags = ['Service-package']
    #swagger.summary = 'Create new service package'
    #swagger.description = 'Create a new service package for the authenticated vendor.'
    #swagger.responses[201] = {
      description: 'Service package created successfully'
    }
  */
  auth(USER_ROLE.vendor),
  validateRequest(ServicePackageValidations.createServicePackageSchema),
  ServicePackageControllers.createPackage,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['Service-package']
    #swagger.summary = 'Update existing service package'
    #swagger.description = 'Update details of a service package by package ID.'
    #swagger.responses[200] = {
      description: 'Service package updated successfully'
    }
  */
  auth(USER_ROLE.vendor),
  validateRequest(ServicePackageValidations.updateServicePackageSchema),
  ServicePackageControllers.updatePackage,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['Service-package']
    #swagger.summary = 'Delete service package'
    #swagger.description = 'Delete a service package by package ID.'
    #swagger.responses[200] = {
      description: 'Service package deleted successfully'
    }
  */
  auth(USER_ROLE.vendor),
  ServicePackageControllers.deletePackage,
);

export const ServicePackageRoutes = router;

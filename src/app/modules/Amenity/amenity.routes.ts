import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { AmenityControllers } from './amenity.controller';
import { AmenityValidations } from './amenity.validation';

const router = express.Router();

// Public
router.get('/', AmenityControllers.getAllAmenities);
router.get('/:category/:subcategory', AmenityControllers.getAmenitiesByCategoryAndSubcategory);
router.get('/:id', AmenityControllers.getSingleAmenity);

// Admin only
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AmenityValidations.createAmenitySchema),
  AmenityControllers.createAmenity,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AmenityValidations.updateAmenitySchema),
  AmenityControllers.updateAmenity,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AmenityControllers.deleteAmenity,
);

export const AmenityRoutes = router;

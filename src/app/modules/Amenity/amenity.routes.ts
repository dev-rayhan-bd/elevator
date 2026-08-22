import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { AmenityControllers } from './amenity.controller';
import { AmenityValidations } from './amenity.validation';

const router = express.Router();

// Public
router.get('/',
  /*
    #swagger.tags = ['Amenity']
    #swagger.summary = 'Get all amenities'
  */
  AmenityControllers.getAllAmenities
);
router.get('/:category/:subcategory',
  /*
    #swagger.tags = ['Amenity']
    #swagger.summary = 'Get amenities by category and subcategory'
  */
  AmenityControllers.getAmenitiesByCategoryAndSubcategory
);
router.get('/:id',
  /*
    #swagger.tags = ['Amenity']
    #swagger.summary = 'Get single amenity details'
  */
  AmenityControllers.getSingleAmenity
);

// Admin only
router.post(
  '/',
  /*
    #swagger.tags = ['Amenity']
    #swagger.summary = 'Create new amenity'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Parking Space',
        $categoryId: '60d5ecb8b5c9c123456789ab',
        $subcategoryId: '60d5ecb8b5c9c123456789ac'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AmenityValidations.createAmenitySchema),
  AmenityControllers.createAmenity,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['Amenity']
    #swagger.summary = 'Update amenity'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        name: 'VIP Parking Space'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AmenityValidations.updateAmenitySchema),
  AmenityControllers.updateAmenity,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['Amenity']
    #swagger.summary = 'Delete amenity'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AmenityControllers.deleteAmenity,
);

export const AmenityRoutes = router;

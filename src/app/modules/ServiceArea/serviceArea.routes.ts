import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { ServiceAreaControllers } from './serviceArea.controller';
import { ServiceAreaValidations } from './serviceArea.validation';

const router = express.Router();

// Public
router.get('/',
  /*
    #swagger.tags = ['ServiceArea']
    #swagger.summary = 'Get all service areas'
  */
  ServiceAreaControllers.getAllServiceAreas
);
router.get('/all/query',
  /*
    #swagger.tags = ['ServiceArea']
    #swagger.summary = 'Get all service areas with query filters'
  */
  ServiceAreaControllers.getAllServiceAreasWithQuery
);
router.get('/all',
  /*
    #swagger.tags = ['ServiceArea']
    #swagger.summary = 'Get service areas list'
  */
  ServiceAreaControllers.getAllServiceAreasList
);
router.get('/:id',
  /*
    #swagger.tags = ['ServiceArea']
    #swagger.summary = 'Get single service area details'
  */
  ServiceAreaControllers.getSingleServiceArea
);

// Admin only
router.post(
  '/',
  /*
    #swagger.tags = ['ServiceArea']
    #swagger.summary = 'Create service area'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Manhattan, NY',
        $city: 'New York',
        $state: 'NY',
        $zipCode: '10001'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(ServiceAreaValidations.createServiceAreaSchema),
  ServiceAreaControllers.createServiceArea,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['ServiceArea']
    #swagger.summary = 'Update service area'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        name: 'Updated Area Name'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(ServiceAreaValidations.updateServiceAreaSchema),
  ServiceAreaControllers.updateServiceArea,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['ServiceArea']
    #swagger.summary = 'Delete service area'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ServiceAreaControllers.deleteServiceArea,
);

export const ServiceAreaRoutes = router;

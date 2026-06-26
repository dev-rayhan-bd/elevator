import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { ServiceAreaControllers } from './serviceArea.controller';
import { ServiceAreaValidations } from './serviceArea.validation';

const router = express.Router();

// Public
router.get('/', ServiceAreaControllers.getAllServiceAreas);
router.get('/all/query', ServiceAreaControllers.getAllServiceAreasWithQuery);
router.get('/all', ServiceAreaControllers.getAllServiceAreasList);
router.get('/:id', ServiceAreaControllers.getSingleServiceArea);

// Admin only
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(ServiceAreaValidations.createServiceAreaSchema),
  ServiceAreaControllers.createServiceArea,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(ServiceAreaValidations.updateServiceAreaSchema),
  ServiceAreaControllers.updateServiceArea,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ServiceAreaControllers.deleteServiceArea,
);

export const ServiceAreaRoutes = router;

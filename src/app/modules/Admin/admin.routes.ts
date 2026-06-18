import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import { AdminControllers } from './admin.controller';
import { AdminValidation } from './admin.validation';
import auth from '../../middleware/auth';

const router = express.Router();

router.post('/login', validateRequest(AdminValidation.loginSchema), AdminControllers.loginAdmin);


router.post(
  '/create-admin', 
  auth('superAdmin'), 
  validateRequest(AdminValidation.createAdminSchema), 
  AdminControllers.createAdmin
);
router.get(
  '/pending-vendors', 
  auth('admin', 'superAdmin'), 
  AdminControllers.getPendingVendors
);

router.patch(
  '/approve-vendor/:id', 
  auth('admin', 'superAdmin'), 
  AdminControllers.approveVendor
);
export const AdminRoutes = router;
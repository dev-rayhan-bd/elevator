import express from 'express';
import auth from '../../middleware/auth';
import { UserControllers } from './user.controller';
import { upload } from '../../middleware/multer';



const router = express.Router();

router.get('/', auth('admin', 'superAdmin'), UserControllers.getAllUsers);
router.patch('/update-me', auth('user', 'vendor'), upload.single('image') as any, UserControllers.updateProfile);
router.patch(
  '/setup-profile',
  auth('user','vendor'),
  upload.single('image') as any,
  UserControllers.setupProfile
);

router.patch(
  '/update-portfolio',
  auth('vendor'),
  upload.array('portfolio', 10) as any,
  UserControllers.updatePortfolio
);

router.post(
  '/become-vendor',
  auth('user'), 
  UserControllers.becomeVendorRequest
);
router.get(
  '/me', 
  auth('user', 'vendor', 'admin', 'superAdmin'), 
  UserControllers.getMe 
);
router.patch('/manage-availability', auth('vendor'), UserControllers.updateAvailability);
router.patch(
  '/update-availability',
  auth('vendor'), 
  UserControllers.updateAvailabilityStatus
);
export const UserRoutes = router;
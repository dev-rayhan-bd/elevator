import express from 'express';
import auth from '../../middleware/auth';
import { UserControllers } from './user.controller';
import { upload } from '../../middleware/multer';



const router = express.Router();

router.get('/', auth('admin', 'superAdmin'), UserControllers.getAllUsers);
router.patch('/update-me', auth('user', 'vendor'), upload.single('image') as any, UserControllers.updateProfile);

export const UserRoutes = router;
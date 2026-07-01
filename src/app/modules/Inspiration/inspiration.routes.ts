import express, { RequestHandler } from 'express';
import { USER_ROLE } from '../Auth/auth.constant';
import auth from '../../middleware/auth';
import { InspirationControllers } from './inspiration.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();
const uploadImage = upload.single('image') as unknown as RequestHandler;

// ── Public Routes ──
router.get('/public', InspirationControllers.getAllInspirations);

// ── Admin Routes ──
router.get(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  InspirationControllers.getAdminInspirations,
);

router.get(
  '/admin/:id',
//   auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  InspirationControllers.getSingleInspiration,
);

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadImage,
  InspirationControllers.createInspiration,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadImage,
  InspirationControllers.updateInspiration,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  InspirationControllers.deleteInspiration,
);

export const InspirationRoutes = router;

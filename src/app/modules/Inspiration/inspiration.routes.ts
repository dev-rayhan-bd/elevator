import express, { RequestHandler } from 'express';
import { USER_ROLE } from '../Auth/auth.constant';
import auth from '../../middleware/auth';
import { InspirationControllers } from './inspiration.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();
const uploadImagesMiddleware = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 },
]) as unknown as RequestHandler;

// ── Public Routes ──
router.get('/public',
  /*
    #swagger.tags = ['Inspiration']
    #swagger.summary = 'Get all public inspiration posts'
  */
  InspirationControllers.getAllInspirations
);

// ── Admin Routes ──
router.get(
  '/admin',
  /*
    #swagger.tags = ['Inspiration']
    #swagger.summary = 'Get all inspirations (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  InspirationControllers.getAdminInspirations,
);

router.get(
  '/admin/:id',
  /*
    #swagger.tags = ['Inspiration']
    #swagger.summary = 'Get single inspiration post'
  */
  InspirationControllers.getSingleInspiration,
);

router.post(
  '/',
  /*
    #swagger.tags = ['Inspiration']
    #swagger.summary = 'Create inspiration post (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadImagesMiddleware,
  InspirationControllers.createInspiration,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['Inspiration']
    #swagger.summary = 'Update inspiration post (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadImagesMiddleware,
  InspirationControllers.updateInspiration,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['Inspiration']
    #swagger.summary = 'Delete inspiration post (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  InspirationControllers.deleteInspiration,
);

export const InspirationRoutes = router;

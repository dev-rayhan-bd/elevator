import express, { RequestHandler } from 'express';

import auth from '../../../middleware/auth';
import { BlogControllers } from './blog.controller';
import { upload } from '../../../middleware/multer';
import { USER_ROLE } from '../../Auth/auth.constant';

const router = express.Router();
const uploadImage = upload.single('image') as unknown as RequestHandler;

// ── Public Routes (no auth required) ──
router.get('/', BlogControllers.getAllBlogs);

router.get('/:id', BlogControllers.getSingleBlog);

// ── Admin-Only Routes ── 
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadImage,
  BlogControllers.createBlog,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadImage,
  BlogControllers.updateBlog,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogControllers.deleteBlog,
);

export const BlogRoutes = router;

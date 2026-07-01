import express, { RequestHandler } from 'express';

import auth from '../../../middleware/auth';
import { BlogControllers } from './blog.controller';
import { upload } from '../../../middleware/multer';
import { USER_ROLE } from '../../Auth/auth.constant';

const router = express.Router();
const uploadImage = upload.single('image') as unknown as RequestHandler;

// ── Public Routes ──
router.get('/', BlogControllers.getAllBlogs);
router.get('/slug/:slug', BlogControllers.getSingleBlogBySlug);

// ── Admin Routes ──
router.get(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogControllers.getAdminBlogs,
);

router.get(
  '/admin/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogControllers.getSingleBlog,
);

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

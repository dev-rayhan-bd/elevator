import express, { RequestHandler } from 'express';

import auth from '../../../middleware/auth';
import optionalAuth from '../../../middleware/optionalAuth';
import { BlogControllers } from './blog.controller';
import { upload } from '../../../middleware/multer';
import { USER_ROLE } from '../../Auth/auth.constant';

const router = express.Router();
const uploadImage = upload.single('image') as unknown as RequestHandler;

// ── Unified Routes (one API for all roles — admin sees all, others see published only) ──
router.get('/', optionalAuth, BlogControllers.getAllBlogs);
router.get('/slug/:slug', optionalAuth, BlogControllers.getSingleBlogBySlug);
router.get('/:id', optionalAuth, BlogControllers.getSingleBlog);

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

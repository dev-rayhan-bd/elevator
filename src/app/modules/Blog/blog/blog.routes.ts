import express, { RequestHandler } from 'express';

import auth from '../../../middleware/auth';
import { BlogControllers } from './blog.controller';
import { upload } from '../../../middleware/multer';
import { USER_ROLE } from '../../Auth/auth.constant';

const router = express.Router();
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'ogImage', maxCount: 1 },
]) as unknown as RequestHandler;

// ── Public Routes (no auth required) ──
router.get('/', BlogControllers.getAllBlogs);

router.get('/slug/:slug', BlogControllers.getSingleBlogBySlug);

router.get('/:id', BlogControllers.getSingleBlog);

// ── Admin-Only Routes ── 
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadFields,
  BlogControllers.createBlog,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadFields,
  BlogControllers.updateBlog,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogControllers.deleteBlog,
);

export const BlogRoutes = router;

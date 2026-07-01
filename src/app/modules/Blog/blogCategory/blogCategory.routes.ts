import express from 'express';
import { USER_ROLE } from '../../Auth/auth.constant';
import auth from '../../../middleware/auth';
import { BlogCategoryControllers } from './blogCategory.controller';
import validateRequest from '../../../middleware/validateRequest';
import { BlogCategoryValidations } from './blogCategory.validation';

const router = express.Router();

// ── Public ──
router.get('/', BlogCategoryControllers.getAllBlogCategories);

// ── Admin ──
router.get(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogCategoryControllers.getAdminBlogCategories,
);

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BlogCategoryValidations.createBlogCategorySchema),
  BlogCategoryControllers.createBlogCategory,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BlogCategoryValidations.updateBlogCategorySchema),
  BlogCategoryControllers.updateBlogCategory,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogCategoryControllers.deleteBlogCategory,
);

export const BlogCategoryRoutes = router;

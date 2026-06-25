import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { CategoryControllers } from './category.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();

// Public
router.get('/', CategoryControllers.getAllCategories);
router.get('/all', CategoryControllers.getAllCategoriesList);
router.get('/:id', CategoryControllers.getSingleCategory);

// Admin only
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  CategoryControllers.createCategory,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  CategoryControllers.updateCategory,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  CategoryControllers.deleteCategory,
);

export const CategoryRoutes = router;

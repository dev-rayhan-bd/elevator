import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { CategoryControllers } from './category.controller';
import { CategoryValidations } from './category.validation';
import { upload } from '../../middleware/multer';

const router = express.Router();

// Public
router.get('/', CategoryControllers.getAllCategories);
router.get('/all', CategoryControllers.getAllCategoriesList);
router.get('/with-subcategories', CategoryControllers.getCategoriesWithSubcategories);
router.get('/:id', CategoryControllers.getSingleCategory);

// Admin only
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  (req: any, res: any, next: any) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  CategoryControllers.createCategory,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  (req: any, res: any, next: any) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  validateRequest(CategoryValidations.updateCategorySchema),
  CategoryControllers.updateCategory,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  CategoryControllers.deleteCategory,
);

export const CategoryRoutes = router;

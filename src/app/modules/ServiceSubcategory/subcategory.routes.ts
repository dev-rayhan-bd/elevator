import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { SubcategoryControllers } from './subcategory.controller';
import { SubcategoryValidations } from './subcategory.validation';
import { upload } from '../../middleware/multer';

const router = express.Router();

// Public
router.get('/', SubcategoryControllers.getAllSubcategories);
router.get('/all/query', SubcategoryControllers.getAllSubcategoriesWithQuery);
router.get('/all', SubcategoryControllers.getAllSubcategoriesList);
router.get('/by-category/:categoryId', SubcategoryControllers.getSubcategoriesByCategory);
router.get('/:id', SubcategoryControllers.getSingleSubcategory);

// Admin only
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  (req: any, res: any, next: any) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  validateRequest(SubcategoryValidations.createSubcategorySchema),
  SubcategoryControllers.createSubcategory,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  (req: any, res: any, next: any) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  validateRequest(SubcategoryValidations.updateSubcategorySchema),
  SubcategoryControllers.updateSubcategory,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  SubcategoryControllers.deleteSubcategory,
);

export const SubcategoryRoutes = router;

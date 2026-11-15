import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { CategoryControllers } from './category.controller';
import { CategoryValidations } from './category.validation';
import { upload } from '../../middleware/multer';

const router = express.Router();

// Public
router.get('/',
  /*
    #swagger.tags = ['ServiceCategory']
    #swagger.summary = 'Get all service categories'
  */
  CategoryControllers.getAllCategories
);
router.get('/all',
  /*
    #swagger.tags = ['ServiceCategory']
    #swagger.summary = 'Get all categories list'
  */
  CategoryControllers.getAllCategoriesList
);
router.get('/with-subcategories',
  /*
    #swagger.tags = ['ServiceCategory']
    #swagger.summary = 'Get categories with nested subcategories'
  */
  CategoryControllers.getCategoriesWithSubcategories
);
router.get('/:id',
  /*
    #swagger.tags = ['ServiceCategory']
    #swagger.summary = 'Get single category details'
  */
  CategoryControllers.getSingleCategory
);

// Admin only
router.post(
  '/',
  /*
    #swagger.tags = ['ServiceCategory']
    #swagger.summary = 'Create new service category'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Venue Decoration',
        description: 'Floral and lighting setup'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  (req: any, res: any, next: any) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  CategoryControllers.createCategory,
);

router.patch(
  '/reorder',
  /*
    #swagger.tags = ['ServiceCategory']
    #swagger.summary = 'Reorder categories'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        items: [
          { id: '60d5ecb8b5c9c123456789ab', order: 1 }
        ]
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(CategoryValidations.reorderCategorySchema),
  CategoryControllers.reorderCategories,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['ServiceCategory']
    #swagger.summary = 'Update service category'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        name: 'Updated Decoration Category',
        description: 'Updated description'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  (req: any, res: any, next: any) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    if (typeof req.body.isActive === 'string') {
      req.body.isActive = req.body.isActive === 'true';
    }
    next();
  },
  validateRequest(CategoryValidations.updateCategorySchema),
  CategoryControllers.updateCategory,
);

router.patch(
  '/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  CategoryControllers.toggleCategoryStatus,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['ServiceCategory']
    #swagger.summary = 'Delete service category'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  CategoryControllers.deleteCategory,
);

export const CategoryRoutes = router;

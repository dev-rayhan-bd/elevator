import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { SubcategoryControllers } from './subcategory.controller';
import { SubcategoryValidations } from './subcategory.validation';
import { upload } from '../../middleware/multer';

const router = express.Router();

// Public
router.get('/',
  /*
    #swagger.tags = ['ServiceSubcategory']
    #swagger.summary = 'Get all subcategories'
  */
  SubcategoryControllers.getAllSubcategories
);
router.get('/all/query',
  /*
    #swagger.tags = ['ServiceSubcategory']
    #swagger.summary = 'Get all subcategories with query filters'
  */
  SubcategoryControllers.getAllSubcategoriesWithQuery
);
router.get('/all',
  /*
    #swagger.tags = ['ServiceSubcategory']
    #swagger.summary = 'Get subcategories list'
  */
  SubcategoryControllers.getAllSubcategoriesList
);
router.get('/by-category/:categoryId',
  /*
    #swagger.tags = ['ServiceSubcategory']
    #swagger.summary = 'Get subcategories by parent category ID'
  */
  SubcategoryControllers.getSubcategoriesByCategory
);
router.get('/:id',
  /*
    #swagger.tags = ['ServiceSubcategory']
    #swagger.summary = 'Get single subcategory details'
  */
  SubcategoryControllers.getSingleSubcategory
);

// Admin only
router.post(
  '/',
  /*
    #swagger.tags = ['ServiceSubcategory']
    #swagger.summary = 'Create new subcategory'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Floral Design',
        $categoryId: '60d5ecb8b5c9c123456789ab',
        description: 'Custom flower arrangements'
      }
    }
  */
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
  /*
    #swagger.tags = ['ServiceSubcategory']
    #swagger.summary = 'Update subcategory'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        name: 'Updated Subcategory Name',
        description: 'Updated subcategory description'
      }
    }
  */
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
  /*
    #swagger.tags = ['ServiceSubcategory']
    #swagger.summary = 'Delete subcategory'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  SubcategoryControllers.deleteSubcategory,
);

export const SubcategoryRoutes = router;

import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { InspirationCategoryControllers } from './inspirationCategory.controller';
import { InspirationCategoryValidations } from './inspirationCategory.validation';
import { upload } from '../../middleware/multer';

const router = express.Router();

// ── Public Routes ──
router.get('/',
  /*
    #swagger.tags = ['InspirationCategory']
    #swagger.summary = 'Get all inspiration categories (public)'
  */
  InspirationCategoryControllers.getAllInspirationCategories,
);

router.get('/all',
  /*
    #swagger.tags = ['InspirationCategory']
    #swagger.summary = 'Get all inspiration categories list (for dropdowns)'
  */
  InspirationCategoryControllers.getAllInspirationCategoriesList,
);

router.get('/:id',
  /*
    #swagger.tags = ['InspirationCategory']
    #swagger.summary = 'Get single inspiration category'
  */
  InspirationCategoryControllers.getSingleInspirationCategory,
);

// ── Admin Routes ──
router.get('/admin/all',
  /*
    #swagger.tags = ['InspirationCategory']
    #swagger.summary = 'Get all inspiration categories (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  InspirationCategoryControllers.getAdminInspirationCategories,
);

router.post(
  '/',
  /*
    #swagger.tags = ['InspirationCategory']
    #swagger.summary = 'Create inspiration category (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  (req: any, res: any, next: any) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  InspirationCategoryControllers.createInspirationCategory,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['InspirationCategory']
    #swagger.summary = 'Update inspiration category (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  (req: any, res: any, next: any) => {
    if (req.body.data) req.body = JSON.parse(req.body.data);
    next();
  },
  InspirationCategoryControllers.updateInspirationCategory,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['InspirationCategory']
    #swagger.summary = 'Delete inspiration category (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  InspirationCategoryControllers.deleteInspirationCategory,
);

export const InspirationCategoryRoutes = router;

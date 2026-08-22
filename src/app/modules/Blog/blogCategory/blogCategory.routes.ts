import express from 'express';
import { USER_ROLE } from '../../Auth/auth.constant';
import auth from '../../../middleware/auth';
import { BlogCategoryControllers } from './blogCategory.controller';
import validateRequest from '../../../middleware/validateRequest';
import { BlogCategoryValidations } from './blogCategory.validation';

const router = express.Router();

// ── Public ──
router.get('/',
  /*
    #swagger.tags = ['BlogCategory']
    #swagger.summary = 'Get all blog categories'
  */
  BlogCategoryControllers.getAllBlogCategories
);

// ── Admin ──
router.get(
  '/admin',
  /*
    #swagger.tags = ['BlogCategory']
    #swagger.summary = 'Get blog categories (Admin view)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogCategoryControllers.getAdminBlogCategories,
);

router.post(
  '/',
  /*
    #swagger.tags = ['BlogCategory']
    #swagger.summary = 'Create blog category'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Event Planning'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BlogCategoryValidations.createBlogCategorySchema),
  BlogCategoryControllers.createBlogCategory,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['BlogCategory']
    #swagger.summary = 'Update blog category'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        name: 'Updated Category Name'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(BlogCategoryValidations.updateBlogCategorySchema),
  BlogCategoryControllers.updateBlogCategory,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['BlogCategory']
    #swagger.summary = 'Delete blog category'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogCategoryControllers.deleteBlogCategory,
);

export const BlogCategoryRoutes = router;

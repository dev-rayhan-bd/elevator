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
router.get('/',
  /*
    #swagger.tags = ['Blog']
    #swagger.summary = 'Get all blog posts'
  */
  BlogControllers.getAllBlogs
);

router.get('/slug/:slug',
  /*
    #swagger.tags = ['Blog']
    #swagger.summary = 'Get single blog post by slug'
  */
  BlogControllers.getSingleBlogBySlug
);

router.get('/:id',
  /*
    #swagger.tags = ['Blog']
    #swagger.summary = 'Get single blog post by ID'
  */
  BlogControllers.getSingleBlog
);

// ── Admin-Only Routes ── 
router.post(
  '/',
  /*
    #swagger.tags = ['Blog']
    #swagger.summary = 'Create new blog post (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $title: 'Top 10 Event Decoration Trends for 2026',
        $content: 'Detailed blog content markdown or html...',
        $categoryId: '60d5ecb8b5c9c123456789ab',
        tags: ['event', 'decor', 'wedding']
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadFields,
  BlogControllers.createBlog,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['Blog']
    #swagger.summary = 'Update blog post (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        title: 'Updated Blog Title',
        content: 'Updated content...'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadFields,
  BlogControllers.updateBlog,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['Blog']
    #swagger.summary = 'Delete blog post (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  BlogControllers.deleteBlog,
);

export const BlogRoutes = router;

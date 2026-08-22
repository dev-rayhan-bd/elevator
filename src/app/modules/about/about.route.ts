import express from 'express';
import { USER_ROLE } from '../Auth/auth.constant';

import termsController from './about.controller';
import auth from '../../middleware/auth';



const aboutRouter = express.Router();

// Route to create or update About content (only accessible to admin or super-admin)
aboutRouter.post(
  '/create-or-update',
  /*
    #swagger.tags = ['About']
    #swagger.summary = 'Create or update About Us page content'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $content: 'About WeePlan event management platform...'
      }
    }
  */
  auth(USER_ROLE.superAdmin,USER_ROLE.admin),
  termsController.createOrUpdateTerms
);

// Route to retrieve About content (accessible to everyone)
aboutRouter.get(
  '/retrive',
  /*
    #swagger.tags = ['About']
    #swagger.summary = 'Get About Us page content'
  */
  termsController.getTerms
);

export default aboutRouter;
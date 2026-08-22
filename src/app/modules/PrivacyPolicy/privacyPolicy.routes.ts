import express from 'express';
import { USER_ROLE } from '../Auth/auth.constant';

import PrivacyPolicyController from './PrivacyPolicy.controller';
import auth from '../../middleware/auth';


const privacyPolicyRouter = express.Router();

// Route to create or update Privacy Policy content (only accessible to admin or super-admin)
privacyPolicyRouter.post(
  '/create-or-update',
  /*
    #swagger.tags = ['PrivacyPolicy']
    #swagger.summary = 'Create or update Privacy Policy content'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $content: 'Privacy policy terms and data processing policy...'
      }
    }
  */
  auth(USER_ROLE.superAdmin,USER_ROLE.admin),
  PrivacyPolicyController.createOrUpdatePrivacyPolicy
);

// Route to retrieve Privacy Policy content (accessible to everyone)
privacyPolicyRouter.get(
  '/retrive',
  /*
    #swagger.tags = ['PrivacyPolicy']
    #swagger.summary = 'Get Privacy Policy content'
  */
  PrivacyPolicyController.getPrivacyPolicy
);

export default privacyPolicyRouter;
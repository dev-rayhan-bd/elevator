import express from 'express';
import { USER_ROLE } from '../Auth/auth.constant';
import CookiePolicyController from './CookiePolicy.controller';
import auth from '../../middleware/auth';

const cookiePolicyRouter = express.Router();

cookiePolicyRouter.post(
  '/create-or-update',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  CookiePolicyController.createOrUpdateCookiePolicy,
);

cookiePolicyRouter.get('/retrive', CookiePolicyController.getCookiePolicy);
cookiePolicyRouter.get('/', CookiePolicyController.getCookiePolicy);

export default cookiePolicyRouter;

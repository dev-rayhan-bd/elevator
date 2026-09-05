import express from 'express';
import { USER_ROLE } from '../Auth/auth.constant';
import FooterController from './Footer.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { FooterValidations } from './footer.validation';

const footerRouter = express.Router();

footerRouter.post(
  '/create-or-update',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(FooterValidations.createOrUpdateFooterValidationSchema),
  FooterController.createOrUpdateFooter,
);

footerRouter.patch(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(FooterValidations.createOrUpdateFooterValidationSchema),
  FooterController.createOrUpdateFooter,
);

footerRouter.get('/retrive', FooterController.getFooter);
footerRouter.get('/', FooterController.getFooter);

export default footerRouter;

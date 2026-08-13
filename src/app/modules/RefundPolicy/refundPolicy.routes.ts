import express from 'express';
import { USER_ROLE } from '../Auth/auth.constant';
import RefundPolicyController from './RefundPolicy.controller';
import auth from '../../middleware/auth';

const refundPolicyRouter = express.Router();

refundPolicyRouter.post(
  '/create-or-update',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  RefundPolicyController.createOrUpdateRefundPolicy,
);

refundPolicyRouter.get('/retrive', RefundPolicyController.getRefundPolicy);
refundPolicyRouter.get('/', RefundPolicyController.getRefundPolicy);

export default refundPolicyRouter;

import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { ReportControllers } from './report.controller';

const router = express.Router();

router.get(
  '/',
  /*
    #swagger.tags = ['Report']
    #swagger.summary = 'Get system reports (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ReportControllers.getReports,
);

router.get(
  '/export-pdf',
  /*
    #swagger.tags = ['Report']
    #swagger.summary = 'Export system reports PDF (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ReportControllers.exportReportPDF,
);

export const ReportRoutes = router;

import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { ReportControllers } from './report.controller';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ReportControllers.getReports,
);

router.get(
  '/export-pdf',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  ReportControllers.exportReportPDF,
);

export const ReportRoutes = router;

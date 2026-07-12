import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { DashboardControllers } from './dashboard.controller';

const router = express.Router();

// ── Vendor Dashboard ──
// GET /dashboard/vendor?months=6
router.get(
  '/vendor',
  auth(USER_ROLE.vendor),
  DashboardControllers.getVendorDashboard,
);

export const DashboardRoutes = router;

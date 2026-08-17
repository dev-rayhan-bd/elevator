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

// ── Vendor Upcoming Events ──
// GET /dashboard/vendor/upcoming-events?page=1&limit=10
router.get(
  '/vendor/upcoming-events',
  auth(USER_ROLE.vendor),
  DashboardControllers.getAllUpcomingEvents,
);

// ── Admin Dashboard ──
// GET /dashboard/admin
router.get(
  '/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DashboardControllers.getAdminDashboard,
);

export const DashboardRoutes = router;

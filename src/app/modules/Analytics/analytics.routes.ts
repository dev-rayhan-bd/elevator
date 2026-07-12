import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { AnalyticsControllers } from './analytics.controller';

const router = express.Router();

// ── Vendor Analytics (KPI + Ads Performance) ──
// GET /analytics/vendor
router.get(
  '/vendor',
  auth(USER_ROLE.vendor),
  AnalyticsControllers.getVendorAnalytics,
);

// ── Vendor Performance (Top Packages/Services + Contact Clicks) ──
// GET /analytics/vendor/performance
router.get(
  '/vendor/performance',
  auth(USER_ROLE.vendor),
  AnalyticsControllers.getVendorPerformance,
);

export const AnalyticsRoutes = router;

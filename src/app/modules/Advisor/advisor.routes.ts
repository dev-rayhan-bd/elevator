import express from 'express';
import auth from '../../middleware/auth';
import optionalAuth from '../../middleware/optionalAuth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { AdvisorControllers } from './advisor.controller';
import { AdvisorValidations } from './advisor.validation';

const router = express.Router();

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

router.get('/services/active', AdvisorControllers.getActiveAdvisorServices);

// ══════════════════════════════════════════════
//  ADMIN: ADVISOR SERVICE MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/services/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.getAllAdvisorServices,
);

router.get(
  '/services/admin/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.getSingleAdvisorService,
);

router.post(
  '/services',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdvisorValidations.createAdvisorServiceSchema),
  AdvisorControllers.createAdvisorService,
);

router.patch(
  '/services/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdvisorValidations.updateAdvisorServiceSchema),
  AdvisorControllers.updateAdvisorService,
);

router.delete(
  '/services/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.deleteAdvisorService,
);
// ══════════════════════════════════════════════
//  ADMIN: VIEW & DELETE ALL REVIEWS
// ══════════════════════════════════════════════

router.get(
  '/reviews/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.adminGetAllReviews,
);

router.delete(
  '/reviews/admin/:reviewId',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.adminDeleteAdvisorReview,
);
// ══════════════════════════════════════════════
//  USER: ADVISOR BOOKING
// ══════════════════════════════════════════════

router.post(
  '/bookings',
  auth(USER_ROLE.user),
  validateRequest(AdvisorValidations.createBookingSchema),
  AdvisorControllers.createBooking,
);

router.get(
  '/bookings/my',
  auth(USER_ROLE.user),
  AdvisorControllers.getMyBookings,
);

router.get(
  '/bookings/my/:id',
  auth(USER_ROLE.user),
  AdvisorControllers.getMySingleBooking,
);

router.patch(
  '/bookings/my/:id/cancel',
  auth(USER_ROLE.user),
  AdvisorControllers.cancelBooking,
);

// ══════════════════════════════════════════════
//  ADMIN: BOOKING MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/bookings/admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.adminGetAllBookings,
);

router.patch(
  '/bookings/admin/:id/assign',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdvisorValidations.assignAssociateSchema),
  AdvisorControllers.assignAssociate,
);

router.patch(
  '/bookings/admin/:id/status',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdvisorValidations.updateBookingStatusSchema),
  AdvisorControllers.adminUpdateBookingStatus,
);

// ══════════════════════════════════════════════
//  ADMIN: DASHBOARD
// ══════════════════════════════════════════════

router.get(
  '/dashboard/stats',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.getDashboardStats,
);

// ══════════════════════════════════════════════
//  ADMIN: EXPORT ALL DATA
// ══════════════════════════════════════════════

router.get(
  '/export',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.exportAllData,
);

// ══════════════════════════════════════════════
//  USER: ADVISOR REVIEWS (purchase-gated)
// ══════════════════════════════════════════════

router.post(
  '/reviews',
  auth(USER_ROLE.user),
  validateRequest(AdvisorValidations.createAdvisorReviewSchema),
  AdvisorControllers.createAdvisorReview,
);

router.get(
  '/reviews/:advisorServiceId',
  optionalAuth,
  AdvisorControllers.getAdvisorServiceReviews,
);

router.delete(
  '/reviews/:reviewId',
  auth(USER_ROLE.user),
  AdvisorControllers.deleteAdvisorReview,
);



export const AdvisorRoutes = router;

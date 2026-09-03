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

// ══════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════

router.get('/services/active',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get active event advisor services'
  */
  AdvisorControllers.getActiveAdvisorServices
);

// ══════════════════════════════════════════════
//  ADMIN: ADVISOR SERVICE MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/services/admin',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get all advisor services (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.getAllAdvisorServices,
);

router.get(
  '/services/admin/:id',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get single advisor service (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.getSingleAdvisorService,
);

router.post(
  '/services',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Create advisor service (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $title: '1-on-1 Wedding Planning Consultation',
        $description: 'Expert advice on vendor selection and budgeting',
        $price: 150
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdvisorValidations.createAdvisorServiceSchema),
  AdvisorControllers.createAdvisorService,
);

router.patch(
  '/services/:id',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Update advisor service (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdvisorValidations.updateAdvisorServiceSchema),
  AdvisorControllers.updateAdvisorService,
);

router.delete(
  '/services/:id',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Delete advisor service (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.deleteAdvisorService,
);
// ══════════════════════════════════════════════
//  ADMIN: VIEW & DELETE ALL REVIEWS
// ══════════════════════════════════════════════

router.get(
  '/reviews/admin',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get all advisor reviews (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.adminGetAllReviews,
);

router.delete(
  '/reviews/admin/:reviewId',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Delete advisor review (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.adminDeleteAdvisorReview,
);
// ══════════════════════════════════════════════
//  USER: ADVISOR BOOKING
// ══════════════════════════════════════════════

router.post(
  '/bookings',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Book an advisor service (User)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $advisorServiceId: '60d5ecb8b5c9c123456789ab',
        $bookingDate: '2026-10-01',
        $timeSlot: '14:00-15:00',
        note: 'Interested in budget allocation strategies'
      }
    }
  */
  auth(USER_ROLE.user),
  validateRequest(AdvisorValidations.createBookingSchema),
  AdvisorControllers.createBooking,
);

router.get(
  '/bookings/my',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get my advisor bookings (User)'
  */
  auth(USER_ROLE.user),
  AdvisorControllers.getMyBookings,
);

router.get(
  '/bookings/my/:id',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get single advisor booking details'
  */
  auth(USER_ROLE.user),
  AdvisorControllers.getMySingleBooking,
);

router.patch(
  '/bookings/my/:id/cancel',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Cancel advisor booking'
  */
  auth(USER_ROLE.user),
  AdvisorControllers.cancelBooking,
);

// ══════════════════════════════════════════════
//  ADMIN: BOOKING MANAGEMENT
// ══════════════════════════════════════════════

router.get(
  '/bookings/admin',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get all advisor bookings with status and date range filtering (Admin)'
    #swagger.parameters['status'] = { in: 'query', description: 'Filter by status: pending, assigned, in_progress, completed, cancelled', type: 'string' }
    #swagger.parameters['paymentStatus'] = { in: 'query', description: 'Filter by payment status: unpaid, paid, refunded', type: 'string' }
    #swagger.parameters['startDate'] = { in: 'query', description: 'Filter start date (YYYY-MM-DD)', type: 'string' }
    #swagger.parameters['endDate'] = { in: 'query', description: 'Filter end date (YYYY-MM-DD)', type: 'string' }
    #swagger.parameters['dateField'] = { in: 'query', description: 'Date field to filter on: createdAt (default) or weddingDate', type: 'string' }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.adminGetAllBookings,
);

router.patch(
  '/bookings/admin/:id/assign',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Assign associate to advisor booking (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdvisorValidations.assignAssociateSchema),
  AdvisorControllers.assignAssociate,
);

router.patch(
  '/bookings/admin/:id/status',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Update advisor booking status (Admin)'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(AdvisorValidations.updateBookingStatusSchema),
  AdvisorControllers.adminUpdateBookingStatus,
);

// ══════════════════════════════════════════════
//  ADMIN: DASHBOARD
// ══════════════════════════════════════════════

router.get(
  '/dashboard/stats',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get advisor module dashboard stats'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.getDashboardStats,
);

// ══════════════════════════════════════════════
//  ADMIN: EXPORT ALL DATA
// ══════════════════════════════════════════════

router.get(
  '/export',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Export all advisor data'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  AdvisorControllers.exportAllData,
);

// ══════════════════════════════════════════════
//  USER: ADVISOR REVIEWS (purchase-gated)
// ══════════════════════════════════════════════

router.post(
  '/reviews',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Create advisor service review'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $advisorServiceId: '60d5ecb8b5c9c123456789ab',
        $rating: 5,
        $comment: 'Incredible advice, helped save 20% on venue costs!'
      }
    }
  */
  auth(USER_ROLE.user),
  validateRequest(AdvisorValidations.createAdvisorReviewSchema),
  AdvisorControllers.createAdvisorReview,
);

router.get(
  '/reviews/:advisorServiceId',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Get reviews for advisor service'
  */
  optionalAuth,
  AdvisorControllers.getAdvisorServiceReviews,
);

router.delete(
  '/reviews/:reviewId',
  /*
    #swagger.tags = ['Advisor']
    #swagger.summary = 'Delete advisor review'
  */
  auth(USER_ROLE.user),
  AdvisorControllers.deleteAdvisorReview,
);

export const AdvisorRoutes = router;

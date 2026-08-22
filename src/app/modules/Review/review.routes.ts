import express from 'express';
import auth from '../../middleware/auth';
import optionalAuth from '../../middleware/optionalAuth';
import validateRequest from '../../middleware/validateRequest';
import { ReviewControllers } from './review.controller';
import { ReviewValidations } from './review.validation';

const router = express.Router();

// ── Vendor: Get all reviews for my services (must be before /:serviceId) ──
router.get(
  '/my-reviews',
  /*
    #swagger.tags = ['Review']
    #swagger.summary = 'Get reviews for vendor services'
  */
  auth('vendor'),
  ReviewControllers.getVendorReviews,
);

// ── Create review (logged-in user) ──
router.post(
  '/',
  /*
    #swagger.tags = ['Review']
    #swagger.summary = 'Create review for vendor service'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $serviceId: '60d5ecb8b5c9c123456789ab',
        $rating: 5,
        $comment: 'Exceptional service and beautiful stage decoration!'
      }
    }
  */
  auth('user'),
  validateRequest(ReviewValidations.createReviewValidationSchema),
  ReviewControllers.createReview,
);

// ── Get service reviews (public, optionalAuth for isOwnReview) ──
router.get('/:serviceId',
  /*
    #swagger.tags = ['Review']
    #swagger.summary = 'Get reviews for a specific service'
  */
  optionalAuth,
  ReviewControllers.getServiceReviews
);

// ── Delete own review (logged-in user) ──
router.delete('/:reviewId',
  /*
    #swagger.tags = ['Review']
    #swagger.summary = 'Delete own review'
  */
  auth('user'),
  ReviewControllers.deleteReview
);

export const ReviewRoutes = router;
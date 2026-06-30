import express from 'express';
import auth from '../../middleware/auth';
import optionalAuth from '../../middleware/optionalAuth';
import validateRequest from '../../middleware/validateRequest';
import { ReviewControllers } from './review.controller';
import { ReviewValidations } from './review.validation';

const router = express.Router();

// ── Create review (logged-in user) ──
router.post(
  '/',
  auth('user'),
  validateRequest(ReviewValidations.createReviewValidationSchema),
  ReviewControllers.createReview,
);

// ── Get service reviews (public, optionalAuth for isOwnReview) ──
router.get('/:serviceId', optionalAuth, ReviewControllers.getServiceReviews);

// ── Delete own review (logged-in user) ──
router.delete('/:reviewId', auth('user'), ReviewControllers.deleteReview);

export const ReviewRoutes = router;
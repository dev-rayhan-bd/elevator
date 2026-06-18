import express from 'express';
import auth from '../../middleware/auth';
import { ReviewControllers } from './review.controller';

const router = express.Router();


router.get('/:vendorId', ReviewControllers.getVendorReviews);


router.post(
  '/',
  auth('user'), 
  ReviewControllers.createReview
);

export const ReviewRoutes = router;
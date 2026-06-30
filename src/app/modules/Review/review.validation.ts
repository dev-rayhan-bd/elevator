import { z } from 'zod';

const createReviewValidationSchema = z.object({

    service: z.string({ required_error: 'Service ID is required' }),
    rating: z
      .number({ required_error: 'Rating is required' })
      .int()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z
      .string({ required_error: 'Comment is required' })
      .min(3, 'Comment must be at least 3 characters')
      .max(1000, 'Comment cannot exceed 1000 characters'),
 
});

export const ReviewValidations = { createReviewValidationSchema };

import { z } from 'zod';

// ══════════════════════════════════════════════
//  ADVISOR SERVICE VALIDATIONS (Admin)
// ══════════════════════════════════════════════

const createAdvisorServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0, 'Price must be 0 or more'),
  isActive: z.boolean().optional(),
});

const updateAdvisorServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ══════════════════════════════════════════════
//  ADVISOR BOOKING VALIDATIONS (User)
// ══════════════════════════════════════════════

const createBookingSchema = z.object({
  advisorService: z.string().min(1, 'Advisor service is required'),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  weddingDate: z.string().min(1, 'Wedding date is required'),
  weddingLocation: z.string().min(1, 'Wedding location is required'),
  budget: z.number().min(0, 'Budget must be 0 or more'),
  guestCount: z.number().min(1, 'Guest count must be at least 1'),
  specialRequirements: z.string().optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded']).optional(),
});

// ══════════════════════════════════════════════
//  ADMIN: ASSIGN ASSOCIATE / UPDATE STATUS
// ══════════════════════════════════════════════

const assignAssociateSchema = z.object({
  assignedAssociate: z.string().min(1, 'Associate vendor ID is required'),
  adminNotes: z.string().optional(),
});

const updateBookingStatusSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'cancelled']),
  cancellationReason: z.string().optional(),
  adminNotes: z.string().optional(),
});

// ══════════════════════════════════════════════
//  ADVISOR REVIEW VALIDATIONS (User)
// ══════════════════════════════════════════════

const createAdvisorReviewSchema = z.object({

    advisorService: z
      .string()
      .min(1, 'Advisor service ID is required'),
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

export const AdvisorValidations = {
  createAdvisorServiceSchema,
  updateAdvisorServiceSchema,
  createBookingSchema,
  assignAssociateSchema,
  updateBookingStatusSchema,
  createAdvisorReviewSchema,
};

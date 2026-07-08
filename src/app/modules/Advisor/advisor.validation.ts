import { z } from 'zod';

// ══════════════════════════════════════════════
//  ADVISOR SERVICE VALIDATIONS (Admin)
// ══════════════════════════════════════════════

const createAdvisorServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0, 'Price must be 0 or more'),
  durationDays: z.number().min(1, 'Duration must be at least 1 day'),
  features: z.array(z.string()).optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateAdvisorServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  durationDays: z.number().min(1).optional(),
  features: z.array(z.string()).optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ══════════════════════════════════════════════
//  ADVISOR BOOKING VALIDATIONS (User)
// ══════════════════════════════════════════════

const createBookingSchema = z.object({
  advisorService: z.string().min(1, 'Advisor service is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  eventType: z.string().min(1, 'Event type is required'),
  guestCount: z.number().min(1, 'Guest count must be at least 1'),
  budget: z.number().min(0, 'Budget must be 0 or more'),
  area: z.string().min(1, 'Service area is required'),
  specialRequirements: z.string().optional(),
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

export const AdvisorValidations = {
  createAdvisorServiceSchema,
  updateAdvisorServiceSchema,
  createBookingSchema,
  assignAssociateSchema,
  updateBookingStatusSchema,
};

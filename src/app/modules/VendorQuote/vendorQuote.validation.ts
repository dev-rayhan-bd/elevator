import { z } from 'zod';

const sendQuoteValidationSchema = z.object({
  service: z.string({ required_error: 'Service ID is required' }),
  eventType: z.string().optional(),
  pricingType: z.enum(['fixed', 'starting from', 'per head']).optional(),
  eventDate: z.string({ required_error: 'Event date is required' }),
  guestCount: z.number().min(1, 'Guest count must be at least 1').optional().nullable(),
  message: z.string().min(1, 'Requirement details cannot be empty').optional(),
  description: z.string().min(1, 'Requirement details cannot be empty').optional(),
  budget: z.number().min(0, 'Budget cannot be negative').optional().nullable(),
}).refine(
  (data) => !!(data.message?.trim() || data.description?.trim()),
  { message: 'Requirement details is required', path: ['message'] },
);

const counterOfferValidationSchema = z.object({

    amount: z.number({ required_error: 'Counter amount is required' }).min(0, 'Amount cannot be negative'),
    message: z.string().optional(),
    pricingType: z.enum(['fixed', 'starting from', 'per head']).optional(),

});

export const VendorQuoteValidations = {
  sendQuoteValidationSchema,
  counterOfferValidationSchema,
};

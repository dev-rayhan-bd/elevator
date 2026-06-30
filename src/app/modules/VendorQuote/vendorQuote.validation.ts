import { z } from 'zod';

const sendQuoteValidationSchema = z.object({

    service: z.string({ required_error: 'Service ID is required' }),
    pricingType: z.enum(['fixed', 'starting from', 'per head']).optional(),
    eventDate: z.string({ required_error: 'Event date is required' }),
    guestCount: z.number({ required_error: 'Guest count is required' }).min(1, 'Guest count must be at least 1'),
    message: z.string({ required_error: 'Message is required' }).min(1, 'Message cannot be empty'),
    budget: z.number({ required_error: 'Budget is required' }).min(0, 'Budget cannot be negative'),

});

const counterOfferValidationSchema = z.object({

    amount: z.number({ required_error: 'Counter amount is required' }).min(0, 'Amount cannot be negative'),
    message: z.string().optional(),
    pricingType: z.enum(['fixed', 'starting from', 'per head']).optional(),

});

export const VendorQuoteValidations = {
  sendQuoteValidationSchema,
  counterOfferValidationSchema,
};

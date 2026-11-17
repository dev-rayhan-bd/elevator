import { z } from 'zod';

const sendQuoteValidationSchema = z
  .object({
    service: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
    eventType: z.string().optional().nullable(),
    eventTypeId: z.string().optional().nullable(),
    pricingType: z.string().optional().nullable(),
    eventDate: z.any().optional(),
    guestCount: z.union([z.number(), z.string()]).optional().nullable(),
    message: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    requirementDetails: z.string().optional().nullable(),
    details: z.string().optional().nullable(),
    budget: z.union([z.number(), z.string()]).optional().nullable(),
    estimatedBudget: z.union([z.number(), z.string()]).optional().nullable(),
  })
  .refine(
    (data) => !!(data.service?.trim() || data.serviceId?.trim()),
    { message: 'Service ID is required', path: ['service'] },
  )
  .refine(
    (data) =>
      !!(
        data.message?.trim() ||
        data.description?.trim() ||
        data.requirementDetails?.trim() ||
        data.details?.trim()
      ),
    { message: 'Requirement details cannot be empty', path: ['requirementDetails'] },
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

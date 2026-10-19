import { z } from 'zod';

export const createEventRequestSchema = z.object({
  body: z
    .object({
      eventType: z.string().min(1, 'Event type is required').optional().nullable(),
      eventDate: z.string().min(1, 'Event date is required'),
      guestCount: z.number().min(1, 'Guest count must be at least 1').optional().nullable(),
      budgetMin: z.number().min(0, 'Minimum budget must be >= 0').optional().nullable(),
      budgetMax: z.number().min(0, 'Maximum budget must be >= 0').optional().nullable(),
      estimatedBudget: z.number().min(0, 'Estimated budget must be >= 0').optional().nullable(),
      budget: z.number().min(0, 'Budget must be >= 0').optional().nullable(),
      area: z.string().min(1, 'Area/Location is required'),
      serviceCategory: z.string().min(1, 'Service category is required'),
      additionalDetails: z.string().optional(),
      requirementDetails: z.string().optional(),
      referenceImages: z.array(z.string()).optional(),
    })
    .refine(
      (data) => {
        const details = data.requirementDetails || data.additionalDetails;
        return typeof details === 'string' && details.trim().length > 0;
      },
      {
        message: 'Requirement details are required',
        path: ['requirementDetails'],
      },
    )
    .refine(
      (data) => {
        return (
          (data.budgetMin !== undefined && data.budgetMin !== null) ||
          (data.budgetMax !== undefined && data.budgetMax !== null) ||
          (data.estimatedBudget !== undefined && data.estimatedBudget !== null) ||
          (data.budget !== undefined && data.budget !== null)
        );
      },
      {
        message: 'Estimated budget is required',
        path: ['estimatedBudget'],
      },
    ),
});

export const updateEventRequestStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'closed', 'cancelled'], {
      required_error: 'Status is required',
    }),
  }),
});

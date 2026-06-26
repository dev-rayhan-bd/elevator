import { z } from 'zod';

export const createEventTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    isActive: z.boolean().optional(),
  }),
});

export const updateEventTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const EventTypeValidations = {
  createEventTypeSchema,
  updateEventTypeSchema,
};

import { z } from 'zod';

export const createEventTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const updateEventTypeSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export const reorderEventTypesSchema = z.object({
  orders: z
    .array(
      z.object({
        id: z.string({ required_error: 'ID is required' }),
        order: z.number({ required_error: 'Order is required' }).int(),
      }),
    )
    .min(1, 'Orders array cannot be empty'),
});

export const EventTypeValidations = {
  createEventTypeSchema,
  updateEventTypeSchema,
  reorderEventTypesSchema,
};

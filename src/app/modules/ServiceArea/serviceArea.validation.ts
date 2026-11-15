import { z } from 'zod';

export const createServiceAreaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  region: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

export const updateServiceAreaSchema = z.object({
  name: z.string().min(1).optional(),
  region: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

export const reorderServiceAreaSchema = z.object({
  items: z.array(
    z.object({
      id: z.string({ required_error: 'Service Area ID is required' }),
      order: z.number({ required_error: 'Order is required' }),
    }),
  ),
});

export const ServiceAreaValidations = {
  createServiceAreaSchema,
  updateServiceAreaSchema,
  reorderServiceAreaSchema,
};

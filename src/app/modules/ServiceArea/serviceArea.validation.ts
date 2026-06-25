import { z } from 'zod';

export const createServiceAreaSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    region: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateServiceAreaSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    region: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const ServiceAreaValidations = {
  createServiceAreaSchema,
  updateServiceAreaSchema,
};

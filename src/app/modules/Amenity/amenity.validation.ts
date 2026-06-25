import { z } from 'zod';

export const createAmenitySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    icon: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
  }),
});

export const updateAmenitySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    icon: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
  }),
});

export const AmenityValidations = {
  createAmenitySchema,
  updateAmenitySchema,
};

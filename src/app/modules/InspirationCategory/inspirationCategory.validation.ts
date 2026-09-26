import { z } from 'zod';

const createInspirationCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateInspirationCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const InspirationCategoryValidations = {
  createInspirationCategorySchema,
  updateInspirationCategorySchema,
};

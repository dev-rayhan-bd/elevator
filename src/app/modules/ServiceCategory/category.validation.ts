import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

export const reorderCategorySchema = z.object({
  items: z.array(
    z.object({
      id: z.string({ required_error: 'Category ID is required' }),
      order: z.number({ required_error: 'Order is required' }),
    }),
  ),
});

export const CategoryValidations = {
  createCategorySchema,
  updateCategorySchema,
  reorderCategorySchema,
};

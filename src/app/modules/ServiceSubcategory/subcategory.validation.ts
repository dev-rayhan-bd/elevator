import { z } from 'zod';

export const createSubcategorySchema = z.object({
  
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category ID is required'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateSubcategorySchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const SubcategoryValidations = {
  createSubcategorySchema,
  updateSubcategorySchema,
};

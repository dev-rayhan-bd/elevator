import { z } from 'zod';

const createBlogCategorySchema = z.object({

    name: z.string().min(1, 'Category name is required'),

});

const updateBlogCategorySchema = z.object({

    name: z.string().min(1).optional(),
    isActive: z.boolean().optional(),

});

export const BlogCategoryValidations = {
  createBlogCategorySchema,
  updateBlogCategorySchema,
};

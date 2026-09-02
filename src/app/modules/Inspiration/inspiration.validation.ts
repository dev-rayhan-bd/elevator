import { z } from 'zod';

const createInspirationSchema = z.object({
  body: z.object({
    data: z.string().transform((str) => JSON.parse(str)).pipe(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().min(1, 'Description is required'),
        price: z.string().min(1, 'Price is required'),
        vendor: z.string().min(1, 'Vendor ID is required'),
        category: z.string().min(1, 'Category ID is required'),
        isActive: z.boolean().optional(),
        images: z.array(z.string()).optional(),
        image: z.string().optional(),
      }),
    ),
  }),
});


const updateInspirationSchema = z.object({
  body: z.object({
    data: z.string().transform((str) => JSON.parse(str)).pipe(
      z.object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        price: z.string().min(1).optional(),
        vendor: z.string().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
        images: z.array(z.string()).optional(),
        image: z.string().optional(),
      }),
    ),
  }),
});

export const InspirationValidations = {
  createInspirationSchema,
  updateInspirationSchema,
};

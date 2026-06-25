import { z } from 'zod';

export const createVendorServiceSchema = z.object({
  body: z.object({
    category: z.string().min(1, 'Category is required'),
    subcategory: z.string().min(1, 'Subcategory is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    pricingType: z.enum(['fixed', 'hourly', 'negotiable']),
    price: z.number().min(0, 'Price must be >= 0'),
    discountedPrice: z.number().min(0).optional(),
    amenities: z.array(z.string()).optional(),
    serviceAreas: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateVendorServiceSchema = z.object({
  body: z.object({
    category: z.string().optional(),
    subcategory: z.string().optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    pricingType: z.enum(['fixed', 'hourly', 'negotiable']).optional(),
    price: z.number().min(0).optional(),
    discountedPrice: z.number().min(0).optional(),
    amenities: z.array(z.string()).optional(),
    serviceAreas: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const VendorServiceValidations = {
  createVendorServiceSchema,
  updateVendorServiceSchema,
};

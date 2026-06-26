import { z } from 'zod';

export const createVendorServiceSchema = z.object({
  body: z.object({
    category: z.string().min(1, 'Category is required'),
    subcategory: z.string().min(1, 'Subcategory is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    pricingType: z.enum(['fixed', 'starting from', 'per head']),
    price: z.number().min(0, 'Price must be >= 0'),
    guestCapacity: z.number().min(1, 'Guest capacity must be >= 1'),
    eventTypes: z.array(z.string()).optional(),
    serviceAreas: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
    termsAndCondition: z.string().min(1, 'Terms and condition is required'),
    isActive: z.boolean().optional(),
  }),
});

export const updateVendorServiceSchema = z.object({
  body: z.object({
    category: z.string().optional(),
    subcategory: z.string().optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    pricingType: z.enum(['fixed', 'starting from', 'per head']).optional(),
    price: z.number().min(0).optional(),
    guestCapacity: z.number().min(1).optional(),
    eventTypes: z.array(z.string()).optional(),
    serviceAreas: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
    termsAndCondition: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const toggleServiceStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean().optional(),
  }),
});

export const deleteServiceImagesSchema = z.object({
  body: z.object({
    images: z
      .array(z.string().min(1, 'Image URL cannot be empty'))
      .min(1, 'At least one image URL is required'),
  }),
});

export const VendorServiceValidations = {
  createVendorServiceSchema,
  updateVendorServiceSchema,
  toggleServiceStatusSchema,
  deleteServiceImagesSchema,
};

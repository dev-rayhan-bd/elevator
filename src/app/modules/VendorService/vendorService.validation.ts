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

export const draftVendorServiceSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    description: z.string().optional(),
    pricingType: z.enum(['fixed', 'starting from', 'per head']).optional(),
    price: z.number().optional(),
    guestCapacity: z.number().optional(),
    eventTypes: z.array(z.string()).optional(),
    serviceAreas: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
    termsAndCondition: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const publishDraftSchema = z.object({
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

// ── Karachi Venue Map — Query Param Validation ──
export const venueSearchQuerySchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  area: z.string().optional(),
  eventTypes: z.union([z.string(), z.array(z.string())]).optional(),
  amenities: z.union([z.string(), z.array(z.string())]).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  guestCapacity: z.string().optional(),
  rating: z.string().optional(),
  isVerified: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional(),
  isFav: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional(),
  search: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  maxDistance: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const VendorServiceValidations = {
  createVendorServiceSchema,
  updateVendorServiceSchema,
  toggleServiceStatusSchema,
  deleteServiceImagesSchema,
  draftVendorServiceSchema,
  publishDraftSchema,
  venueSearchQuerySchema,
};

import { z } from 'zod';

const locationSchema = z
  .object({
    lat: z.number(),
    long: z.number(),
    address: z.string().optional(),
  })
  .optional();

const customAmenitiesSchema = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0);
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) => String(item).trim())
              .filter((item) => item.length > 0);
          }
        } catch {
          // ignore and fallback
        }
      }
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    return [];
  });

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
    customAmenities: customAmenitiesSchema,
    location: locationSchema,
    termsAndCondition: z.string().min(1, 'Terms and condition is required'),
    isActive: z.boolean().optional(),
    entireCity: z.boolean().optional(),
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
    customAmenities: customAmenitiesSchema,
    location: locationSchema,
    termsAndCondition: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    entireCity: z.boolean().optional(),
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
    customAmenities: customAmenitiesSchema,
    location: locationSchema,
    termsAndCondition: z.string().optional(),
    isActive: z.boolean().optional(),
    entireCity: z.boolean().optional(),
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
    customAmenities: customAmenitiesSchema,
    location: locationSchema,
    termsAndCondition: z.string().min(1, 'Terms and condition is required'),
    isActive: z.boolean().optional(),
    entireCity: z.boolean().optional(),
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
  sortByPrice: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
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

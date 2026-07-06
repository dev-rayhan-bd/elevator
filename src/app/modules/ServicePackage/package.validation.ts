import { z } from 'zod';

export const createServicePackageSchema = z.object({

    packageType: z.enum(['basic', 'standard', 'premium']),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    price: z.number().min(0, 'Price must be >= 0'),
    // deliveryTime: z.string().min(1, 'Delivery time is required'),
    // revisions: z.number().min(0, 'Revisions must be >= 0'),
    features: z.array(z.string()).optional().default([]),
    isActive: z.boolean().optional(),

});

export const updateServicePackageSchema = z.object({

    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    price: z.number().min(0).optional(),
    deliveryTime: z.string().min(1).optional(),
    revisions: z.number().min(0).optional(),
    features: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
 
});

export const ServicePackageValidations = {
  createServicePackageSchema,
  updateServicePackageSchema,
};

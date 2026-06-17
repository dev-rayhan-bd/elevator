import { z } from 'zod';

export const updateUserValidationSchema = z.object({

    firstName: z.string().optional(),
    lastName: z.string().optional(),
    image: z.string().optional(),
    phone: z.string().optional(),

});

export const vendorDocumentValidationSchema = z.object({

    documents: z.array(z.string()).min(1, 'At least one document is required'),

});
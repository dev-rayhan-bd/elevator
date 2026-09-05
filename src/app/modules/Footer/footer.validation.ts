import { z } from 'zod';

const socialLinksSchema = z
  .object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional(),
    whatsapp: z.string().optional(),
  })
  .optional();

export const createOrUpdateFooterValidationSchema = z.object({
  companyName: z.string().optional(),
  tagline: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  description: z.string().optional(),
  socialLinks: socialLinksSchema,
});

export const FooterValidations = {
  createOrUpdateFooterValidationSchema,
};

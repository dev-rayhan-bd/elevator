import { z } from 'zod';

const slotTypeEnum = z.enum([
  'hero_main_week',
  'hero_main_month',
]);

// ── Slot Validation (Admin) ──

export const createSlotSchema = z.object({
  slotType: slotTypeEnum,
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or more'),
  durationDays: z.number().min(1, 'Duration must be at least 1 day'),
  dimensions: z.string().optional(),
  maxActive: z.number().min(1).default(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateSlotSchema = z.object({
  slotType: slotTypeEnum.optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  durationDays: z.number().min(1).optional(),
  dimensions: z.string().optional(),
  maxActive: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
});

// ── Banner Validation (Vendor) ──

export const bookBannerSchema = z.object({
  slot: z.string().min(1, 'Slot ID is required'),
  title: z.string().min(1, 'Banner title is required'),
  link: z.string().optional(),
});

export const updateBannerStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const BannerValidations = {
  createSlotSchema,
  updateSlotSchema,
  bookBannerSchema,
  updateBannerStatusSchema,
};

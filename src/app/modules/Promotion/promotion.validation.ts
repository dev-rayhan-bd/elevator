import { z } from 'zod';

const categoryEnum = z.enum(['sponsored', 'featured', 'inspiration', 'verified']);

// ── Promotion Plan Validation (Admin) ──
export const createPromotionPlanSchema = z.object({
  promotionCategory: categoryEnum,
  durationTitle: z.string().min(1, 'Duration title is required'),
  durationDays: z.number().min(1, 'Duration must be at least 1 day'),
  originalPrice: z.number().min(0, 'Original price must be 0 or more'),
  discountPercent: z.number().min(0).max(100, 'Discount percent must be 0-100'),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updatePromotionPlanSchema = z.object({
  promotionCategory: categoryEnum.optional(),
  durationTitle: z.string().min(1).optional(),
  durationDays: z.number().min(1).optional(),
  originalPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ── Vendor Purchase Promotion Validation ──
// Vendor selects a specific plan tier by its ID
export const purchasePromotionSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  service: z.string().optional(),
});

export const PromotionValidations = {
  createPromotionPlanSchema,
  updatePromotionPlanSchema,
  purchasePromotionSchema,
};

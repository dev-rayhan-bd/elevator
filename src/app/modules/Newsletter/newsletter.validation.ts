import { z } from 'zod';

// ── Public: Subscribe to newsletter ──
const subscribeSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

// ── Admin: Add subscriber manually ──
const adminAddSubscriberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.enum(['web', 'admin', 'import']).optional(),
});

// ── Admin: Bulk import subscribers ──
const bulkImportSchema = z.object({
  subscribers: z
    .array(
      z.object({
        email: z.string().email('Invalid email format'),
        name: z.string().optional(),
        phone: z.string().optional(),
      }),
    )
    .min(1, 'At least one subscriber is required')
    .max(500, 'Maximum 500 subscribers per import'),
});

// ── Admin: Update subscriber status ──
const updateSubscriberStatusSchema = z.object({
  status: z.enum(['active', 'unsubscribed', 'blocked']),
});

// ── Admin: Update subscriber details ──
const updateSubscriberSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'unsubscribed', 'blocked']).optional(),
});

export const NewsletterValidations = {
  subscribeSchema,
  adminAddSubscriberSchema,
  bulkImportSchema,
  updateSubscriberStatusSchema,
  updateSubscriberSchema,
};

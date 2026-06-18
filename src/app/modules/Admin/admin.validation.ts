import { z } from 'zod';

export const AdminValidation = {
  createAdminSchema: z.object({
    body: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      password: z.string().min(8),
      role: z.enum(['admin', 'superAdmin']).optional(),
    }),
  }),
  loginSchema: z.object({
    body: z.object({
      identifier: z.string(), // email or phone
      password: z.string(),
    }),
  }),
};
import { z } from 'zod';

export const AdminValidation = {
  createAdminSchema: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      fullName: z.string().optional(),
      email: z.string().email(),
      phone: z.string(),
      password: z.string().min(8),
      role: z.enum(['superAdmin', 'operationsAdmin', 'contentModerator', 'admin']).optional(),
  }),

  loginSchema: z.object({

      identifier: z.string(), // email or phone
      password: z.string(),
  
  }),
   updateProfileSchema: z.object({

      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
   
  }),
  changePasswordSchema: z.object({

      oldPassword: z.string().min(1),
      newPassword: z.string().min(8),
 
  }),
  forgotPasswordSchema: z.object({

      identifier: z.string(), // email or phone

  }),
  resetPasswordSchema: z.object({

      identifier: z.string(),
      otp: z.string().length(6),
      newPassword: z.string().min(8),

  }),
  approveRejectVendorSchema: z.object({
    status: z.enum(['approved', 'rejected']).optional().default('approved'),
    rejectionReason: z.string().optional(),
  }),
};
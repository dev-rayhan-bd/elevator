import { z } from 'zod';

export const AuthValidation = {
  registerUserSchema: z.object({

      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      password: z.string().min(6),
      acceptedTerms: z.literal(true),

  }),
  loginSchema: z.object({

      email: z.string().optional(),
      phone: z.string().optional(),
      password: z.string(),
 
  }),
  phoneLoginRequestSchema: z.object({
   phone: z.string() ,
  }),
  verifyOtpSchema: z.object({
   phone: z.string(), otp: z.string().length(6)
  }),
  changePasswordSchema: z.object({
oldPassword: z.string(), newPassword: z.string().min(6),
  }),
  forgotPasswordSchema: z.object({
    email: z.string().email()
  }),
  resetPasswordSchema: z.object({
    id: z.string(), newPassword: z.string().min(6)
  }),
};
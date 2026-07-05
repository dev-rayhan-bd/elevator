import { z } from 'zod';

export const submitVerificationSchema = z.object({
  documents: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const updateVerificationStatusSchema = z.object({
  status: z.enum(['verified', 'rejected'], {
    required_error: 'Status is required (verified or rejected)',
  }),
  rejectedReason: z.string().optional(),
  notes: z.string().optional(),
});

export const VerificationValidations = {
  submitVerificationSchema,
  updateVerificationStatusSchema,
};

import { z } from 'zod';

export const submitVerificationSchema = z.object({
  documents: z.union([z.array(z.string()), z.string()]).optional(),
  cnicFront: z.string().optional(),
  cnicBack: z.string().optional(),
  ntn: z.string().optional(),
  incorporationCertificate: z.string().optional(),
  businessName: z.string().optional(),
  fullAddress: z.string().optional(),
  ownerName: z.string().optional(),
  registeredPhone: z.string().optional(),
  notes: z.string().optional(),
  businessType: z.string().optional(),
  taxId: z.string().optional(),
  idDocumentType: z.string().optional(),
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

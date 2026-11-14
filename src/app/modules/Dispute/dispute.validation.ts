import { z } from 'zod';

const disputeAboutEnum = [
  'A Vendor',
  'A Customer',
  'Another Vendor',
  'WePlan Expert Service',
  'Other',
] as const;

const issueTypeEnum = [
  'Service Issue',
  'Payment Issue',
  'Communication or Behaviour',
  'Other',
  'service',
  'payment',
  'message',
] as const;

const priorityEnum = ['high', 'medium', 'low'] as const;

const statusEnum = [
  'submitted',
  'under_review',
  'closed',
  'pending',
  'open',
  'resolved',
  'rejected',
] as const;

const createDisputeValidationSchema = z
  .object({
    disputeAbout: z.enum(disputeAboutEnum).optional().default('Other'),
    subject: z.string().min(3, 'Subject must be at least 3 characters').optional(),
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    issueType: z.enum(issueTypeEnum).optional(),
    disputeType: z.enum(issueTypeEnum).optional(),
    otherPartyName: z.string().optional().default(''),
    otherPartyContact: z.string().optional().default(''),
    otherPartyProfileLink: z.string().optional().default(''),
    respondent: z.string().optional(),
    bookingId: z.string().optional(),
    priority: z.enum(priorityEnum).optional().default('medium'),
    description: z
      .string({ required_error: 'Description / explanation is required' })
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description cannot exceed 5000 characters'),
  })
  .refine((data) => data.subject || data.title, {
    message: 'Either subject or title is required',
    path: ['subject'],
  });

const updateDisputeStatusValidationSchema = z.object({
  status: z.enum(statusEnum, { required_error: 'Status is required' }),
  closingResponse: z.string().optional(),
  priority: z.enum(priorityEnum).optional(),
});

const addDisputeResponseValidationSchema = z.object({
  message: z
    .string({ required_error: 'Message is required' })
    .min(1, 'Message cannot be empty')
    .max(3000, 'Message cannot exceed 3000 characters'),
});

const addAdminNoteValidationSchema = z.object({
  note: z
    .string({ required_error: 'Note is required' })
    .min(1, 'Note cannot be empty')
    .max(1000, 'Note cannot exceed 1000 characters'),
});

export const DisputeValidations = {
  createDisputeValidationSchema,
  updateDisputeStatusValidationSchema,
  addDisputeResponseValidationSchema,
  addAdminNoteValidationSchema,
};

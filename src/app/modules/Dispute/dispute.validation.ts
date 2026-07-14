import { z } from 'zod';

const disputeTypeEnum = ['service', 'payment', 'message'] as const;
const priorityEnum = ['high', 'medium', 'low'] as const;
const statusEnum = ['pending', 'open', 'under_review', 'resolved', 'rejected'] as const;

const createDisputeValidationSchema = z.object({
  respondent: z.string({ required_error: 'Respondent ID is required' }),
  bookingId: z.string().optional(),
  disputeType: z.enum(disputeTypeEnum, { required_error: 'Dispute type is required' }),
  priority: z.enum(priorityEnum).optional(),
  title: z
    .string({ required_error: 'Title is required' })
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
});

const updateDisputeStatusValidationSchema = z.object({
  status: z.enum(statusEnum, { required_error: 'Status is required' }),
  priority: z.enum(priorityEnum).optional(),
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
  addAdminNoteValidationSchema,
};

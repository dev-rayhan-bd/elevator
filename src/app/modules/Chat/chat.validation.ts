import { z } from 'zod';

// ── Send message validation ──
export const sendMessageSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  text: z
    .string()
    .max(5000, 'Message cannot exceed 5000 characters')
    .optional(),
  file: z.string().optional(),
  conversationId: z.string().optional(),
});

// ── Get messages query validation (pagination) ──
export const getMessagesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const ChatValidations = {
  sendMessageSchema,
  getMessagesQuerySchema,
};

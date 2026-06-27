import { z } from 'zod';

export const sendQuoteSchema = z.object({
  body: z.object({
    eventRequest: z.string().min(1, 'Event request ID is required'),
    quoteAmount: z.number().min(1, 'Quote amount must be greater than 0'),
    message: z.string().optional(),
    validUntil: z.string().optional(),
  }),
});

export const counterOfferSchema = z.object({
  body: z.object({
    quoteId: z.string().min(1, 'Quote ID is required'),
    amount: z.number().min(1, 'Counter amount must be greater than 0'),
    message: z.string().optional(),
  }),
});

export const updateQuoteStatusSchema = z.object({
  body: z.object({
    status: z.enum(['accepted', 'declined'], {
      required_error: 'Status is required',
    }),
  }),
});

export const markQuoteOutcomeSchema = z.object({
  body: z.object({
    status: z.enum(['won', 'lost'], {
      required_error: 'Status is required (won or lost)',
    }),
  }),
});
export const  EventQuoteValidations={
sendQuoteSchema,counterOfferSchema,updateQuoteStatusSchema,markQuoteOutcomeSchema
}
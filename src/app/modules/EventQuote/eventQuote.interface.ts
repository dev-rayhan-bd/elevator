import { Types } from 'mongoose';

export type TQuoteStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'won' | 'lost';

export interface TQuoteOffer {
  amount: number;
  message?: string;
  sentBy: 'vendor' | 'user';
  createdAt: Date;
}

export interface TEventQuote {
  eventRequest: Types.ObjectId;
  vendor: Types.ObjectId;
  quoteAmount: number;
  message?: string;
  status: TQuoteStatus;
  // Latest counter-offer (when status is 'countered')
  counterOffer?: {
    amount: number;
    message?: string;
    sentBy: 'vendor' | 'user';
  };
  // Full negotiation history
  offers: TQuoteOffer[];
  validUntil?: Date;
}

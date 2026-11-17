import { Types } from 'mongoose';

export type TQuoteStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'won' | 'lost' | 'expired';

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
  displayStatus?: 'active' | 'closed' | 'expired';
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

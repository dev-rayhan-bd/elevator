import { Types } from 'mongoose';

export type TVendorQuoteStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'won' | 'lost';
export type TQuotePricingType = 'fixed' | 'starting from' | 'per head';

export interface TVendorQuoteOffer {
  amount: number;
  message?: string;
  sender: Types.ObjectId;
  pricingType?: TQuotePricingType;
  createdAt: Date;
}

export interface TVendorQuote {
  user: Types.ObjectId;
  vendor: Types.ObjectId;
  service: Types.ObjectId;
  pricingType: TQuotePricingType;
  eventDate: Date;
  guestCount: number;
  message: string;
  budget: number;
  status: TVendorQuoteStatus;
  offers: TVendorQuoteOffer[];
  finalAmount?: number;
  isDeleted: boolean;
}

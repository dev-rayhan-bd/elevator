import { Types } from 'mongoose';

export type TPricingType = 'fixed' | 'starting from' | 'per head';

export interface TVendorService {
  vendor: Types.ObjectId;
  category?: Types.ObjectId;
  subcategory?: Types.ObjectId;
  title?: string;
  description?: string;
  pricingType?: TPricingType;
  price?: number;
  guestCapacity?: number;
  eventTypes?: Types.ObjectId[];
  serviceAreas?: Types.ObjectId[];
  amenities?: Types.ObjectId[];
  customAmenities?: string[];
  images?: string[];
  termsAndCondition?: string;
  isActive: boolean;
  isDraft?: boolean;
  entireCity?: boolean;
    location?: {
    lat: number;
    long: number;
    address?: string;
  };
}

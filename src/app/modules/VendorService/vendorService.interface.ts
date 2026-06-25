import { Types } from 'mongoose';

export type TPricingType = 'fixed' | 'hourly' | 'negotiable';

export interface TVendorService {
  vendor: Types.ObjectId;
  category: Types.ObjectId;
  subcategory: Types.ObjectId;
  title: string;
  description: string;
  pricingType: TPricingType;
  price: number;
  discountedPrice?: number;
  amenities: Types.ObjectId[];
  serviceAreas: Types.ObjectId[];
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
}

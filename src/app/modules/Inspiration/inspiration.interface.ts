import { Types } from 'mongoose';

export interface TInspiration {
  title: string;
  description: string;
  image: string;
  price: string; // "PKR 45,000" or "PKR 2,500/guest"
  vendor: Types.ObjectId;
  isActive: boolean;
}

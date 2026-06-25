import { Types } from 'mongoose';

export interface TAmenity {
  name: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  category?: Types.ObjectId;
  subcategory?: Types.ObjectId;
}

import { Types } from 'mongoose';

export interface TServiceSubcategory {
  name: string;
  category: Types.ObjectId;
  description?: string;
  image?: string;
  isActive: boolean;
}

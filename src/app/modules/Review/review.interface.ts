import { Types } from 'mongoose';

export interface TReview {
  user: Types.ObjectId;
  vendor: Types.ObjectId;
  service: Types.ObjectId; // VendorService reference — review tied to a specific service
  rating: number; // 1-5
  comment: string;
  isDeleted: boolean;
}
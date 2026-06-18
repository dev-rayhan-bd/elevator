import { Types } from 'mongoose';

export interface TReview {
  user: Types.ObjectId;
  vendor: Types.ObjectId;
  rating: number; // 1-5
  comment: string;
  isDeleted: boolean;
}
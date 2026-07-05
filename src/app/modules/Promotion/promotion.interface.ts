import { Types } from 'mongoose';

export type TPromotionCategory = 'sponsored' | 'featured' | 'inspiration' | 'verified';
export type TPromotionStatus = 'active' | 'expired' | 'cancelled';
export type TPaymentStatus = 'pending' | 'paid' | 'refunded';

export interface TPromotionPlanConfig {
  promotionCategory: TPromotionCategory;
  durationTitle: string; // e.g., '1 Month', '3 Months'
  durationDays: number;
  originalPrice: number;
  discountPercent: number; // e.g., 20 = 20% off
  price: number; // Final price = originalPrice - (originalPrice * discountPercent / 100)
  isPopular?: boolean; // "Most Popular" badge
  isActive: boolean;
}

export interface TVendorPromotion {
  vendor: Types.ObjectId;
  service?: Types.ObjectId; // null = promotes whole vendor profile
  plan: Types.ObjectId; // ref: 'PromotionPlan' - the specific tier purchased
  promotionCategory: TPromotionCategory; // denormalized for flag syncing & filtering
  startDate: Date;
  endDate: Date;
  price: number;
  discountPrice?: number;
  isActive: boolean;
  status: TPromotionStatus;
  paymentStatus: TPaymentStatus;
  isPostCreated: boolean; // For inspiration tracking — admin marks when blog post is created
}

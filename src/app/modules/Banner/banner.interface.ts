import { Types } from 'mongoose';

export type TBannerSlotType =
  | 'hero_main_week'
  | 'hero_main_month';


export type TBannerStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface TBannerSlot {
  slotType: TBannerSlotType;
  title: string;
  description?: string;
  price: number;
  durationDays: number;
  dimensions?: string;
  maxActive: number;
  isActive: boolean;
}

export interface TBannerTracking {
  banner: Types.ObjectId;
  ip: string;
  type: 'impression' | 'click';
  createdAt: Date;
}

export interface TBanner {
  vendor: Types.ObjectId;
  slot: Types.ObjectId;
  title: string;
  image: string;
  link?: string;
  startDate: Date;
  endDate: Date;
  price: number;
  status: TBannerStatus;
  isActive: boolean;
  impressions: number;
  clicks: number;
}

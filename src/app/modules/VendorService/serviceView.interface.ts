import { Types } from 'mongoose';

export type TServiceViewType = 'profile' | 'service' | 'package';

export interface TServiceView {
  vendor: Types.ObjectId;
  service?: Types.ObjectId;
  package?: Types.ObjectId;
  user?: Types.ObjectId;
  type: TServiceViewType;
  ip?: string;
  userAgent?: string;
  referrer?: string;
  isUnique: boolean;
  createdAt?: Date;
}

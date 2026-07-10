import { Types } from 'mongoose';

export type TLeadClickType = 'whatsapp' | 'phone' | 'message';

export interface TLeadClick {
  vendor: Types.ObjectId;
  type: TLeadClickType;
  user?: Types.ObjectId;
  createdAt?: Date;
}

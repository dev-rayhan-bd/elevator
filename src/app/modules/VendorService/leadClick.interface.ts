import { Types } from 'mongoose';

export type TLeadClickType = 'whatsapp' | 'phone' | 'message';
export type TLeadClickPageSource = 'profile_page' | 'package_details' | 'portfolio_gallery' | 'pricing_page' | 'contact_page' | 'service_page' | 'other';
export type TLeadClickStatus = 'clicked_only' | 'converted';

export interface TLeadClick {
  vendor: Types.ObjectId;
  type: TLeadClickType;
  user?: Types.ObjectId;
  service?: Types.ObjectId;
  pageSource?: TLeadClickPageSource;
  status: TLeadClickStatus;
  createdAt?: Date;
}

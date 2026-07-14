import { Types } from 'mongoose';

export type TDisputeType = 'service' | 'payment' | 'message';
export type TPriority = 'high' | 'medium' | 'low';
export type TDisputeStatus = 'pending' | 'open' | 'under_review' | 'resolved' | 'rejected';

export interface TAdminNote {
  admin: Types.ObjectId;
  note: string;
  createdAt: Date;
}

export interface TDispute {
  disputeId: string;
  disputer: Types.ObjectId;
  respondent: Types.ObjectId;
  bookingId?: string;
  disputeType: TDisputeType;
  priority: TPriority;
  title: string;
  description: string;
  evidence: string[];
  status: TDisputeStatus;
  adminNotes: TAdminNote[];
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

import { Types } from 'mongoose';

export type TDisputeAbout =
  | 'A Vendor'
  | 'A Customer'
  | 'Another Vendor'
  | 'WePlan Expert Service'
  | 'Other';

export type TIssueType =
  | 'Service Issue'
  | 'Payment Issue'
  | 'Communication or Behaviour'
  | 'Other'
  | 'service'
  | 'payment'
  | 'message';

export type TDisputeType = TIssueType;
export type TPriority = 'high' | 'medium' | 'low';

export type TDisputeStatus =
  | 'submitted'
  | 'under_review'
  | 'closed'
  | 'pending'
  | 'open'
  | 'resolved'
  | 'rejected';

export interface TAdminNote {
  admin: Types.ObjectId;
  note: string;
  createdAt: Date;
}

export interface TDisputeResponse {
  _id?: Types.ObjectId;
  sender: Types.ObjectId;
  senderRole: 'admin' | 'superAdmin' | 'user' | 'vendor';
  senderName: string;
  message: string;
  attachments: string[];
  createdAt: Date;
}

export interface TDispute {
  disputeId: string;
  disputer: Types.ObjectId;
  respondent?: Types.ObjectId;
  disputeAbout: TDisputeAbout;
  subject: string;
  title?: string;
  issueType: TIssueType;
  disputeType?: TDisputeType;
  otherPartyName?: string;
  otherPartyContact?: string;
  otherPartyProfileLink?: string;
  bookingId?: string;
  priority?: TPriority;
  description: string;
  evidence: string[];
  status: TDisputeStatus;
  closingResponse?: string;
  closedAt?: Date;
  closedBy?: Types.ObjectId;
  responses: TDisputeResponse[];
  adminNotes: TAdminNote[];
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

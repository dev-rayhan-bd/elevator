import { Types } from 'mongoose';

export type TVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface TVerification {
  vendor: Types.ObjectId;
  documents: string[];
  status: TVerificationStatus;
  notes?: string;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  rejectedReason?: string;
}

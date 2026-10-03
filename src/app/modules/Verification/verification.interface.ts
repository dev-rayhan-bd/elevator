import { Types } from 'mongoose';

export type TVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface TVerification {
  vendor: Types.ObjectId;
  documents: string[]; // fallback or extra docs
  cnicFront?: string;
  cnicBack?: string;
  ntn?: string;
  incorporationCertificate?: string;
  businessName?: string;
  fullAddress?: string;
  ownerName?: string;
  registeredPhone?: string;
  status: TVerificationStatus;
  notes?: string;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  rejectedReason?: string;
}

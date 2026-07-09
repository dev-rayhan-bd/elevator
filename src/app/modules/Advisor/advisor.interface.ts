import { Types, Document } from 'mongoose';

// ── Advisor Service (Admin-configurable service type) ──

export type TAdvisorServiceStatus = 'active' | 'inactive';

export interface IAdvisorService {
  name: string;
  description: string;
  price: number;
  isActive: boolean;
}

// ── Advisor Booking (User hiring an advisor) ──

export type TAdvisorBookingStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TPaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface IAdvisorBooking extends Document {
  user: Types.ObjectId;
  advisorService: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  weddingDate: Date;
  weddingLocation: string;
  budget: number;
  guestCount: number;
  specialRequirements?: string;
  status: TAdvisorBookingStatus;
  paymentStatus: TPaymentStatus;
  assignedAssociate?: Types.ObjectId;
  assignedAt?: Date;
  completedAt?: Date;
  cancellationReason?: string;
  adminNotes?: string;
}

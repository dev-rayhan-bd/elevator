import { Types, Document } from 'mongoose';

// ── Advisor Service (Admin-configurable service type) ──

export type TAdvisorServiceStatus = 'active' | 'inactive';

export interface IAdvisorService {
  name: string;
  description: string;
  price: number;
  durationDays: number;
  features: string[];
  image?: string;
  isActive: boolean;
}

// ── Advisor Booking (User hiring an advisor) ──

export type TAdvisorBookingStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface IAdvisorBooking extends Document {
  user: Types.ObjectId;
  advisorService: Types.ObjectId;
  eventDate: Date;
  eventType: Types.ObjectId;
  guestCount: number;
  budget: number;
  area: Types.ObjectId;
  specialRequirements?: string;
  status: TAdvisorBookingStatus;
  assignedAssociate?: Types.ObjectId;
  assignedAt?: Date;
  completedAt?: Date;
  cancellationReason?: string;
  adminNotes?: string;
}

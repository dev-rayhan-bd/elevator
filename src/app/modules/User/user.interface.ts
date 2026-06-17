import { Model, Types } from 'mongoose';

export type TUserRole = 'user' | 'vendor' | 'admin' | 'superAdmin';
export type TUserStatus = 'pending' | 'active' | 'blocked';

export interface TVendorDetails {
  businessName: string;
  ownerName: string;
  whatsappNumber?: string;
  location: string;
  businessDetails: string;
  experienceYears: number;
  socialLinks?: { instagram?: string; facebook?: string; website?: string };
  categories: string[];
  documents: string[];
  isVerifiedBadge: boolean;
}

export interface TUser {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  image?: string;
  role: TUserRole;
  status: TUserStatus;
  isPhoneVerified: boolean;
  otp?: string | null;
  otpExpires?: Date | null;
  acceptedTerms: boolean;
  vendor?: TVendorDetails;
  isDeleted: boolean;
  isOtpVerified: boolean;

}

export interface IUserMethods {
  isPasswordMatched(plainTextPassword: string, hashedPassword: string): Promise<boolean>;
}

export type TUserModel = Model<TUser, Record<string, never>, IUserMethods>;
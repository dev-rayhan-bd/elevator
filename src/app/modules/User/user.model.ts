import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import config from '../../config';
import { IUserMethods, TUser, TUserModel } from './user.interface';

const userSchema = new Schema<TUser, TUserModel, IUserMethods>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: 0 },
    image: { type: String, default: '' },
    role: { type: String, enum: ['user', 'vendor', 'admin', 'superAdmin'], default: 'user' },
    status: { type: String, enum: ['pending', 'active', 'blocked'], default: 'active' },
    isPhoneVerified: { type: Boolean, default: false },
    otp: { type: String, select: 0 }, 
    otpExpires: { type: Date, select: 0 },
    acceptedTerms: { type: Boolean, required: true },
    isDeleted: { type: Boolean, default: false },
    vendor: {
      businessName: String,
      ownerName: String,
      whatsappNumber: String,
      location: String,
      businessDetails: String,
      experienceYears: Number,
      socialLinks: { instagram: String, facebook: String, website: String },
      categories: [String],
      documents: [String],
      isVerifiedBadge: { type: Boolean, default: false },
       isOtpVerified: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);


userSchema.pre('save', async function (next) {
  const saltRounds = Number(config.bcrypt_salt_rounds);


  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password as string, saltRounds);
  }

  if (this.isModified('otp') && this.otp) {
    this.otp = await bcrypt.hash(this.otp as string, saltRounds);
  }


  this.fullName = `${this.firstName} ${this.lastName}`;
  
  next();
});


userSchema.methods.isPasswordMatched = async function (
  plain: string, 
  hashed: string
): Promise<boolean> {
  return await bcrypt.compare(plain, hashed);
};

export const User = model<TUser, TUserModel>('User', userSchema);
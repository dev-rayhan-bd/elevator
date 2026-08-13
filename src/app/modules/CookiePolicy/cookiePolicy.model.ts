import mongoose from 'mongoose';
import { ICookiePolicy } from './CookiePolicy.interface';

export const cookiePolicySchema = new mongoose.Schema<ICookiePolicy>(
  {
    cookiePolicy: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

const CookiePolicy = mongoose.model<ICookiePolicy>('CookiePolicy', cookiePolicySchema);
export default CookiePolicy;

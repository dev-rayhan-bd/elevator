import mongoose from 'mongoose';
import { IFooter } from './Footer.interface';

export const footerSchema = new mongoose.Schema<IFooter>(
  {
    companyName: { type: String, default: '' },
    tagline: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    description: { type: String, default: '' },
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      youtube: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  },
);

const Footer = mongoose.model<IFooter>('Footer', footerSchema);
export default Footer;

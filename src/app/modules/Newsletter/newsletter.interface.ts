import { Types, Document } from 'mongoose';

export type TNewsletterStatus = 'active' | 'unsubscribed' | 'blocked';

export interface INewsletter extends Document {
  email: string;
  name?: string;
  phone?: string;
  user?: Types.ObjectId; // linked if registered user subscribes
  status: TNewsletterStatus;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  source: 'web' | 'admin' | 'import';
  tags?: string[];
  isDeleted: boolean;
}

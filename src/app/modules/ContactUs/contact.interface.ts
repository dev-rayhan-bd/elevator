export type TContactStatus = 'pending' | 'replied' | 'closed';

export interface TContactUs {
  email: string;
  subject: string;
  message: string;
  status: TContactStatus;
  replyMessage?: string;
  repliedAt?: Date;
  repliedBy?: string; // admin's email or ID who replied
}

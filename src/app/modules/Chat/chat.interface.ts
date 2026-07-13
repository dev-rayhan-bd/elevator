import { Types } from 'mongoose';

export interface TConversation {
  participants: Types.ObjectId[];
  lastMessage: string;
  lastMessageSender: Types.ObjectId;
  lastMessageAt?: Date;
  unreadCount: Record<string, number>;
}

export interface TMessage {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  text?: string;
  file?: string;
  isRead: boolean;
}

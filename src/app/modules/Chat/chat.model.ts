import { Schema, model } from 'mongoose';
import { TConversation, TMessage } from './chat.interface';

// ── Conversation Schema ──
const conversationSchema = new Schema<TConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: { type: String, default: '' },
    lastMessageSender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessageAt: { type: Date },
    unreadCount: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

// Index for efficient sidebar queries: find conversations for a user sorted by recent
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// ── Message Schema ──
const messageSchema = new Schema<TMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    file: { type: String, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Index for loading messages of a conversation with pagination
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Conversation = model<TConversation>('Conversation', conversationSchema);
export const Message = model<TMessage>('Message', messageSchema);

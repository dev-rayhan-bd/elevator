import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Conversation, Message } from './chat.model';

// ── Helper: sanitize text to prevent XSS ──
const sanitizeText = (text?: string): string => {
  if (!text) return '';
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
};

// ══════════════════════════════════════════════
//  GET CONVERSATIONS (Sidebar)
// ══════════════════════════════════════════════

const getConversationsFromDB = async (userId: string) => {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate({
      path: 'participants',
      select: 'firstName lastName image isOnline role',
    })
    .sort({ updatedAt: -1 });

  const sidebarData = conversations.map((conv) => {
    const convDoc = conv as any;
    const otherParticipant = (convDoc.participants as any[]).find(
      (p: any) => p._id.toString() !== userId,
    );

    return {
      _id: convDoc._id,
      otherParticipant: otherParticipant
        ? {
            _id: otherParticipant._id,
            firstName: otherParticipant.firstName,
            lastName: otherParticipant.lastName,
            image: otherParticipant.image,
            isOnline: otherParticipant.isOnline,
            role: otherParticipant.role,
          }
        : null,
      lastMessage: convDoc.lastMessage,
      lastMessageSender: convDoc.lastMessageSender,
      lastMessageAt: convDoc.lastMessageAt || convDoc.updatedAt,
      unreadCount: (convDoc.unreadCount as Map<string, number>).get(userId) || 0,
      updatedAt: convDoc.updatedAt,
    };
  });

  return sidebarData;
};

// ══════════════════════════════════════════════
//  GET MESSAGES (Chat History)
// ══════════════════════════════════════════════

const getMessagesFromDB = async (
  conversationId: string,
  userId: string,
  query: { page?: string; limit?: string },
) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
  const skip = (page - 1) * limit;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  const messages = await Message.find({ conversationId })
    .populate('sender', 'firstName lastName image')
    .populate('receiver', 'firstName lastName image')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({ conversationId });

  return {
    messages: messages.reverse(),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ══════════════════════════════════════════════
//  FIND OR CREATE CONVERSATION
// ══════════════════════════════════════════════

const findOrCreateConversation = async (
  userId: string,
  receiverId: string,
  existingConversationId?: string,
) => {
  if (existingConversationId) {
    const conversation = await Conversation.findById(existingConversationId);
    if (!conversation) {
      throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
    }
    return conversation;
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [userId, receiverId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId, receiverId],
      lastMessage: '',
      lastMessageSender: new Types.ObjectId(userId),
      lastMessageAt: new Date(),
      unreadCount: {},
    });
  }

  return conversation;
};

// ══════════════════════════════════════════════
//  SEND MESSAGE & SAVE (returns populated message + conversation)
// ══════════════════════════════════════════════

const sendAndSaveMessage = async (
  senderId: string,
  receiverId: string,
  text?: string,
  file?: string,
  existingConversationId?: string,
) => {
  const sanitizedText = sanitizeText(text);
  const displayText = sanitizedText || (file ? '📎 Image' : '');

  // Find or create conversation
  const conversation = await findOrCreateConversation(
    senderId,
    receiverId,
    existingConversationId,
  );

  // Update conversation metadata
  const lastMessageAt = new Date();
  conversation.lastMessage = displayText;
  conversation.lastMessageSender = new Types.ObjectId(senderId);
  conversation.lastMessageAt = lastMessageAt;

  // ── Sender-aware unreadCount: ONLY increment receiver's count ──
  const unreadMap = conversation.unreadCount as unknown as Map<string, number>;
  const currentReceiverCount = unreadMap.get(receiverId) || 0;
  unreadMap.set(receiverId, currentReceiverCount + 1);
  conversation.markModified('unreadCount');

  await conversation.save();

  // Create message document
  const message = await Message.create({
    conversationId: conversation._id,
    sender: new Types.ObjectId(senderId),
    receiver: new Types.ObjectId(receiverId),
    text: sanitizedText,
    file: file || null,
    isRead: false,
  });

  // Populate sender/receiver details
  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'firstName lastName image')
    .populate('receiver', 'firstName lastName image');

  return {
    message: populatedMessage!,
    conversationId: conversation._id,
    lastMessageAt,
    displayText,
  };
};

// ══════════════════════════════════════════════
//  CREATE OR GET CONVERSATION (lightweight)
// ══════════════════════════════════════════════

const createOrGetConversationOnly = async (userId: string, receiverId: string) => {
  const conversation = await findOrCreateConversation(userId, receiverId);
  return conversation;
};

// ══════════════════════════════════════════════
//  MARK MESSAGES AS READ
// ══════════════════════════════════════════════

const markMessagesAsReadInDB = async (conversationId: string, userId: string) => {
  await Message.updateMany(
    { conversationId, receiver: userId, isRead: false },
    { $set: { isRead: true } },
  );

  // Reset only this user's unread count
  const conversation = await Conversation.findById(conversationId);
  if (conversation) {
    const unreadMap = conversation.unreadCount as unknown as Map<string, number>;
    unreadMap.set(userId, 0);
    conversation.markModified('unreadCount');
    await conversation.save();
  }

  return { message: 'Messages marked as read' };
};

export const ChatServices = {
  getConversationsFromDB,
  getMessagesFromDB,
  findOrCreateConversation,
  sendAndSaveMessage,
  createOrGetConversationOnly,
  markMessagesAsReadInDB,
};

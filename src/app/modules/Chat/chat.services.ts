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

  const userObjId = new Types.ObjectId(userId);

  const sidebarData = await Promise.all(
    conversations.map(async (conv) => {
      const convDoc = conv as any;
      const otherParticipant = (convDoc.participants as any[]).find(
        (p: any) => p._id.toString() !== userId,
      );

      // Dynamically calculate unread count from actual unread messages for THIS user
      const unread = await Message.countDocuments({
        conversationId: conv._id,
        receiver: userObjId,
        isRead: false,
      });

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
        unreadCount: unread,
        updatedAt: convDoc.updatedAt,
      };
    }),
  );

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

  const convId = conversation._id.toString();
  const lastMessageAt = new Date();

  // Atomically update conversation metadata + increment receiver's unreadCount in DB
  await Conversation.collection.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: displayText,
        lastMessageSender: new Types.ObjectId(senderId),
        lastMessageAt,
      },
      $inc: {
        [`unreadCount.${receiverId}`]: 1,
      },
    },
  );

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

  // Calculate receiver's total unread messages in this conversation
  const receiverUnreadCount = await Message.countDocuments({
    conversationId: conversation._id,
    receiver: new Types.ObjectId(receiverId),
    isRead: false,
  });

  return {
    message: populatedMessage!,
    conversationId: conversation._id,
    lastMessageAt,
    displayText,
    receiverUnreadCount,
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
  const convObjectId = new Types.ObjectId(conversationId);
  const userObjectId = new Types.ObjectId(userId);

  // Update all unread messages received by this user in this conversation
  await Message.collection.updateMany(
    {
      conversationId: convObjectId,
      receiver: userObjectId,
    },
    { $set: { isRead: true } },
  );

  // Directly set this user's unread count to 0 in MongoDB collection
  await Conversation.collection.updateOne(
    { _id: convObjectId },
    {
      $set: {
        [`unreadCount.${userId}`]: 0,
      },
    },
  );

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

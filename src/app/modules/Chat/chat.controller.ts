import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import uploadImage from '../../middleware/upload';
import { ChatServices } from './chat.services';

// ══════════════════════════════════════════════
//  GET CONVERSATIONS (Sidebar)
// ══════════════════════════════════════════════

const getConversations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await ChatServices.getConversationsFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversations retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  GET MESSAGES (Chat History)
// ══════════════════════════════════════════════

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { conversationId } = req.params;
  const result = await ChatServices.getMessagesFromDB(
    conversationId,
    userId,
    req.query as { page?: string; limit?: string },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  MARK MESSAGES AS READ
// ══════════════════════════════════════════════

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { conversationId } = req.params;
  const result = await ChatServices.markMessagesAsReadInDB(conversationId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages marked as read',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  UPLOAD CHAT IMAGES (multiple)
// ══════════════════════════════════════════════

const uploadChatImages = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please upload at least one image');
  }

  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadImage(req, file);
    urls.push(url);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${urls.length} image(s) uploaded successfully`,
    data: { urls },
  });
});

export const ChatControllers = {
  getConversations,
  getMessages,
  markAsRead,
  uploadChatImages,
};

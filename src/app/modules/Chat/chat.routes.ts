import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { ChatControllers } from './chat.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();
const uploadMultipleImages = upload.array('images', 10) as unknown as RequestHandler;

// ══════════════════════════════════════════════
//  CHAT ROUTES
// ══════════════════════════════════════════════

// Get all conversations (sidebar) — any authenticated user
router.get(
  '/conversations',
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.admin, USER_ROLE.superAdmin),
  ChatControllers.getConversations,
);

// Get messages for a specific conversation
router.get(
  '/messages/:conversationId',
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.admin, USER_ROLE.superAdmin),
  ChatControllers.getMessages,
);

// Mark messages as read in a conversation
router.patch(
  '/messages/read/:conversationId',
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.admin, USER_ROLE.superAdmin),
  ChatControllers.markAsRead,
);

// Upload chat images → returns array of URLs to send via socket
router.post(
  '/upload',
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.admin, USER_ROLE.superAdmin),
  uploadMultipleImages,
  ChatControllers.uploadChatImages,
);

export const ChatRoutes = router;

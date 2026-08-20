/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';


import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { contactControllers } from './contact.controller';

const router = express.Router();

// Public route to send a message
router.post('/send-message', contactControllers.sendMessage);

// ── Admin Routes ──
router.get(
  '/admin/messages',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  contactControllers.getAllMessages
);

router.get(
  '/admin/messages/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  contactControllers.getSingleMessage
);

router.patch(
  '/admin/messages/:id/reply',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  contactControllers.replyToMessage
);

router.delete(
  '/admin/messages/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  contactControllers.deleteMessage
);

export const ContactRoutes = router;

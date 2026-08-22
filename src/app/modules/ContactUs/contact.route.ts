/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';


import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { contactControllers } from './contact.controller';

const router = express.Router();

/**
 * @swagger
 * /contact/send-message:
 *   post:
 *     summary: Send a contact message
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
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

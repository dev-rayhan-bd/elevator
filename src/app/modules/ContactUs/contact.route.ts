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
router.post('/send-message',
  /*
    #swagger.tags = ['Contact']
    #swagger.summary = 'Send contact message'
    #swagger.description = 'Public contact us message submission.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Jane Smith',
        $email: 'jane@example.com',
        $subject: 'Inquiry about vendor registration',
        $message: 'Hello, I have a question regarding listing my venue service.'
      }
    }
  */
  contactControllers.sendMessage
);

// ── Admin Routes ──
router.get(
  '/admin/messages',
  /*
    #swagger.tags = ['Contact']
    #swagger.summary = 'Get all contact messages (Admin)'
  */
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  contactControllers.getAllMessages
);

router.get(
  '/admin/messages/:id',
  /*
    #swagger.tags = ['Contact']
    #swagger.summary = 'Get single contact message (Admin)'
  */
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  contactControllers.getSingleMessage
);

router.patch(
  '/admin/messages/:id/reply',
  /*
    #swagger.tags = ['Contact']
    #swagger.summary = 'Reply to contact message (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $replyMessage: 'Thank you for reaching out. Here are the instructions...'
      }
    }
  */
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  contactControllers.replyToMessage
);

router.delete(
  '/admin/messages/:id',
  /*
    #swagger.tags = ['Contact']
    #swagger.summary = 'Delete contact message (Admin)'
  */
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  contactControllers.deleteMessage
);

export const ContactRoutes = router;

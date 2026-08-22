import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import { upload } from '../../middleware/multer';
import { USER_ROLE } from '../Auth/auth.constant';
import { NotificationControllers } from './notification.controller';

const router = express.Router();
const uploadImage = upload.single('image') as unknown as RequestHandler;


router.get(
  '/', 
  /*
    #swagger.tags = ['Notification']
    #swagger.summary = 'Get my notifications'
  */
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin), 
  NotificationControllers.getMyNotifications
);

 //(Mark All as Read)
router.patch(
  '/mark-all-read',
  /*
    #swagger.tags = ['Notification']
    #swagger.summary = 'Mark all notifications as read'
  */
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.markAllAsRead
);


router.patch(
  '/mark-read/:id',
  /*
    #swagger.tags = ['Notification']
    #swagger.summary = 'Mark single notification as read'
  */
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.markSingleAsRead
);

// ── Admin: Broadcast Notification (FormData with image upload) ──
router.post(
  '/admin/broadcast',
  /*
    #swagger.tags = ['Notification']
    #swagger.summary = 'Broadcast notification to all users (Admin)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $title: 'System Maintenance Notice',
        $message: 'We will be performing scheduled maintenance tonight at 2 AM EST.',
        targetRole: 'all'
      }
    }
  */
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  uploadImage,
  NotificationControllers.broadcastNotification,
);

export const NotificationRoutes = router;
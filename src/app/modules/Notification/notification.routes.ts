import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { NotificationControllers } from './notification.controller';

const router = express.Router();


router.get(
  '/', 
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin), 
  NotificationControllers.getMyNotifications
);

 //(Mark All as Read)
router.patch(
  '/mark-all-read',
   auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.markAllAsRead
);


router.patch(
  '/mark-read/:id',
   auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.markSingleAsRead
);

// ── Admin: Broadcast Notification ──
router.post(
  '/admin/broadcast',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.broadcastNotification,
);

export const NotificationRoutes = router;
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

router.get(
  '/unread-count',
  /*
    #swagger.tags = ['Notification']
    #swagger.summary = 'Get unread notification count'
  */
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.getUnreadCount
);

 // ── Mark All as Read (supporting patch, put, post & common route aliases) ──
const markAllHandlers = [
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.markAllAsRead,
];

router.patch('/mark-all-read', ...markAllHandlers);
router.put('/mark-all-read', ...markAllHandlers);
router.post('/mark-all-read', ...markAllHandlers);

router.patch('/mark-all-as-read', ...markAllHandlers);
router.put('/mark-all-as-read', ...markAllHandlers);
router.post('/mark-all-as-read', ...markAllHandlers);

router.patch('/mark-as-read', ...markAllHandlers);
router.put('/mark-as-read', ...markAllHandlers);
router.post('/mark-as-read', ...markAllHandlers);

// ── Mark Single as Read (supporting patch, put, post & common route aliases) ──
const markSingleHandlers = [
  auth(USER_ROLE.user, USER_ROLE.vendor, USER_ROLE.superAdmin, USER_ROLE.admin),
  NotificationControllers.markSingleAsRead,
];

router.patch('/mark-read/:id', ...markSingleHandlers);
router.put('/mark-read/:id', ...markSingleHandlers);
router.post('/mark-read/:id', ...markSingleHandlers);

router.patch('/mark-as-read/:id', ...markSingleHandlers);
router.put('/mark-as-read/:id', ...markSingleHandlers);
router.post('/mark-as-read/:id', ...markSingleHandlers);

router.patch('/:id/read', ...markSingleHandlers);
router.put('/:id/read', ...markSingleHandlers);
router.post('/:id/read', ...markSingleHandlers);

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

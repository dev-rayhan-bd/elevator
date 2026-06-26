import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { EventTypeControllers } from './eventType.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();

// Public
router.get('/', EventTypeControllers.getAllEventTypes);
router.get('/all', EventTypeControllers.getAllEventTypesList);
router.get('/:id', EventTypeControllers.getSingleEventType);

// Admin only
router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  EventTypeControllers.createEventType,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  EventTypeControllers.updateEventType,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  EventTypeControllers.deleteEventType,
);

export const EventTypeRoutes = router;

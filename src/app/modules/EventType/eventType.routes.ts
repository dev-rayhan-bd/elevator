import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { EventTypeControllers } from './eventType.controller';
import { upload } from '../../middleware/multer';
import validateRequest from '../../middleware/validateRequest';
import { EventTypeValidations } from './eventType.validation';

const router = express.Router();

// Public
router.get('/',
  /*
    #swagger.tags = ['EventType']
    #swagger.summary = 'Get all event types'
  */
  EventTypeControllers.getAllEventTypes
);
router.get('/all',
  /*
    #swagger.tags = ['EventType']
    #swagger.summary = 'Get event types list'
  */
  EventTypeControllers.getAllEventTypesList
);
router.get('/:id',
  /*
    #swagger.tags = ['EventType']
    #swagger.summary = 'Get single event type'
  */
  EventTypeControllers.getSingleEventType
);

// Admin only
router.post(
  '/',
  /*
    #swagger.tags = ['EventType']
    #swagger.summary = 'Create new event type'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $name: 'Wedding Ceremony',
        description: 'Complete wedding planning and setup'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  EventTypeControllers.createEventType,
);

router.patch(
  '/reorder',
  /*
    #swagger.tags = ['EventType']
    #swagger.summary = 'Reorder event types'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        orders: [
          { id: '60d0fe4f5311236168a109ca', order: 1 },
          { id: '60d0fe4f5311236168a109cb', order: 2 }
        ]
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(EventTypeValidations.reorderEventTypesSchema),
  EventTypeControllers.reorderEventTypes,
);

router.patch(
  '/:id',
  /*
    #swagger.tags = ['EventType']
    #swagger.summary = 'Update event type'
    #swagger.parameters['body'] = {
      in: 'body',
      schema: {
        name: 'Updated Wedding Ceremony'
      }
    }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('image') as any,
  EventTypeControllers.updateEventType,
);

router.delete(
  '/:id',
  /*
    #swagger.tags = ['EventType']
    #swagger.summary = 'Delete event type'
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  EventTypeControllers.deleteEventType,
);

export const EventTypeRoutes = router;

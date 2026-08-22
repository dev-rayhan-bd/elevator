import express, { RequestHandler } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { EventRequestControllers } from './eventRequest.controller';
import { upload } from '../../middleware/multer';

const router = express.Router();

const uploadImages = upload.array('referenceImages', 5) as unknown as RequestHandler;

// ── User Routes ──

// Post a new event requirement
router.post(
  '/',
  /*
    #swagger.tags = ['EventRequest']
    #swagger.summary = 'Create new event request'
    #swagger.description = 'Submit an event requirement post for vendors to submit quotes.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $eventTypeId: '60d5ecb8b5c9c123456789ab',
        $eventDate: '2026-12-25',
        $location: 'New York, NY',
        $budget: 5000,
        guestCount: 150,
        description: 'Wedding reception planning and decoration'
      }
    }
  */
  auth(USER_ROLE.user),
  uploadImages,
  EventRequestControllers.createEventRequest,
);

// Get my own event requests
router.get(
  '/my-requests',
  /*
    #swagger.tags = ['EventRequest']
    #swagger.summary = 'Get my event requests'
  */
  auth(USER_ROLE.user),
  EventRequestControllers.getMyEventRequests,
);

// Get single event request detail (own only)
router.get(
  '/my-requests/:id',
  /*
    #swagger.tags = ['EventRequest']
    #swagger.summary = 'Get single event request details'
  */
  auth(USER_ROLE.user),
  EventRequestControllers.getSingleEventRequest,
);

// Update event request status (close/cancel)
router.patch(
  '/my-requests/:id/status',
  /*
    #swagger.tags = ['EventRequest']
    #swagger.summary = 'Update event request status'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $status: 'closed'
      }
    }
  */
  auth(USER_ROLE.user),
  EventRequestControllers.updateEventRequestStatus,
);

// Cancel an event request (dedicated endpoint)
router.patch(
  '/my-requests/:id/cancel',
  /*
    #swagger.tags = ['EventRequest']
    #swagger.summary = 'Cancel event request'
  */
  auth(USER_ROLE.user),
  EventRequestControllers.cancelEventRequest,
);

// ── Vendor Routes ──

// Get all active event requests (for bidding - All Posts)
router.get(
  '/all',
  /*
    #swagger.tags = ['EventRequest']
    #swagger.summary = 'Get active event requests (Vendor marketplace)'
  */
  auth(USER_ROLE.vendor),
  EventRequestControllers.getAllActiveEventRequests,
);

// Get single event request detail for vendor (before sending quote)
router.get(
  '/vendor/:id',
  /*
    #swagger.tags = ['EventRequest']
    #swagger.summary = 'Get event request details for vendor'
  */
  auth(USER_ROLE.vendor),
  EventRequestControllers.getEventRequestDetailForVendor,
);

export const EventRequestRoutes = router;

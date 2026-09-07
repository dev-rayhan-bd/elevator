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

// ── Admin Routes ──

// Get all user requirements with quote counts & summary statistics (Admin Panel)
router.get(
  '/admin/all-requirements',
  /*
    #swagger.tags = ['EventRequest']
    #swagger.summary = 'Get all user requirements with quotation counts (Admin)'
    #swagger.description = 'Retrieve all requirements posted by users along with bid/quotation counts for each requirement.'
    #swagger.parameters['searchTerm'] = { in: 'query', description: 'Multi-field search (name, email, phone, details, category, eventType, area)', type: 'string' }
    #swagger.parameters['status'] = { in: 'query', description: 'Filter by status: active, closed, cancelled', type: 'string' }
    #swagger.parameters['userId'] = { in: 'query', description: 'Filter by specific user ObjectId', type: 'string' }
    #swagger.parameters['category'] = { in: 'query', description: 'Filter by category ObjectId', type: 'string' }
    #swagger.parameters['eventType'] = { in: 'query', description: 'Filter by eventType ObjectId', type: 'string' }
    #swagger.parameters['area'] = { in: 'query', description: 'Filter by area ObjectId', type: 'string' }
    #swagger.parameters['minBudget'] = { in: 'query', description: 'Filter by minimum budget', type: 'number' }
    #swagger.parameters['maxBudget'] = { in: 'query', description: 'Filter by maximum budget', type: 'number' }
    #swagger.parameters['startDate'] = { in: 'query', description: 'Filter by event start date (YYYY-MM-DD)', type: 'string' }
    #swagger.parameters['endDate'] = { in: 'query', description: 'Filter by event end date (YYYY-MM-DD)', type: 'string' }
    #swagger.parameters['createdStartDate'] = { in: 'query', description: 'Filter by creation start date (YYYY-MM-DD)', type: 'string' }
    #swagger.parameters['createdEndDate'] = { in: 'query', description: 'Filter by creation end date (YYYY-MM-DD)', type: 'string' }
    #swagger.parameters['page'] = { in: 'query', description: 'Page number for pagination', type: 'number', default: 1 }
    #swagger.parameters['limit'] = { in: 'query', description: 'Items per page', type: 'number', default: 10 }
  */
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  EventRequestControllers.getAdminRequirements,
);

export const EventRequestRoutes = router;

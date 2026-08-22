import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { EventQuoteControllers } from './eventQuote.controller';

const router = express.Router();

// ── Vendor Routes ──

// ── Vendor Routes ──

// Send a quote to an event request
router.post(
  '/',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Send vendor quote for event request'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $eventRequestId: '60d5ecb8b5c9c123456789ab',
        $offeredPrice: 4500,
        message: 'Complete decoration and stage setup included',
        deliverables: ['Stage Decor', 'Floral Arch', 'Lighting']
      }
    }
  */
  auth(USER_ROLE.vendor),
  EventQuoteControllers.sendQuote,
);

// Get my bids (all quotes I've sent)
router.get(
  '/my-bids',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Get vendor submitted bids'
  */
  auth(USER_ROLE.vendor),
  EventQuoteControllers.getMyBids,
);

// Get single bid detail
router.get(
  '/my-bids/:id',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Get single bid details'
  */
  auth(USER_ROLE.vendor),
  EventQuoteControllers.getSingleBid,
);

// Mark a quote as Won or Lost
router.patch(
  '/my-bids/:id/outcome',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Mark quote outcome (Won/Lost)'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $outcome: 'won'
      }
    }
  */
  auth(USER_ROLE.vendor),
  EventQuoteControllers.markQuoteOutcome,
);

// ── User Routes ──

// Get all quotes received for my event requests
router.get(
  '/received',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Get quotes received for my event requests'
  */
  auth(USER_ROLE.user),
  EventQuoteControllers.getQuotesForMyRequests,
);

// Get single quote detail (for viewing before counter/accept/decline)
router.get(
  '/received/:id',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Get received quote details'
  */
  auth(USER_ROLE.user),
  EventQuoteControllers.getQuoteDetailForUser,
);

// Accept or Decline a quote
router.patch(
  '/:id/status',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Accept or decline received quote'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $status: 'accepted'
      }
    }
  */
  auth(USER_ROLE.user),
  EventQuoteControllers.updateQuoteStatus,
);

// Decline a specific vendor's quote (dedicated endpoint)
router.patch(
  '/:id/decline',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Decline vendor quote'
  */
  auth(USER_ROLE.user),
  EventQuoteControllers.declineQuote,
);

// ── Shared Routes (both user and vendor) ──

// Send a counter offer on a quote
router.post(
  '/counter',
  /*
    #swagger.tags = ['EventQuote']
    #swagger.summary = 'Send counter offer on quote'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        $quoteId: '60d5ecb8b5c9c123456789ab',
        $counterPrice: 4200,
        note: 'Can we agree on $4200 including transportation?'
      }
    }
  */
  auth(USER_ROLE.user, USER_ROLE.vendor),
  EventQuoteControllers.sendCounterOffer,
);

export const EventQuoteRoutes = router;

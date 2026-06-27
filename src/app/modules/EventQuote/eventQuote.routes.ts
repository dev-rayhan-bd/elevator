import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { EventQuoteControllers } from './eventQuote.controller';

const router = express.Router();

// ── Vendor Routes ──

// Send a quote to an event request
router.post(
  '/',
  auth(USER_ROLE.vendor),
  EventQuoteControllers.sendQuote,
);

// Get my bids (all quotes I've sent)
router.get(
  '/my-bids',
  auth(USER_ROLE.vendor),
  EventQuoteControllers.getMyBids,
);

// Get single bid detail
router.get(
  '/my-bids/:id',
  auth(USER_ROLE.vendor),
  EventQuoteControllers.getSingleBid,
);

// Mark a quote as Won or Lost
router.patch(
  '/my-bids/:id/outcome',
  auth(USER_ROLE.vendor),
  EventQuoteControllers.markQuoteOutcome,
);

// ── User Routes ──

// Get all quotes received for my event requests
router.get(
  '/received',
  auth(USER_ROLE.user),
  EventQuoteControllers.getQuotesForMyRequests,
);

// Get single quote detail (for viewing before counter/accept/decline)
router.get(
  '/received/:id',
  auth(USER_ROLE.user),
  EventQuoteControllers.getQuoteDetailForUser,
);

// Accept or Decline a quote
router.patch(
  '/:id/status',
  auth(USER_ROLE.user),
  EventQuoteControllers.updateQuoteStatus,
);

// Decline a specific vendor's quote (dedicated endpoint)
router.patch(
  '/:id/decline',
  auth(USER_ROLE.user),
  EventQuoteControllers.declineQuote,
);

// ── Shared Routes (both user and vendor) ──

// Send a counter offer on a quote
router.post(
  '/counter',
  auth(USER_ROLE.user, USER_ROLE.vendor),
  EventQuoteControllers.sendCounterOffer,
);

export const EventQuoteRoutes = router;

import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { EventQuoteServices } from './eventQuote.services';
import { EventQuoteValidations } from './eventQuote.validation';

/**
 * Vendor: Send a quote to an event request
 */
const sendQuote = catchAsync(async (req, res) => {
  const validated = EventQuoteValidations.sendQuoteSchema.parse({ body: req.body });
  const result = await EventQuoteServices.sendQuoteIntoDB(req.user.userId, validated.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Quote sent successfully',
    data: result,
  });
});

/**
 * Vendor: Get my bids (all quotes I've sent)
 */
const getMyBids = catchAsync(async (req, res) => {
  const result = await EventQuoteServices.getMyBidsFromDB(req.user.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your bids retrieved successfully',
    data: result,
  });
});

/**
 * Vendor: Get single bid detail
 */
const getSingleBid = catchAsync(async (req, res) => {
  const result = await EventQuoteServices.getSingleBidFromDB(req.user.userId, req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bid detail retrieved successfully',
    data: result,
  });
});

/**
 * User: Get all quotes received for my event requests
 */
const getQuotesForMyRequests = catchAsync(async (req, res) => {
  const result = await EventQuoteServices.getQuotesForMyRequestsFromDB(
    req.user.userId,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quotes retrieved successfully',
    data: result,
  });
});

/**
 * User: Get single quote detail (for viewing before counter/accept/decline)
 */
const getQuoteDetailForUser = catchAsync(async (req, res) => {
  const result = await EventQuoteServices.getQuoteDetailForUserFromDB(
    req.user.userId,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quote detail retrieved successfully',
    data: result,
  });
});

/**
 * User/Vendor: Send a counter offer on a quote
 */
const sendCounterOffer = catchAsync(async (req, res) => {
  const validated = EventQuoteValidations.counterOfferSchema.parse({ body: req.body });
  const result = await EventQuoteServices.sendCounterOfferFromDB(
    req.user.userId,
    validated.body.quoteId,
    {
      amount: validated.body.amount,
      message: validated.body.message,
      sentBy: req.user.role === 'vendor' ? 'vendor' : 'user',
    },
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Counter offer sent successfully',
    data: result,
  });
});

/**
 * User: Accept or Decline a quote
 */
const updateQuoteStatus = catchAsync(async (req, res) => {
  const validated = EventQuoteValidations.updateQuoteStatusSchema.parse({ body: req.body });
  const result = await EventQuoteServices.updateQuoteStatusFromDB(
    req.user.userId,
    req.params.id,
    validated.body.status,
  );
  const responseMessage =
    validated.body.status === 'accepted'
      ? 'Quote accepted successfully. Winning vendor has been notified.'
      : 'Quote declined successfully';

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: responseMessage,
    data: result,
  });
});

/**
 * User: Decline a specific vendor's quote (dedicated endpoint)
 */
const declineQuote = catchAsync(async (req, res) => {
  const result = await EventQuoteServices.updateQuoteStatusFromDB(
    req.user.userId,
    req.params.id,
    'declined',
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quote declined successfully. Vendor has been notified.',
    data: result,
  });
});

/**
 * Vendor: Mark a quote as Won or Lost
 */
const markQuoteOutcome = catchAsync(async (req, res) => {
  const validated = EventQuoteValidations.markQuoteOutcomeSchema.parse({ body: req.body });
  const result = await EventQuoteServices.markQuoteOutcomeFromDB(
    req.user.userId,
    req.params.id,
    validated.body.status,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Quote marked as ${validated.body.status}`,
    data: result,
  });
});

export const EventQuoteControllers = {
  sendQuote,
  getMyBids,
  getSingleBid,
  getQuotesForMyRequests,
  getQuoteDetailForUser,
  sendCounterOffer,
  updateQuoteStatus,
  declineQuote,
  markQuoteOutcome,
};

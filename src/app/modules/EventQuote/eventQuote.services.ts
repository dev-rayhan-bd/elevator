import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { EventQuote } from './eventQuote.model';
import { EventRequest } from '../EventRequest/eventRequest.model';
import { sendNotification } from '../../utils/sendNotification';

/**
 * Vendor: Send a quote to an event request
 */
const sendQuoteIntoDB = async (vendorId: string, payload: {
  eventRequest: string;
  quoteAmount: number;
  message?: string;
  validUntil?: string;
}) => {
  // Check event request exists and is active
  const eventRequest = await EventRequest.findById(payload.eventRequest);
  if (!eventRequest) throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  if (eventRequest.status === 'cancelled') {
    throw new AppError(httpStatus.BAD_REQUEST, 'This event request has been cancelled and is no longer accepting quotes');
  }
  if (eventRequest.status !== 'active') {
    throw new AppError(httpStatus.BAD_REQUEST, 'This event request is no longer active');
  }

  // Prevent vendor from quoting when a quote has already been accepted/won
  const existingWonQuote = await EventQuote.findOne({
    eventRequest: new Types.ObjectId(payload.eventRequest),
    status: 'won',
  });
  if (existingWonQuote) {
    throw new AppError(httpStatus.BAD_REQUEST, 'A vendor has already been selected for this event request');
  }

  // Prevent vendor from quoting their own request
  if (eventRequest.user.toString() === vendorId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot quote on your own event request');
  }

  // Check for duplicate quote
  const existingQuote = await EventQuote.findOne({
    eventRequest: new Types.ObjectId(payload.eventRequest),
    vendor: new Types.ObjectId(vendorId),
  });
  if (existingQuote) {
    throw new AppError(httpStatus.CONFLICT, 'You have already sent a quote for this request');
  }

  const quoteData = {
    eventRequest: new Types.ObjectId(payload.eventRequest),
    vendor: new Types.ObjectId(vendorId),
    quoteAmount: payload.quoteAmount,
    message: payload.message,
    validUntil: payload.validUntil ? new Date(payload.validUntil) : undefined,
    offers: [{
      amount: payload.quoteAmount,
      message: payload.message,
      sentBy: 'vendor' as const,
      createdAt: new Date(),
    }],
  };

  const result = await EventQuote.create(quoteData);

  // Notify user about new quote (fire-and-forget)
  sendNotification(
    eventRequest.user.toString(),
    'New Quote Received',
    `A vendor has sent you a quote of PKR ${payload.quoteAmount.toLocaleString()} for your event.`,
    'new_quote',
    { quoteId: result._id.toString(), action: 'new_quote' }
  );

  return result;
};

/**
 * Vendor: Get my bids (all quotes I've sent)
 */
const getMyBidsFromDB = async (vendorId: string, query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    EventQuote.find({ vendor: new Types.ObjectId(vendorId) })
      .populate({
        path: 'eventRequest',
        select: 'eventType eventDate guestCount budgetMin budgetMax area serviceCategory additionalDetails status',
        populate: [
          { path: 'eventType', select: 'name image' },
          { path: 'area', select: 'name region' },
          { path: 'serviceCategory', select: 'name image' },
          { path: 'user', select: 'firstName lastName image' },
        ],
      })
      .sort('-createdAt'),
    query,
  )
    .filter()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

/**
 * Vendor: Get single bid detail
 */
const getSingleBidFromDB = async (vendorId: string, quoteId: string) => {
  const result = await EventQuote.findOne({
    _id: new Types.ObjectId(quoteId),
    vendor: new Types.ObjectId(vendorId),
  })
    .populate({
      path: 'eventRequest',
      populate: [
        { path: 'eventType', select: 'name image' },
        { path: 'area', select: 'name region' },
        { path: 'serviceCategory', select: 'name image' },
        { path: 'user', select: 'firstName lastName image email phone' },
      ],
    });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Bid not found');
  return result;
};

/**
 * User: Get all quotes received for my event requests
 */
const getQuotesForMyRequestsFromDB = async (userId: string, query: Record<string, unknown>) => {
  // First, get all event request IDs owned by this user
  const myRequests = await EventRequest.find({ user: new Types.ObjectId(userId) }).select('_id');
  const requestIds = myRequests.map((r) => r._id);

  const serviceQuery = new QueryBuilder(
    EventQuote.find({ eventRequest: { $in: requestIds } })
      .populate('vendor', 'firstName lastName image vendor.businessName vendor.isVerifiedBadge vendor.profileScore')
      .populate({
        path: 'eventRequest',
        select: 'eventType eventDate guestCount budgetMin budgetMax area serviceCategory status',
        populate: [
          { path: 'eventType', select: 'name image' },
          { path: 'area', select: 'name region' },
          { path: 'serviceCategory', select: 'name image' },
        ],
      })
      .sort('-createdAt'),
    query,
  )
    .filter()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

/**
 * User: Get single quote detail (for viewing before counter/accept/decline)
 */
const getQuoteDetailForUserFromDB = async (userId: string, quoteId: string) => {
  const quote = await EventQuote.findById(quoteId)
    .populate('vendor', 'firstName lastName image email phone vendor.businessName vendor.isVerifiedBadge vendor.profileScore')
    .populate({
      path: 'eventRequest',
      populate: [
        { path: 'eventType', select: 'name image' },
        { path: 'area', select: 'name region' },
        { path: 'serviceCategory', select: 'name image' },
      ],
    });
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found');

  // Verify user owns the event request
  const eventRequest = await EventRequest.findById(quote.eventRequest);
  if (!eventRequest || eventRequest.user.toString() !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized access');
  }

  return quote;
};

/**
 * User/Vendor: Send a counter offer on a quote
 */
const sendCounterOfferFromDB = async (
  userId: string,
  quoteId: string,
  payload: { amount: number; message?: string; sentBy: 'vendor' | 'user' },
) => {
  const quote = await EventQuote.findById(quoteId).populate('eventRequest');
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found');

  const eventRequest = await EventRequest.findById(
    typeof quote.eventRequest === 'object' && quote.eventRequest !== null
      ? (quote.eventRequest as any)._id
      : quote.eventRequest,
  );
  if (!eventRequest) throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');

  // Security: verify the sender is authorized
  if (payload.sentBy === 'vendor') {
    if (quote.vendor.toString() !== userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'You can only counter your own quotes');
    }
  } else {
    if (eventRequest.user.toString() !== userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'You can only counter quotes on your own requests');
    }
  }

  // Must be in a counterable status
  if (!['pending', 'countered'].includes(quote.status)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This quote can no longer be countered');
  }

  // Update the quote
  quote.counterOffer = {
    amount: payload.amount,
    message: payload.message,
    sentBy: payload.sentBy,
  };
  quote.status = 'countered';
  quote.offers.push({
    amount: payload.amount,
    message: payload.message,
    sentBy: payload.sentBy,
    createdAt: new Date(),
  });

  await quote.save();

  // Notify the other party (fire-and-forget)
  if (payload.sentBy === 'vendor') {
    // Notify user
    sendNotification(
      eventRequest.user.toString(),
      'Counter Offer Received',
      `A vendor has countered with PKR ${payload.amount.toLocaleString()}.`,
      'counter_offer',
      { quoteId: quote._id.toString(), action: 'counter_offer' }
    );
  } else {
    // Notify vendor
    sendNotification(
      quote.vendor.toString(),
      'Counter Offer Received',
      `The client has countered your quote with PKR ${payload.amount.toLocaleString()}.`,
      'counter_offer',
      { quoteId: quote._id.toString(), action: 'counter_offer' }
    );
  }

  return quote;
};

/**
 * User: Accept or Decline a quote
 */
const updateQuoteStatusFromDB = async (
  userId: string,
  quoteId: string,
  status: 'accepted' | 'declined',
) => {
  const quote = await EventQuote.findById(quoteId);
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found');

  // Verify user owns the event request
  const eventRequest = await EventRequest.findById(quote.eventRequest);
  if (!eventRequest || eventRequest.user.toString() !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized access');
  }

  if (!['pending', 'countered'].includes(quote.status)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This quote has already been processed');
  }

  if (status === 'accepted') {
    // Close the event request
    if (eventRequest.status !== 'active') {
      throw new AppError(httpStatus.BAD_REQUEST, 'This event request is no longer active');
    }
    eventRequest.status = 'closed';
    await eventRequest.save();

    // Find all other pending/countered quotes for the same request
    const otherQuotes = await EventQuote.find({
      eventRequest: quote.eventRequest,
      _id: { $ne: quote._id },
      status: { $in: ['pending', 'countered'] },
    });

    // ── Auto Won/Lost Flow ──
    // Winning vendor gets 'won', all others get 'lost'
    quote.status = 'won';
    await quote.save();

    // Set all other quotes to 'lost'
    await EventQuote.updateMany(
      {
        eventRequest: quote.eventRequest,
        _id: { $ne: quote._id },
        status: { $in: ['pending', 'countered'] },
      },
      { status: 'lost' },
    );

    // Notify the user that their event request is closed
    sendNotification(
      userId,
      'Event Request Closed',
      'Your event request has been closed because you accepted a quote.',
      'request_closed',
      { eventRequestId: eventRequest._id.toString(), action: 'request_closed' }
    );

    // Notify the winning vendor
    sendNotification(
      quote.vendor.toString(),
      'Congratulations! You Won the Bid! 🎉',
      `Great news! The client has accepted your quote of PKR ${quote.quoteAmount.toLocaleString()}. You won the bid!`,
      'quote_won',
      { quoteId: quote._id.toString(), action: 'quote_won' }
    );

    // Notify all losing vendors
    for (const lostQuote of otherQuotes) {
      sendNotification(
        lostQuote.vendor.toString(),
        'Bid Lost',
        `Unfortunately, the client has selected another vendor. Your quote of PKR ${lostQuote.quoteAmount.toLocaleString()} was not selected for this event request.`,
        'quote_lost',
        { quoteId: lostQuote._id.toString(), action: 'quote_lost' }
      );
    }
  } else {
    // status === 'declined'
    quote.status = 'declined';
    await quote.save();

    // Notify the declined vendor
    sendNotification(
      quote.vendor.toString(),
      'Quote Declined',
      `The client has declined your quote of PKR ${quote.quoteAmount.toLocaleString()}.`,
      'quote_declined',
      { quoteId: quote._id.toString(), action: 'quote_declined' }
    );
  }

  return quote;
};

/**
 * Vendor: Mark a quote as Won or Lost (manual outcome tracking)
 */
const markQuoteOutcomeFromDB = async (
  vendorId: string,
  quoteId: string,
  status: 'won' | 'lost',
) => {
  const quote = await EventQuote.findOne({
    _id: new Types.ObjectId(quoteId),
    vendor: new Types.ObjectId(vendorId),
  });
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found or unauthorized');

  if (!['pending', 'countered'].includes(quote.status)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot update outcome for this quote');
  }

  quote.status = status;
  await quote.save();
  return quote;
};

export const EventQuoteServices = {
  sendQuoteIntoDB,
  getMyBidsFromDB,
  getSingleBidFromDB,
  getQuotesForMyRequestsFromDB,
  getQuoteDetailForUserFromDB,
  sendCounterOfferFromDB,
  updateQuoteStatusFromDB,
  markQuoteOutcomeFromDB,
};

import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { VendorQuote } from './vendorQuote.model';
import { TVendorQuote } from './vendorQuote.interface';
import { User } from '../User/user.model';
import { VendorService } from '../VendorService/vendorService.model';
import { sendNotification } from '../../utils/sendNotification';

// ── User: Send quote request to vendor ──
const sendQuoteInDB = async (userId: string, payload: Partial<TVendorQuote>) => {
  // Verify service exists and get vendor ID + pricingType
  const service = await VendorService.findById(payload.service);
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Service not found!');

  const vendorId = service.vendor;
  const pricingType = payload.pricingType || service.pricingType || 'fixed';

  // Check duplicate — user already has active quote for this service
  const existing = await VendorQuote.findOne({
    user: userId,
    service: payload.service,
    isDeleted: false,
  });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'You already have an active quote for this service.');
  }

  const quote = await VendorQuote.create({
    ...payload,
    user: userId,
    vendor: vendorId,
    pricingType,
    status: 'pending',
    offers: [
      {
        amount: payload.budget!,
        message: payload.message,
        sender: new Types.ObjectId(userId),
        pricingType,
        createdAt: new Date(),
      },
    ],
  });

  // Notify vendor
  const user = await User.findById(userId).select('firstName lastName');
  const userName = user ? `${user.firstName} ${user.lastName}` : 'A customer';
  sendNotification(
    vendorId.toString(),
    'New Quote Request',
    `${userName} sent a quote request for your service.`,
    'new_quote',
    { quoteId: quote._id.toString(), action: 'new_quote' },
  );

  return quote;
};

// ── User: Get all my sent quotes ──
const getMyQuotesFromDB = async (userId: string, query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = (query.sort as string) || '-createdAt';
  const status = query.status as string;

  const filter: any = { user: userId, isDeleted: false };
  if (status) filter.status = status;

  const [quotes, total] = await Promise.all([
    VendorQuote.find(filter)
      .populate('vendor', 'firstName lastName image vendor.businessName')
      .populate('service', 'title images description pricingType price guestCapacity')
      .populate('offers.sender', 'firstName lastName image')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    VendorQuote.countDocuments(filter),
  ]);

  return {
    quotes,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ── User or Vendor: Get single quote details ──
const getQuoteDetailsFromDB = async (userId: string, role: string, quoteId: string) => {
  const quote = await VendorQuote.findById(quoteId)
    .populate('user', 'firstName lastName image email phone')
    .populate('vendor', 'firstName lastName image email phone vendor.businessName')
    .populate('service', 'title images description pricingType price')
    .populate('offers.sender', 'firstName lastName image');

  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found!');

  // Ensure the requester is either the user or vendor of this quote
  const userIdStr = userId;
  const isUser = quote.user._id.toString() === userIdStr;
  const isVendor = quote.vendor._id.toString() === userIdStr;

  if (!isUser && !isVendor) {
    throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized to view this quote!');
  }

  return quote;
};

// ── User: Accept quote → auto-won (both sides see "won") ──
const acceptQuoteInDB = async (userId: string, quoteId: string) => {
  const quote = await VendorQuote.findOne({ _id: quoteId, user: userId, isDeleted: false });
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found or unauthorized!');

  if (!['countered', 'pending'].includes(quote.status)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot accept quote with status "${quote.status}".`);
  }

  quote.status = 'won';
  quote.finalAmount = quote.offers.length > 0
    ? quote.offers[quote.offers.length - 1].amount
    : quote.budget;
  await quote.save();

  // Notify vendor
  sendNotification(
    quote.vendor.toString(),
    'Deal Confirmed! 🎉',
    'The customer accepted your quote. Booking is confirmed!',
    'quote_won',
    { quoteId: quote._id.toString(), action: 'quote_won' },
  );

  return quote;
};

// ── User: Decline a quote ──
const declineQuoteInDB = async (userId: string, quoteId: string) => {
  const quote = await VendorQuote.findOne({ _id: quoteId, user: userId, isDeleted: false });
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found or unauthorized!');

  if (quote.status === 'accepted' || quote.status === 'won' || quote.status === 'declined') {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot decline quote with status "${quote.status}".`);
  }

  quote.status = 'declined';
  await quote.save();

  sendNotification(
    quote.vendor.toString(),
    'Quote Declined',
    'The customer declined the quote.',
    'quote_declined',
    { quoteId: quote._id.toString(), action: 'quote_declined' },
  );

  return quote;
};

// ── Vendor: Get all quotes for my services + stats ──
const getVendorQuotesFromDB = async (vendorId: string, query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = (query.sort as string) || '-createdAt';
  const status = query.status as string;

  const filter: any = { vendor: vendorId, isDeleted: false };
  if (status) filter.status = status;

  const [quotes, total, stats] = await Promise.all([
    VendorQuote.find(filter)
      .populate('user', 'firstName lastName image email phone')
      .populate('service', 'title images pricingType')
      .populate('offers.sender', 'firstName lastName image')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    VendorQuote.countDocuments(filter),
    VendorQuote.aggregate([
      { $match: { vendor: new Types.ObjectId(vendorId), isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Build stats object
  const statsMap: Record<string, number> = {
    total: 0,
    pending: 0,
    countered: 0,
    accepted: 0,
    declined: 0,
    won: 0,
    lost: 0,
  };
  for (const s of stats) {
    statsMap[s._id] = s.count;
    statsMap.total += s.count;
  }

  return {
    stats: statsMap,
    quotes,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ── Vendor: Send counter offer ──
const counterQuoteInDB = async (vendorId: string, quoteId: string, amount: number, message?: string, pricingType?: string) => {
  const quote = await VendorQuote.findOne({ _id: quoteId, vendor: vendorId, isDeleted: false });
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found or unauthorized!');

  if (!['pending', 'countered'].includes(quote.status)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot counter quote with status "${quote.status}".`);
  }

  quote.status = 'countered';
  quote.offers.push({
    amount,
    message,
    sender: new Types.ObjectId(vendorId),
    pricingType: pricingType as any,
    createdAt: new Date(),
  });
  await quote.save();

  // Notify user
  sendNotification(
    quote.user.toString(),
    'Counter Offer Received',
    `The vendor sent a counter offer of $${amount}.`,
    'counter_offer',
    { quoteId: quote._id.toString(), action: 'counter_offer' },
  );

  return quote;
};

// ── User: Send counter offer back to vendor ──
const userCounterQuoteInDB = async (userId: string, quoteId: string, amount: number, message?: string, pricingType?: string) => {
  const quote = await VendorQuote.findOne({ _id: quoteId, user: userId, isDeleted: false });
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found or unauthorized!');

  if (quote.status !== 'countered') {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot counter quote with status "${quote.status}".`);
  }

  quote.status = 'countered';
  quote.offers.push({
    amount,
    message,
    sender: new Types.ObjectId(userId),
    pricingType: pricingType as any,
    createdAt: new Date(),
  });
  await quote.save();

  // Notify vendor
  sendNotification(
    quote.vendor.toString(),
    'Counter Offer Received',
    `The customer sent a counter offer of $${amount}.`,
    'counter_offer',
    { quoteId: quote._id.toString(), action: 'counter_offer' },
  );

  return quote;
};

// ── Vendor: Accept quote → auto-won (both sides see "won") ──
const winQuoteInDB = async (vendorId: string, quoteId: string) => {
  const quote = await VendorQuote.findOne({ _id: quoteId, vendor: vendorId, isDeleted: false });
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found or unauthorized!');

  if (quote.status === 'won') {
    return quote; // already won, no-op
  }

  if (!['pending', 'countered'].includes(quote.status)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot accept quote with status "${quote.status}".`);
  }

  quote.status = 'won';
  quote.finalAmount = quote.offers.length > 0
    ? quote.offers[quote.offers.length - 1].amount
    : quote.budget;
  await quote.save();

  sendNotification(
    quote.user.toString(),
    'Deal Confirmed! 🎉',
    'The vendor accepted your offer. Booking is confirmed!',
    'quote_won',
    { quoteId: quote._id.toString(), action: 'quote_won' },
  );

  return quote;
};

// ── Vendor: Lose/Close a deal → auto-declined (both sides see "declined") ──
const loseQuoteInDB = async (vendorId: string, quoteId: string) => {
  const quote = await VendorQuote.findOne({ _id: quoteId, vendor: vendorId, isDeleted: false });
  if (!quote) throw new AppError(httpStatus.NOT_FOUND, 'Quote not found or unauthorized!');

  if (['won', 'declined'].includes(quote.status)) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot close quote with status "${quote.status}".`);
  }

  quote.status = 'declined';
  await quote.save();

  sendNotification(
    quote.user.toString(),
    'Quote Declined',
    'The vendor closed this quote.',
    'quote_declined',
    { quoteId: quote._id.toString(), action: 'quote_declined' },
  );

  return quote;
};

export const VendorQuoteServices = {
  sendQuoteInDB,
  getMyQuotesFromDB,
  getQuoteDetailsFromDB,
  acceptQuoteInDB,
  declineQuoteInDB,
  getVendorQuotesFromDB,
  counterQuoteInDB,
  userCounterQuoteInDB,
  winQuoteInDB,
  loseQuoteInDB,
};

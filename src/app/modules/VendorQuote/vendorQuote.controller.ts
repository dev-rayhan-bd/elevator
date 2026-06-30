import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VendorQuoteServices } from './vendorQuote.services';
import httpStatus from 'http-status';

// ── User: Send quote to vendor ──
const sendQuote = catchAsync(async (req, res) => {
  const result = await VendorQuoteServices.sendQuoteInDB(req.user.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Quote request sent successfully',
    data: result,
  });
});

// ── User: Get my sent quotes ──
const getMyQuotes = catchAsync(async (req, res) => {
  const result = await VendorQuoteServices.getMyQuotesFromDB(req.user.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quotes retrieved successfully',
    data: result,
  });
});

// ── User or Vendor: Get quote details ──
const getQuoteDetails = catchAsync(async (req, res) => {
  const { quoteId } = req.params;
  const result = await VendorQuoteServices.getQuoteDetailsFromDB(
    req.user.userId,
    req.user.role,
    quoteId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quote details retrieved successfully',
    data: result,
  });
});

// ── User: Accept quote ──
const acceptQuote = catchAsync(async (req, res) => {
  const { quoteId } = req.params;
  const result = await VendorQuoteServices.acceptQuoteInDB(req.user.userId, quoteId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quote accepted successfully',
    data: result,
  });
});

// ── User: Decline quote ──
const declineQuote = catchAsync(async (req, res) => {
  const { quoteId } = req.params;
  const result = await VendorQuoteServices.declineQuoteInDB(req.user.userId, quoteId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quote declined',
    data: result,
  });
});

// ── User: Counter offer to vendor ──
const userCounterQuote = catchAsync(async (req, res) => {
  const { quoteId } = req.params;
  const { amount, message, pricingType } = req.body;
  const result = await VendorQuoteServices.userCounterQuoteInDB(
    req.user.userId,
    quoteId,
    amount,
    message,
    pricingType,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Counter offer sent',
    data: result,
  });
});

// ── Vendor: Get all quotes + stats ──
const getVendorQuotes = catchAsync(async (req, res) => {
  const result = await VendorQuoteServices.getVendorQuotesFromDB(req.user.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quotes retrieved successfully',
    data: result,
  });
});

// ── Vendor: Send counter offer ──
const counterQuote = catchAsync(async (req, res) => {
  const { quoteId } = req.params;
  const { amount, message, pricingType } = req.body;
  const result = await VendorQuoteServices.counterQuoteInDB(
    req.user.userId,
    quoteId,
    amount,
    message,
    pricingType,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Counter offer sent',
    data: result,
  });
});

// ── Vendor: Win deal ──
const winQuote = catchAsync(async (req, res) => {
  const { quoteId } = req.params;
  const result = await VendorQuoteServices.winQuoteInDB(req.user.userId, quoteId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Deal confirmed as won',
    data: result,
  });
});

// ── Vendor: Lose/Close deal ──
const loseQuote = catchAsync(async (req, res) => {
  const { quoteId } = req.params;
  const result = await VendorQuoteServices.loseQuoteInDB(req.user.userId, quoteId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Deal closed',
    data: result,
  });
});

export const VendorQuoteControllers = {
  sendQuote,
  getMyQuotes,
  getQuoteDetails,
  acceptQuote,
  declineQuote,
  userCounterQuote,
  getVendorQuotes,
  counterQuote,
  winQuote,
  loseQuote,
};

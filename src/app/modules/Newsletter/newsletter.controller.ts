import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { NewsletterServices } from './newsletter.services';

// ══════════════════════════════════════════════
//  PUBLIC
// ══════════════════════════════════════════════

const subscribe = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)?.userId;
  const result = await NewsletterServices.subscribeToNewsletter(
    req.body,
    userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Subscribed to newsletter successfully',
    data: result,
  });
});

const unsubscribe = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await NewsletterServices.unsubscribeFromNewsletter(email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unsubscribed from newsletter successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  ADMIN: SUBSCRIBER MANAGEMENT
// ══════════════════════════════════════════════

const getAllSubscribers = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.getAllSubscribersFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscribers retrieved successfully',
    data: result,
  });
});

const getSingleSubscriber = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.getSingleSubscriberFromDB(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriber retrieved successfully',
    data: result,
  });
});

const addSubscriber = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.addSubscriberByAdmin(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Subscriber added successfully',
    data: result,
  });
});

const bulkImport = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.bulkImportSubscribers(
    req.body.subscribers,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Import completed: ${result.imported} imported, ${result.skipped} skipped`,
    data: result,
  });
});

const updateSubscriber = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.updateSubscriberFromDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriber updated successfully',
    data: result,
  });
});

const updateSubscriberStatus = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NewsletterServices.updateSubscriberStatusFromDB(
      req.params.id,
      req.body.status,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Subscriber status updated to ${result.status}`,
      data: result,
    });
  },
);

const deleteSubscriber = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.deleteSubscriberFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriber deleted successfully',
    data: result,
  });
});

const getSubscriberStats = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.getSubscriberStatsFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriber stats retrieved successfully',
    data: result,
  });
});

export const NewsletterControllers = {
  subscribe,
  unsubscribe,
  getAllSubscribers,
  getSingleSubscriber,
  addSubscriber,
  bulkImport,
  updateSubscriber,
  updateSubscriberStatus,
  deleteSubscriber,
  getSubscriberStats,
};

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ContactServices } from './contact.services';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactServices.saveMessageIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your message has been sent successfully.',
    data: result,
  });
});

const getAllMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactServices.getAllMessagesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Contact messages retrieved successfully.',
    data: result,
  });
});

const getSingleMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactServices.getSingleMessageFromDB(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message retrieved successfully.',
    data: result,
  });
});

const replyToMessage = catchAsync(async (req: Request, res: Response) => {
  const adminEmail = req.user.email; 
  const { replyText } = req.body;
  
  const result = await ContactServices.replyToMessageInDB(req.params.id, adminEmail, replyText);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reply sent successfully.',
    data: result,
  });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  await ContactServices.deleteMessageFromDB(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message deleted successfully.',
    data: null,
  });
});

export const contactControllers = {
  sendMessage,
  getAllMessages,
  getSingleMessage,
  replyToMessage,
  deleteMessage,
};

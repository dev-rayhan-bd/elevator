import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import uploadImage from '../../middleware/upload';
import { EventTypeServices } from './eventType.services';

const getAllEventTypes = catchAsync(async (req, res) => {
  const result = await EventTypeServices.getAllEventTypesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event types retrieved successfully',
    data: result,
  });
});

const getAllEventTypesList = catchAsync(async (req, res) => {
  const result = await EventTypeServices.getAllEventTypesListFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All event types retrieved successfully',
    data: result,
  });
});

const getSingleEventType = catchAsync(async (req, res) => {
  const result = await EventTypeServices.getSingleEventTypeFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event type retrieved successfully',
    data: result,
  });
});

const createEventType = catchAsync(async (req, res) => {
  let imageUrl: string | undefined;
  if (req.file) imageUrl = await uploadImage(req);

  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...data, ...(imageUrl && { image: imageUrl }) };

  const result = await EventTypeServices.createEventTypeIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Event type created successfully',
    data: result,
  });
});

const updateEventType = catchAsync(async (req, res) => {
  let imageUrl: string | undefined;
  if (req.file) imageUrl = await uploadImage(req, req.file);

  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...data, ...(imageUrl && { image: imageUrl }) };

  const result = await EventTypeServices.updateEventTypeInDB(req.params.id, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event type updated successfully',
    data: result,
  });
});

const deleteEventType = catchAsync(async (req, res) => {
  const result = await EventTypeServices.deleteEventTypeFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event type deleted successfully',
    data: result,
  });
});

export const EventTypeControllers = {
  getAllEventTypes,
  getAllEventTypesList,
  getSingleEventType,
  createEventType,
  updateEventType,
  deleteEventType,
};

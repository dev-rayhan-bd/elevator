import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ServiceAreaServices } from './serviceArea.services';

const getAllServiceAreas = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.getAllServiceAreasFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service areas retrieved successfully',
    data: result,
  });
});

const getSingleServiceArea = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.getSingleServiceAreaFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service area retrieved successfully',
    data: result,
  });
});

const createServiceArea = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.createServiceAreaIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Service area created successfully',
    data: result,
  });
});

const updateServiceArea = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.updateServiceAreaInDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service area updated successfully',
    data: result,
  });
});

const deleteServiceArea = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.deleteServiceAreaFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service area deleted successfully',
    data: result,
  });
});

const getAllServiceAreasWithQuery = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.getAllServiceAreasWithQueryFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service areas retrieved successfully',
    data: result,
  });
});

const getAllServiceAreasList = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.getAllServiceAreasListFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All service areas retrieved successfully',
    data: result,
  });
});

const toggleServiceAreaStatus = catchAsync(async (req, res) => {
  const area = await ServiceAreaServices.getSingleServiceAreaFromDB(req.params.id);
  const newStatus =
    typeof req.body.isActive === 'boolean'
      ? req.body.isActive
      : typeof req.body.isActive === 'string'
      ? req.body.isActive === 'true'
      : !area.isActive;

  const result = await ServiceAreaServices.updateServiceAreaInDB(req.params.id, {
    isActive: newStatus,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Service area ${newStatus ? 'activated' : 'disabled'} successfully`,
    data: result,
  });
});

const reorderServiceAreas = catchAsync(async (req, res) => {
  const result = await ServiceAreaServices.reorderServiceAreasInDB(req.body.items);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service areas reordered successfully',
    data: result,
  });
});

export const ServiceAreaControllers = {
  getAllServiceAreas,
  getSingleServiceArea,
  createServiceArea,
  updateServiceArea,
  toggleServiceAreaStatus,
  deleteServiceArea,
  getAllServiceAreasWithQuery,
  getAllServiceAreasList,
  reorderServiceAreas,
};

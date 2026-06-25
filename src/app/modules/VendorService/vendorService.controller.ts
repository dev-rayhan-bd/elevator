import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VendorServiceServices } from './vendorService.services';

const getAllVendorServices = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getAllVendorServicesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All services retrieved successfully',
    data: result,
  });
});

const getMyServices = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getVendorServicesByVendorFromDB(
    req.user.userId,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your services retrieved successfully',
    data: result,
  });
});

const getPublicVendorServices = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getPublicVendorServicesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Services retrieved successfully',
    data: result,
  });
});

const getSingleVendorService = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getSingleVendorServiceFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service retrieved successfully',
    data: result,
  });
});

const createVendorService = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.createVendorServiceIntoDB(req.user.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Service created successfully',
    data: result,
  });
});

const updateVendorService = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.updateVendorServiceInDB(
    req.user.userId,
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service updated successfully',
    data: result,
  });
});

const deleteVendorService = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.deleteVendorServiceFromDB(
    req.user.userId,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service deleted successfully',
    data: result,
  });
});

// Admin: toggle featured / active
const adminToggleServiceStatus = catchAsync(async (req, res) => {
  const { isFeatured, isActive } = req.body;
  const result = await VendorServiceServices.adminToggleServiceStatusInDB(req.params.id, {
    isFeatured,
    isActive,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service status updated',
    data: result,
  });
});

export const VendorServiceControllers = {
  getAllVendorServices,
  getMyServices,
  getPublicVendorServices,
  getSingleVendorService,
  createVendorService,
  updateVendorService,
  deleteVendorService,
  adminToggleServiceStatus,
};

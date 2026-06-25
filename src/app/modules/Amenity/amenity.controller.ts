import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AmenityServices } from './amenity.services';

const getAllAmenities = catchAsync(async (req, res) => {
  const result = await AmenityServices.getAllAmenitiesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Amenities retrieved successfully',
    data: result,
  });
});

const getSingleAmenity = catchAsync(async (req, res) => {
  const result = await AmenityServices.getSingleAmenityFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Amenity retrieved successfully',
    data: result,
  });
});

const createAmenity = catchAsync(async (req, res) => {
  const result = await AmenityServices.createAmenityIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Amenity created successfully',
    data: result,
  });
});

const updateAmenity = catchAsync(async (req, res) => {
  const result = await AmenityServices.updateAmenityInDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Amenity updated successfully',
    data: result,
  });
});

const deleteAmenity = catchAsync(async (req, res) => {
  const result = await AmenityServices.deleteAmenityFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Amenity deleted successfully',
    data: result,
  });
});

const getAmenitiesByCategoryAndSubcategory = catchAsync(async (req, res) => {
  const { category, subcategory } = req.params;
  const result = await AmenityServices.getAmenitiesByCategoryAndSubcategoryFromDB(
    category,
    subcategory,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Amenities retrieved successfully',
    data: result,
  });
});

export const AmenityControllers = {
  getAllAmenities,
  getSingleAmenity,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  getAmenitiesByCategoryAndSubcategory,
};

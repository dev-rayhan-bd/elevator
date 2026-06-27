import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import uploadImage from '../../middleware/upload';
import { SubcategoryServices } from './subcategory.services';

const getAllSubcategories = catchAsync(async (req, res) => {
  const result = await SubcategoryServices.getAllSubcategoriesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subcategories retrieved successfully',
    data: result,
  });
});

const getAllSubcategoriesWithQuery = catchAsync(async (req, res) => {
  const result = await SubcategoryServices.getAllSubcategoriesWithQueryFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All subcategories retrieved successfully',
    data: result,
  });
});

const getAllSubcategoriesList = catchAsync(async (req, res) => {
  const result = await SubcategoryServices.getAllSubcategoriesListFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All subcategories retrieved successfully',
    data: result,
  });
});

const getSubcategoriesByCategory = catchAsync(async (req, res) => {
  const result = await SubcategoryServices.getSubcategoriesByCategoryFromDB(req.params.categoryId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subcategories retrieved successfully',
    data: result,
  });
});

const getSingleSubcategory = catchAsync(async (req, res) => {
  const result = await SubcategoryServices.getSingleSubcategoryFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subcategory retrieved successfully',
    data: result,
  });
});

const createSubcategory = catchAsync(async (req, res) => {
  let imageUrl: string | undefined;
  if (req.file) imageUrl = await uploadImage(req);

  const payload = { ...req.body, ...(imageUrl && { image: imageUrl }) };

  const result = await SubcategoryServices.createSubcategoryIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Subcategory created successfully',
    data: result,
  });
});

const updateSubcategory = catchAsync(async (req, res) => {
  let imageUrl: string | undefined;
  if (req.file) imageUrl = await uploadImage(req);

  const payload = { ...req.body, ...(imageUrl && { image: imageUrl }) };

  const result = await SubcategoryServices.updateSubcategoryInDB(req.params.id, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subcategory updated successfully',
    data: result,
  });
});

const deleteSubcategory = catchAsync(async (req, res) => {
  const result = await SubcategoryServices.deleteSubcategoryFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subcategory deleted successfully',
    data: result,
  });
});

export const SubcategoryControllers = {
  getAllSubcategories,
  getAllSubcategoriesWithQuery,
  getAllSubcategoriesList,
  getSubcategoriesByCategory,
  getSingleSubcategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
};

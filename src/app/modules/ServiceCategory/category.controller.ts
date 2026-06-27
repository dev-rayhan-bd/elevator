import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import uploadImage from '../../middleware/upload';
import { CategoryServices } from './category.services';

const getAllCategories = catchAsync(async (req, res) => {
  const result = await CategoryServices.getAllCategoriesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Categories retrieved successfully',
    data: result,
  });
});

const getAllCategoriesList = catchAsync(async (req, res) => {
  const result = await CategoryServices.getAllCategoriesListFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All categories retrieved successfully',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req, res) => {
  const result = await CategoryServices.getSingleCategoryFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category retrieved successfully',
    data: result,
  });
});

const createCategory = catchAsync(async (req, res) => {
  let imageUrl: string | undefined;
  if (req.file) imageUrl = await uploadImage(req);

  const payload = { ...req.body, ...(imageUrl && { image: imageUrl }) };

  const result = await CategoryServices.createCategoryIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Category created successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req, res) => {
  let imageUrl: string | undefined;
  if (req.file) imageUrl = await uploadImage(req);

  const payload = { ...req.body, ...(imageUrl && { image: imageUrl }) };

  const result = await CategoryServices.updateCategoryInDB(req.params.id, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req, res) => {
  const result = await CategoryServices.deleteCategoryFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Category deleted successfully',
    data: result,
  });
});

export const CategoryControllers = {
  getAllCategories,
  getAllCategoriesList,
  getSingleCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};

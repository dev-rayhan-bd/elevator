import httpStatus from 'http-status';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import { BlogCategoryServices } from './blogCategory.services';

const createBlogCategory = catchAsync(async (req, res) => {
  const result = await BlogCategoryServices.createBlogCategoryIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Blog category created successfully',
    data: result,
  });
});

const getAllBlogCategories = catchAsync(async (req, res) => {
  const result = await BlogCategoryServices.getAllBlogCategoriesFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blog categories retrieved successfully',
    data: result,
  });
});

const getAdminBlogCategories = catchAsync(async (req, res) => {
  const result = await BlogCategoryServices.getAdminBlogCategoriesFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blog categories retrieved successfully',
    data: result,
  });
});

const updateBlogCategory = catchAsync(async (req, res) => {
  const result = await BlogCategoryServices.updateBlogCategoryInDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blog category updated successfully',
    data: result,
  });
});

const deleteBlogCategory = catchAsync(async (req, res) => {
  const result = await BlogCategoryServices.deleteBlogCategoryFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blog category deleted successfully',
    data: result,
  });
});

export const BlogCategoryControllers = {
  createBlogCategory,
  getAllBlogCategories,
  getAdminBlogCategories,
  updateBlogCategory,
  deleteBlogCategory,
};

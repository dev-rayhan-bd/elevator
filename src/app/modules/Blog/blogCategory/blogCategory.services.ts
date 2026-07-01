import httpStatus from 'http-status';
import AppError from '../../../errors/AppError';
import { BlogCategory } from './blogCategory.model';

const createBlogCategoryIntoDB = async (payload: { name: string }) => {
  const exists = await BlogCategory.findOne({ name: payload.name });
  if (exists) throw new AppError(httpStatus.CONFLICT, 'Category already exists');

  const result = await BlogCategory.create(payload);
  return result;
};

const getAllBlogCategoriesFromDB = async () => {
  const result = await BlogCategory.find({ isActive: true }).sort('name');
  return result;
};

const getAdminBlogCategoriesFromDB = async () => {
  const result = await BlogCategory.find().sort('name');
  return result;
};

const updateBlogCategoryInDB = async (id: string, payload: { name?: string; isActive?: boolean }) => {
  if (payload.name) {
    const exists = await BlogCategory.findOne({ name: payload.name, _id: { $ne: id } });
    if (exists) throw new AppError(httpStatus.CONFLICT, 'Category name already exists');
  }
  const result = await BlogCategory.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Blog category not found');
  return result;
};

const deleteBlogCategoryFromDB = async (id: string) => {
  const result = await BlogCategory.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Blog category not found');
  return result;
};

export const BlogCategoryServices = {
  createBlogCategoryIntoDB,
  getAllBlogCategoriesFromDB,
  getAdminBlogCategoriesFromDB,
  updateBlogCategoryInDB,
  deleteBlogCategoryFromDB,
};

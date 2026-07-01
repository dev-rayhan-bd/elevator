import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ServiceCategory } from './category.model';
import { ServiceSubcategory } from '../ServiceSubcategory/subcategory.model';
import { TServiceCategory } from './category.interface';

const getAllCategoriesFromDB = async (query: Record<string, unknown>) => {
  const categoryQuery = new QueryBuilder(ServiceCategory.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await categoryQuery.modelQuery;
  const meta = await categoryQuery.countTotal();
  return { meta, result };
};

const getSingleCategoryFromDB = async (id: string) => {
  const result = await ServiceCategory.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  return result;
};

const createCategoryIntoDB = async (payload: TServiceCategory) => {
  const existing = await ServiceCategory.findOne({ name: payload.name });
  if (existing) throw new AppError(httpStatus.CONFLICT, 'Category already exists');
  const result = await ServiceCategory.create(payload);
  return result;
};

const updateCategoryInDB = async (id: string, payload: Partial<TServiceCategory>) => {
  if (payload.name) {
    const duplicate = await ServiceCategory.findOne({ name: payload.name, _id: { $ne: id } });
    if (duplicate) throw new AppError(httpStatus.CONFLICT, 'Category name already taken');
  }
  const result = await ServiceCategory.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  return result;
};

const deleteCategoryFromDB = async (id: string) => {
  const result = await ServiceCategory.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  return result;
};

const getAllCategoriesListFromDB = async () => {
  const result = await ServiceCategory.find({ isActive: true }).sort('name');
  return result;
};

const getCategoriesWithSubcategoriesFromDB = async () => {
  const categories = await ServiceCategory.find({ isActive: true })
    .select('_id name')
    .sort('name')
    .lean();

  const subcategories = await ServiceSubcategory.find({ isActive: true })
    .select('_id name category')
    .sort('name')
    .lean();

  const subcategoryMap: Record<string, Array<{ _id: string; name: string }>> = {};
  for (const sub of subcategories) {
    const catId = String(sub.category);
    if (!subcategoryMap[catId]) {
      subcategoryMap[catId] = [];
    }
    subcategoryMap[catId].push({ _id: String(sub._id), name: sub.name });
  }

  const result = categories.map((cat) => ({
    _id: String(cat._id),
    name: cat.name,
    subcategories: subcategoryMap[String(cat._id)] || [],
  }));

  return result;
};

export const CategoryServices = {
  getAllCategoriesFromDB,
  getSingleCategoryFromDB,
  createCategoryIntoDB,
  updateCategoryInDB,
  deleteCategoryFromDB,
  getAllCategoriesListFromDB,
  getCategoriesWithSubcategoriesFromDB,
};

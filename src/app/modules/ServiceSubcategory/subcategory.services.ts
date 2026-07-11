import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ServiceSubcategory } from './subcategory.model';
import { TServiceSubcategory } from './subcategory.interface';
import { Amenity } from '../Amenity/amenity.model';

const getAllSubcategoriesFromDB = async (query: Record<string, unknown>) => {
  const subcategoryQuery = new QueryBuilder(
    ServiceSubcategory.find().populate('category', 'name image'),
    query,
  )
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await subcategoryQuery.modelQuery;
  const meta = await subcategoryQuery.countTotal();
  return { meta, result };
};

const getSubcategoriesByCategoryFromDB = async (categoryId: string) => {
  const result = await ServiceSubcategory.find({ category: categoryId, isActive: true }).populate('category', 'name image');
  return result;
};

const getSingleSubcategoryFromDB = async (id: string) => {
  const result = await ServiceSubcategory.findById(id).populate('category', 'name image');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');
  return result;
};

const createSubcategoryIntoDB = async (payload: TServiceSubcategory) => {
  const result = await ServiceSubcategory.create(payload);
  return result;
};

const updateSubcategoryInDB = async (id: string, payload: Partial<TServiceSubcategory>) => {
  const result = await ServiceSubcategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');
  return result;
};

const deleteSubcategoryFromDB = async (id: string) => {
  // Block deletion if amenities exist under this subcategory
  const amenityCount = await Amenity.countDocuments({ subcategory: id });
  if (amenityCount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete subcategory — ${amenityCount} amenit${amenityCount === 1 ? 'y' : 'ies'} still exist under it`,
    );
  }
  const result = await ServiceSubcategory.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');
  return result;
};

const getAllSubcategoriesWithQueryFromDB = async (query: Record<string, unknown>) => {
  const subcategoryQuery = new QueryBuilder(
    ServiceSubcategory.find().populate('category', 'name image'),
    query,
  )
    .search(['name'])
    .filter()
    .sort();

  const result = await subcategoryQuery.modelQuery;
  const meta = await subcategoryQuery.countTotal();
  return { meta, result };
};

const getAllSubcategoriesListFromDB = async () => {
  const result = await ServiceSubcategory.find({ isActive: true })
    .populate('category', 'name image')
    .sort('name');
  return result;
};

export const SubcategoryServices = {
  getAllSubcategoriesFromDB,
  getSubcategoriesByCategoryFromDB,
  getSingleSubcategoryFromDB,
  createSubcategoryIntoDB,
  updateSubcategoryInDB,
  deleteSubcategoryFromDB,
  getAllSubcategoriesWithQueryFromDB,
  getAllSubcategoriesListFromDB,
};
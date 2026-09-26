import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { InspirationCategory } from './inspirationCategory.model';

// ── Create ──
const createInspirationCategoryIntoDB = async (payload: Record<string, unknown>) => {
  const result = await InspirationCategory.create(payload);
  return result;
};

// ── Update ──
const updateInspirationCategoryInDB = async (
  id: string,
  payload: Record<string, unknown>,
) => {
  const result = await InspirationCategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Inspiration category not found');
  return result;
};

// ── Delete ──
const deleteInspirationCategoryFromDB = async (id: string) => {
  const result = await InspirationCategory.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Inspiration category not found');
  return result;
};

// ── Get Single ──
const getSingleInspirationCategoryFromDB = async (id: string) => {
  const result = await InspirationCategory.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Inspiration category not found');
  return result;
};

// ── Get All (Public — only active) ──
const getAllInspirationCategoriesFromDB = async (query: Record<string, unknown>, isAdmin: boolean = false) => {
  const filter = isAdmin ? {} : { isActive: true };
  const categoryQuery = new QueryBuilder(
    InspirationCategory.find(filter),
    query,
  )
    .search(['name', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await categoryQuery.modelQuery;
  const meta = await categoryQuery.countTotal();
  return { meta, result };
};

// ── Get All (Admin — including inactive) ──
const getAdminInspirationCategoriesFromDB = async (query: Record<string, unknown>) => {
  const categoryQuery = new QueryBuilder(
    InspirationCategory.find(),
    query,
  )
    .search(['name', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await categoryQuery.modelQuery;
  const meta = await categoryQuery.countTotal();
  return { meta, result };
};

// ── Get All List (no pagination, for dropdowns) ──
const getAllInspirationCategoriesListFromDB = async () => {
  const result = await InspirationCategory.find({ isActive: true })
    .select('name image')
    .sort({ name: 1 })
    .lean();
  return result;
};

export const InspirationCategoryServices = {
  createInspirationCategoryIntoDB,
  updateInspirationCategoryInDB,
  deleteInspirationCategoryFromDB,
  getSingleInspirationCategoryFromDB,
  getAllInspirationCategoriesFromDB,
  getAdminInspirationCategoriesFromDB,
  getAllInspirationCategoriesListFromDB,
};

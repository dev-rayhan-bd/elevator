import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ServiceArea } from './serviceArea.model';
import { TServiceArea } from './serviceArea.interface';

const getAllServiceAreasFromDB = async (query: Record<string, unknown>) => {
  const areaQuery = new QueryBuilder(ServiceArea.find(), query)
    .search(['name', 'region'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await areaQuery.modelQuery;
  const meta = await areaQuery.countTotal();
  return { meta, result };
};

const getSingleServiceAreaFromDB = async (id: string) => {
  const result = await ServiceArea.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Service area not found');
  return result;
};

const createServiceAreaIntoDB = async (payload: TServiceArea) => {
  const existing = await ServiceArea.findOne({ name: payload.name });
  if (existing) throw new AppError(httpStatus.CONFLICT, 'Service area already exists');
  const result = await ServiceArea.create(payload);
  return result;
};

const updateServiceAreaInDB = async (id: string, payload: Partial<TServiceArea>) => {
  if (payload.name) {
    const duplicate = await ServiceArea.findOne({ name: payload.name, _id: { $ne: id } });
    if (duplicate) throw new AppError(httpStatus.CONFLICT, 'Service area name already taken');
  }
  const result = await ServiceArea.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Service area not found');
  return result;
};

const deleteServiceAreaFromDB = async (id: string) => {
  const result = await ServiceArea.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Service area not found');
  return result;
};

const getAllServiceAreasWithQueryFromDB = async (query: Record<string, unknown>) => {
  const areaQuery = new QueryBuilder(ServiceArea.find(), query)
    .search(['name', 'region'])
    .filter()
    .sort();

  const result = await areaQuery.modelQuery;
  const meta = await areaQuery.countTotal();
  return { meta, result };
};

const getAllServiceAreasListFromDB = async () => {
  const result = await ServiceArea.find({ isActive: true }).sort('name');
  return result;
};

export const ServiceAreaServices = {
  getAllServiceAreasFromDB,
  getSingleServiceAreaFromDB,
  createServiceAreaIntoDB,
  updateServiceAreaInDB,
  deleteServiceAreaFromDB,
  getAllServiceAreasWithQueryFromDB,
  getAllServiceAreasListFromDB,
};

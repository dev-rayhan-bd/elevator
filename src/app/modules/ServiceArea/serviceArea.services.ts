import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ServiceArea } from './serviceArea.model';
import { TServiceArea } from './serviceArea.interface';
import { VendorService } from '../VendorService/vendorService.model';

const getAllServiceAreasFromDB = async (query: Record<string, unknown>) => {
  const sortQuery = { ...query, sort: query.sort || 'order -createdAt' };
  const areaQuery = new QueryBuilder(ServiceArea.find(), sortQuery)
    .search(['name', 'region'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = (await areaQuery.modelQuery.lean()) as any[];
  const meta = await areaQuery.countTotal();

  if (result.length > 0) {
    const areaIds = result.map((a: any) => a._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { isDraft: { $ne: true }, serviceAreas: { $in: areaIds } } },
      { $unwind: '$serviceAreas' },
      { $match: { serviceAreas: { $in: areaIds } } },
      { $group: { _id: '$serviceAreas', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    const enrichedResult = result.map((item: any) => ({
      ...item,
      listingCount: countMap.get(String(item._id)) || 0,
      serviceCount: countMap.get(String(item._id)) || 0,
    }));

    return { meta, result: enrichedResult };
  }

  return { meta, result };
};

const getSingleServiceAreaFromDB = async (id: string) => {
  const result = await ServiceArea.findById(id).lean();
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Service area not found');

  const serviceCount = await VendorService.countDocuments({
    serviceAreas: id,
    isDraft: { $ne: true },
  });

  return {
    ...result,
    listingCount: serviceCount,
    serviceCount,
  };
};

const createServiceAreaIntoDB = async (payload: TServiceArea) => {
  const existing = await ServiceArea.findOne({ name: payload.name });
  if (existing) throw new AppError(httpStatus.CONFLICT, 'Service area already exists');

  if (payload.order === undefined || payload.order === null) {
    const highest = await ServiceArea.findOne().sort('-order').select('order').lean();
    payload.order = highest && highest.order ? highest.order + 1 : 1;
  }

  const result = await ServiceArea.create(payload);
  return result;
};

const reorderServiceAreasInDB = async (items: { id: string; order: number }[]) => {
  if (!items || items.length === 0) {
    return { modifiedCount: 0 };
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } },
    },
  }));

  const result = await ServiceArea.bulkWrite(bulkOps);
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
  const sortQuery = { ...query, sort: query.sort || 'order -createdAt' };
  const areaQuery = new QueryBuilder(ServiceArea.find(), sortQuery)
    .search(['name', 'region'])
    .filter()
    .sort();

  const result = (await areaQuery.modelQuery.lean()) as any[];
  const meta = await areaQuery.countTotal();

  if (result.length > 0) {
    const areaIds = result.map((a: any) => a._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { isDraft: { $ne: true }, serviceAreas: { $in: areaIds } } },
      { $unwind: '$serviceAreas' },
      { $match: { serviceAreas: { $in: areaIds } } },
      { $group: { _id: '$serviceAreas', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    const enrichedResult = result.map((item: any) => ({
      ...item,
      listingCount: countMap.get(String(item._id)) || 0,
      serviceCount: countMap.get(String(item._id)) || 0,
    }));

    return { meta, result: enrichedResult };
  }

  return { meta, result };
};

const getAllServiceAreasListFromDB = async () => {
  const areas = (await ServiceArea.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .lean()) as any[];

  if (areas.length > 0) {
    const areaIds = areas.map((a: any) => a._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { isDraft: { $ne: true }, serviceAreas: { $in: areaIds } } },
      { $unwind: '$serviceAreas' },
      { $match: { serviceAreas: { $in: areaIds } } },
      { $group: { _id: '$serviceAreas', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    return areas.map((item: any) => ({
      ...item,
      listingCount: countMap.get(String(item._id)) || 0,
      serviceCount: countMap.get(String(item._id)) || 0,
    }));
  }

  return areas;
};

export const ServiceAreaServices = {
  getAllServiceAreasFromDB,
  getSingleServiceAreaFromDB,
  createServiceAreaIntoDB,
  updateServiceAreaInDB,
  deleteServiceAreaFromDB,
  getAllServiceAreasWithQueryFromDB,
  getAllServiceAreasListFromDB,
  reorderServiceAreasInDB,
};

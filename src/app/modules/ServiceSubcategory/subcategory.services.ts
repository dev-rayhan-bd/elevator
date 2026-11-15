import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ServiceSubcategory } from './subcategory.model';
import { TServiceSubcategory } from './subcategory.interface';
import { Amenity } from '../Amenity/amenity.model';
import { VendorService } from '../VendorService/vendorService.model';

const getAllSubcategoriesFromDB = async (query: Record<string, unknown>) => {
  const sortQuery = { ...query, sort: query.sort || 'order -createdAt' };
  const subcategoryQuery = new QueryBuilder(
    ServiceSubcategory.find().populate('category', 'name image order'),
    sortQuery,
  )
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = (await subcategoryQuery.modelQuery.lean()) as any[];
  const meta = await subcategoryQuery.countTotal();

  if (result.length > 0) {
    const subcatIds = result.map((s: any) => s._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { subcategory: { $in: subcatIds }, isDraft: { $ne: true } } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    const enriched = result.map((sub: any) => ({
      ...sub,
      listingCount: countMap.get(String(sub._id)) || 0,
      serviceCount: countMap.get(String(sub._id)) || 0,
    }));

    return { meta, result: enriched };
  }

  return { meta, result };
};

const getSubcategoriesByCategoryFromDB = async (categoryId: string) => {
  const result = (await ServiceSubcategory.find({ category: categoryId })
    .populate('category', 'name image order')
    .sort({ order: 1, createdAt: -1 })
    .lean()) as any[];

  if (result.length > 0) {
    const subcatIds = result.map((s: any) => s._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { subcategory: { $in: subcatIds }, isDraft: { $ne: true } } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    return result.map((sub: any) => ({
      ...sub,
      listingCount: countMap.get(String(sub._id)) || 0,
      serviceCount: countMap.get(String(sub._id)) || 0,
    }));
  }

  return result;
};

const getSingleSubcategoryFromDB = async (id: string) => {
  const result = await ServiceSubcategory.findById(id)
    .populate('category', 'name image order')
    .lean();
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');

  const serviceCount = await VendorService.countDocuments({
    subcategory: id,
    isDraft: { $ne: true },
  });

  return {
    ...result,
    listingCount: serviceCount,
    serviceCount,
  };
};

const createSubcategoryIntoDB = async (payload: TServiceSubcategory) => {
  if (payload.order === undefined || payload.order === null) {
    const highest = await ServiceSubcategory.findOne({ category: payload.category })
      .sort('-order')
      .select('order')
      .lean();
    payload.order = highest && highest.order ? highest.order + 1 : 1;
  }
  const result = await ServiceSubcategory.create(payload);
  return result;
};

const reorderSubcategoriesInDB = async (items: { id: string; order: number }[]) => {
  if (!items || items.length === 0) {
    return { modifiedCount: 0 };
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } },
    },
  }));

  const result = await ServiceSubcategory.bulkWrite(bulkOps);
  return result;
};

const updateSubcategoryInDB = async (
  id: string,
  payload: Partial<TServiceSubcategory>,
) => {
  const result = await ServiceSubcategory.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');

  if (payload.isActive !== undefined) {
    if (payload.isActive === false) {
      // Disable vendor services under this subcategory, marking them as disabled
      await VendorService.updateMany(
        { subcategory: id, isActive: true },
        { isActive: false, isCategoryDisabled: true },
      );
    } else if (payload.isActive === true) {
      // Restore vendor services that were disabled by subcategory disable and are approved
      await VendorService.updateMany(
        { subcategory: id, isCategoryDisabled: true, status: 'approved' },
        { isActive: true, isCategoryDisabled: false },
      );
    }
  }

  return result;
};

const deleteSubcategoryFromDB = async (id: string) => {
  // Block deletion if vendor services exist under this subcategory
  const serviceCount = await VendorService.countDocuments({ subcategory: id });
  if (serviceCount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete subcategory — ${serviceCount} service${serviceCount === 1 ? '' : 's'} still exist under it`,
    );
  }

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

const getAllSubcategoriesWithQueryFromDB = async (
  query: Record<string, unknown>,
) => {
  const sortQuery = { ...query, sort: query.sort || 'order -createdAt' };
  const subcategoryQuery = new QueryBuilder(
    ServiceSubcategory.find().populate('category', 'name image order'),
    sortQuery,
  )
    .search(['name'])
    .filter()
    .sort();

  const result = (await subcategoryQuery.modelQuery.lean()) as any[];
  const meta = await subcategoryQuery.countTotal();

  if (result.length > 0) {
    const subcatIds = result.map((s: any) => s._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { subcategory: { $in: subcatIds }, isDraft: { $ne: true } } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    const enriched = result.map((sub: any) => ({
      ...sub,
      listingCount: countMap.get(String(sub._id)) || 0,
      serviceCount: countMap.get(String(sub._id)) || 0,
    }));

    return { meta, result: enriched };
  }

  return { meta, result };
};

const getAllSubcategoriesListFromDB = async () => {
  const result = (await ServiceSubcategory.find({ isActive: true })
    .populate('category', 'name image order')
    .sort({ order: 1, createdAt: -1 })
    .lean()) as any[];

  if (result.length > 0) {
    const subcatIds = result.map((s: any) => s._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { subcategory: { $in: subcatIds }, isDraft: { $ne: true } } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    return result.map((sub: any) => ({
      ...sub,
      listingCount: countMap.get(String(sub._id)) || 0,
      serviceCount: countMap.get(String(sub._id)) || 0,
    }));
  }

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
  reorderSubcategoriesInDB,
};

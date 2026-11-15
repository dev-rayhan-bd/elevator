import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ServiceCategory } from './category.model';
import { ServiceSubcategory } from '../ServiceSubcategory/subcategory.model';
import { TServiceCategory } from './category.interface';
import { Amenity } from '../Amenity/amenity.model';
import { VendorService } from '../VendorService/vendorService.model';
import { EventRequest } from '../EventRequest/eventRequest.model';

const getAllCategoriesFromDB = async (query: Record<string, unknown>) => {
  const sortQuery = { ...query, sort: query.sort || 'order -createdAt' };
  const categoryQuery = new QueryBuilder(ServiceCategory.find(), sortQuery)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = (await categoryQuery.modelQuery.lean()) as any[];
  const meta = await categoryQuery.countTotal();

  if (result.length > 0) {
    const categoryIds = result.map((c: any) => c._id);

    const [serviceCounts, subcatCounts] = await Promise.all([
      VendorService.aggregate([
        { $match: { category: { $in: categoryIds }, isDraft: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      ServiceSubcategory.aggregate([
        { $match: { category: { $in: categoryIds } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const serviceMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );
    const subcatMap = new Map(
      subcatCounts.map((s: any) => [String(s._id), s.count]),
    );

    const enrichedResult = result.map((cat: any) => ({
      ...cat,
      listingCount: serviceMap.get(String(cat._id)) || 0,
      serviceCount: serviceMap.get(String(cat._id)) || 0,
      subcategoryCount: subcatMap.get(String(cat._id)) || 0,
    }));

    return { meta, result: enrichedResult };
  }

  return { meta, result };
};

const getSingleCategoryFromDB = async (id: string) => {
  const result = await ServiceCategory.findById(id).lean();
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');

  const [serviceCount, subcategoryCount] = await Promise.all([
    VendorService.countDocuments({ category: id, isDraft: { $ne: true } }),
    ServiceSubcategory.countDocuments({ category: id }),
  ]);

  return {
    ...result,
    listingCount: serviceCount,
    serviceCount,
    subcategoryCount,
  };
};

const createCategoryIntoDB = async (payload: TServiceCategory) => {
  const existing = await ServiceCategory.findOne({ name: payload.name });
  if (existing) throw new AppError(httpStatus.CONFLICT, 'Category already exists');

  if (payload.order === undefined || payload.order === null) {
    const highest = await ServiceCategory.findOne().sort('-order').select('order').lean();
    payload.order = highest && highest.order ? highest.order + 1 : 1;
  }

  const result = await ServiceCategory.create(payload);
  return result;
};

const reorderCategoriesInDB = async (items: { id: string; order: number }[]) => {
  if (!items || items.length === 0) {
    return { modifiedCount: 0 };
  }

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } },
    },
  }));

  const result = await ServiceCategory.bulkWrite(bulkOps);
  return result;
};

const updateCategoryInDB = async (id: string, payload: Partial<TServiceCategory>) => {
  if (payload.name) {
    const duplicate = await ServiceCategory.findOne({ name: payload.name, _id: { $ne: id } });
    if (duplicate) throw new AppError(httpStatus.CONFLICT, 'Category name already taken');
  }
  const result = await ServiceCategory.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');

  // Cascade disable/enable logic
  if (payload.isActive !== undefined) {
    if (payload.isActive === false) {
      // 1. Disable subcategories under this category
      await ServiceSubcategory.updateMany({ category: id }, { isActive: false });

      // 2. Disable vendor services under this category, marking them as disabled by category
      await VendorService.updateMany(
        { category: id, isActive: true },
        { isActive: false, isCategoryDisabled: true },
      );
    } else if (payload.isActive === true) {
      // 1. Re-enable subcategories under this category
      await ServiceSubcategory.updateMany({ category: id }, { isActive: true });

      // 2. Restore vendor services that were disabled by category disable and are approved
      await VendorService.updateMany(
        { category: id, isCategoryDisabled: true, status: 'approved' },
        { isActive: true, isCategoryDisabled: false },
      );
    }
  }

  return result;
};

const deleteCategoryFromDB = async (id: string) => {
  // Block deletion if subcategories exist under this category
  const subcatCount = await ServiceSubcategory.countDocuments({ category: id });
  if (subcatCount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category — ${subcatCount} subcategor${subcatCount === 1 ? 'y' : 'ies'} still exist under it`,
    );
  }

  // Block deletion if vendor services exist under this category
  const serviceCount = await VendorService.countDocuments({ category: id });
  if (serviceCount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category — ${serviceCount} service${serviceCount === 1 ? '' : 's'} still exist under it`,
    );
  }

  // Block deletion if event requests reference this category
  const eventReqCount = await EventRequest.countDocuments({ serviceCategory: id });
  if (eventReqCount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category — ${eventReqCount} event request${eventReqCount === 1 ? '' : 's'} reference it`,
    );
  }

  // Block deletion if amenities reference this category
  const amenityCount = await Amenity.countDocuments({ category: id });
  if (amenityCount > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category — ${amenityCount} amenit${amenityCount === 1 ? 'y' : 'ies'} still reference it`,
    );
  }

  const result = await ServiceCategory.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  return result;
};

const getAllCategoriesListFromDB = async () => {
  const categories = await ServiceCategory.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  if (categories.length > 0) {
    const categoryIds = categories.map((c) => c._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { category: { $in: categoryIds }, isDraft: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const serviceMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    return categories.map((cat: any) => ({
      ...cat,
      listingCount: serviceMap.get(String(cat._id)) || 0,
      serviceCount: serviceMap.get(String(cat._id)) || 0,
    }));
  }

  return categories;
};

const getCategoriesWithSubcategoriesFromDB = async () => {
  const categories = await ServiceCategory.find({ isActive: true })
    .select('_id name image description isActive order')
    .sort({ order: 1, createdAt: -1 })
    .lean();

  const subcategories = await ServiceSubcategory.find({ isActive: true })
    .select('_id name image category description isActive order')
    .sort({ order: 1, createdAt: -1 })
    .lean();

  // Aggregate service counts per subcategory
  const subcatCounts = await VendorService.aggregate([
    { $match: { isDraft: { $ne: true } } },
    { $group: { _id: '$subcategory', count: { $sum: 1 } } },
  ]);
  const subcatCountMap: Record<string, number> = {};
  for (const item of subcatCounts) {
    if (item._id) subcatCountMap[String(item._id)] = item.count;
  }

  // Aggregate service counts per category
  const catCounts = await VendorService.aggregate([
    { $match: { isDraft: { $ne: true } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const catCountMap: Record<string, number> = {};
  for (const item of catCounts) {
    if (item._id) catCountMap[String(item._id)] = item.count;
  }

  const subcategoryMap: Record<
    string,
    Array<{
      _id: string;
      name: string;
      image?: string;
      description?: string;
      listingCount: number;
      serviceCount: number;
    }>
  > = {};

  for (const sub of subcategories) {
    const catId = String(sub.category);
    if (!subcategoryMap[catId]) {
      subcategoryMap[catId] = [];
    }
    const count = subcatCountMap[String(sub._id)] || 0;
    subcategoryMap[catId].push({
      _id: String(sub._id),
      name: sub.name,
      image: sub.image || '',
      description: sub.description || '',
      listingCount: count,
      serviceCount: count,
    });
  }

  const result = categories.map((cat) => ({
    _id: String(cat._id),
    name: cat.name,
    image: cat.image || '',
    description: cat.description || '',
    listingCount: catCountMap[String(cat._id)] || 0,
    serviceCount: catCountMap[String(cat._id)] || 0,
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
  reorderCategoriesInDB,
};

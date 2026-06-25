import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Amenity } from './amenity.model';
import { TAmenity } from './amenity.interface';

const getAllAmenitiesFromDB = async (query: Record<string, unknown>) => {
  const amenityQuery = new QueryBuilder(
    Amenity.find()
      .populate('category', 'name image')
      .populate('subcategory', 'name image'),
    query,
  )
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await amenityQuery.modelQuery;
  const meta = await amenityQuery.countTotal();
  return { meta, result };
};

const getSingleAmenityFromDB = async (id: string) => {
  const result = await Amenity.findById(id)
    .populate('category', 'name image')
    .populate('subcategory', 'name image');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Amenity not found');
  return result;
};

const createAmenityIntoDB = async (payload: TAmenity) => {
  const existing = await Amenity.findOne({ name: payload.name });
  if (existing) throw new AppError(httpStatus.CONFLICT, 'Amenity already exists');
  const result = await Amenity.create(payload);
  return result;
};

const updateAmenityInDB = async (id: string, payload: Partial<TAmenity>) => {
  if (payload.name) {
    const duplicate = await Amenity.findOne({ name: payload.name, _id: { $ne: id } });
    if (duplicate) throw new AppError(httpStatus.CONFLICT, 'Amenity name already taken');
  }
  const result = await Amenity.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Amenity not found');
  return result;
};

const deleteAmenityFromDB = async (id: string) => {
  const result = await Amenity.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Amenity not found');
  return result;
};

const getAmenitiesByCategoryAndSubcategoryFromDB = async (
  categoryId: string,
  subcategoryId: string,
) => {
  const result = await Amenity.find({
    category: categoryId,
    subcategory: subcategoryId,
    isActive: true,
  })
    .populate('category', 'name image')
    .populate('subcategory', 'name image');
  return result;
};

export const AmenityServices = {
  getAllAmenitiesFromDB,
  getSingleAmenityFromDB,
  createAmenityIntoDB,
  updateAmenityInDB,
  deleteAmenityFromDB,
  getAmenitiesByCategoryAndSubcategoryFromDB,
};

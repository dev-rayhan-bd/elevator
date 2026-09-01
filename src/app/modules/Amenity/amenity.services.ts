import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Amenity } from './amenity.model';
import { TAmenity } from './amenity.interface';
import { ServiceSubcategory } from '../ServiceSubcategory/subcategory.model';

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
  const existing = await Amenity.findOne({
    name: payload.name,
    subcategory: payload.subcategory,
  });
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Amenity already exists in this subcategory',
    );
  }

  // Validate subcategory exists if provided
  if (payload.subcategory) {
    const subcat = await ServiceSubcategory.findById(payload.subcategory);
    if (!subcat) {
      throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');
    }
  }

  const result = await Amenity.create(payload);
  return result;
};

const updateAmenityInDB = async (id: string, payload: Partial<TAmenity>) => {
  const current = await Amenity.findById(id);
  if (!current) throw new AppError(httpStatus.NOT_FOUND, 'Amenity not found');

  if (payload.name || payload.subcategory) {
    const name = payload.name || current.name;
    const subcategory = payload.subcategory || current.subcategory;

    const duplicate = await Amenity.findOne({
      name,
      subcategory,
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Amenity name already taken in this subcategory',
      );
    }
  }
  const result = await Amenity.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
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

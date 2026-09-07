import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Amenity } from './amenity.model';
import { TAmenity } from './amenity.interface';
import { ServiceSubcategory } from '../ServiceSubcategory/subcategory.model';

const getAllAmenitiesFromDB = async (query: Record<string, unknown>) => {
  const filterQuery = { ...query };
  if (filterQuery.categoryId) {
    filterQuery.category = filterQuery.categoryId;
    delete filterQuery.categoryId;
  }
  if (filterQuery.subcategoryId) {
    filterQuery.subcategory = filterQuery.subcategoryId;
    delete filterQuery.subcategoryId;
  }

  const amenityQuery = new QueryBuilder(
    Amenity.find()
      .populate('category', 'name image')
      .populate('subcategory', 'name image'),
    filterQuery,
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

const createAmenityIntoDB = async (payload: any) => {
  const category = payload.category || payload.categoryId;
  const subcategory = payload.subcategory || payload.subcategoryId;
  const name = payload.name ? String(payload.name).trim() : '';

  if (!name) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Amenity name is required');
  }

  payload.category = category;
  payload.subcategory = subcategory;
  payload.name = name;

  const existingQuery: Record<string, any> = {
    name: { $regex: new RegExp(`^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
  };

  if (subcategory) {
    existingQuery.subcategory = subcategory;
  } else if (category) {
    existingQuery.category = category;
  }

  const existing = await Amenity.findOne(existingQuery);
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Amenity already exists in this subcategory',
    );
  }

  // Validate subcategory exists if provided
  if (subcategory) {
    const subcat = await ServiceSubcategory.findById(subcategory);
    if (!subcat) {
      throw new AppError(httpStatus.NOT_FOUND, 'Subcategory not found');
    }
  }

  const result = await Amenity.create(payload);
  return result;
};

const updateAmenityInDB = async (id: string, payload: any) => {
  const current = await Amenity.findById(id);
  if (!current) throw new AppError(httpStatus.NOT_FOUND, 'Amenity not found');

  const category = payload.category || payload.categoryId || current.category;
  const subcategory = payload.subcategory || payload.subcategoryId || current.subcategory;
  const name = payload.name !== undefined ? String(payload.name).trim() : current.name;

  payload.category = category;
  payload.subcategory = subcategory;
  payload.name = name;

  if (payload.name !== undefined || payload.subcategory || payload.subcategoryId) {
    const duplicateQuery: Record<string, any> = {
      name: { $regex: new RegExp(`^${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
      _id: { $ne: id },
    };
    if (subcategory) {
      duplicateQuery.subcategory = subcategory;
    } else if (category) {
      duplicateQuery.category = category;
    }

    const duplicate = await Amenity.findOne(duplicateQuery);
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

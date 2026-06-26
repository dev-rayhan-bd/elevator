import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { VendorService } from './vendorService.model';
import { TVendorService } from './vendorService.interface';

const getAllVendorServicesFromDB = async (query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    VendorService.find()
      .populate('vendor', 'firstName lastName fullName image')
      .populate('category', 'name icon')
      .populate('subcategory', 'name image')
      .populate('eventTypes', 'name image')
      .populate('serviceAreas', 'name region')
      .populate('amenities', 'name icon'),
    query,
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

const getVendorServicesByVendorFromDB = async (
  vendorId: string,
  query: Record<string, unknown>,
) => {
  const serviceQuery = new QueryBuilder(
    VendorService.find({ vendor: new Types.ObjectId(vendorId) })
      .populate('category', 'name icon')
      .populate('subcategory', 'name')
      .populate('eventTypes', 'name image')
      .populate('serviceAreas', 'name')
      .populate('amenities', 'name icon'),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

const getPublicVendorServicesFromDB = async (query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    VendorService.find({ isActive: true })
      .populate(
        'vendor',
        'firstName lastName fullName image lat long vendor.businessName vendor.location vendor.profileScore vendor.isVerifiedBadge',
      )
      .populate('category', 'name icon')
      .populate('subcategory', 'name')
      .populate('eventTypes', 'name image')
      .populate('serviceAreas', 'name')
      .populate('amenities', 'name icon'),
    query,
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

const getSingleVendorServiceFromDB = async (id: string) => {
  const result = await VendorService.findById(id)
    .populate(
      'vendor',
      'firstName lastName fullName image email phone lat long vendor',
    )
    .populate('category', 'name icon description')
    .populate('subcategory', 'name')
    .populate('eventTypes', 'name image')
    .populate('serviceAreas', 'name region')
    .populate('amenities', 'name icon');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  return result;
};

const createVendorServiceIntoDB = async (
  vendorId: string,
  payload: Record<string, unknown>,
) => {
  const serviceData = {
    ...payload,
    vendor: new Types.ObjectId(vendorId),
  } as TVendorService;

  const result = await VendorService.create(serviceData);
  return result;
};

const updateVendorServiceInDB = async (
  vendorId: string,
  serviceId: string,
  payload: Record<string, unknown>,
) => {
  const service = await VendorService.findOne({
    _id: new Types.ObjectId(serviceId),
    vendor: new Types.ObjectId(vendorId),
  });
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Service not found or unauthorized');

  const result = await VendorService.findByIdAndUpdate(serviceId, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteVendorServiceFromDB = async (vendorId: string, serviceId: string) => {
  const service = await VendorService.findOne({
    _id: new Types.ObjectId(serviceId),
    vendor: new Types.ObjectId(vendorId),
  });
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Service not found or unauthorized');
  await VendorService.findByIdAndDelete(serviceId);
  return service;
};

const adminToggleServiceStatusInDB = async (
  serviceId: string,
  updates: { isFeatured?: boolean; isActive?: boolean },
) => {
  const result = await VendorService.findByIdAndUpdate(serviceId, updates, {
    new: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  return result;
};

export const VendorServiceServices = {
  getAllVendorServicesFromDB,
  getVendorServicesByVendorFromDB,
  getPublicVendorServicesFromDB,
  getSingleVendorServiceFromDB,
  createVendorServiceIntoDB,
  updateVendorServiceInDB,
  deleteVendorServiceFromDB,
  adminToggleServiceStatusInDB,
};

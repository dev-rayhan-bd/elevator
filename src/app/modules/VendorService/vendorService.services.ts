import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { VendorService } from './vendorService.model';
import { TVendorService } from './vendorService.interface';

const getAllVendorServicesFromDB = async (query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    VendorService.find()
      .populate('vendor', 'firstName lastName fullName image')
      .populate('category', 'name icon')
      .populate('subcategory', 'name')
      .populate('amenities', 'name icon')
      .populate('serviceAreas', 'name region'),
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

const getVendorServicesByVendorFromDB = async (vendorId: string, query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    VendorService.find({ vendor: vendorId })
      .populate('category', 'name icon')
      .populate('subcategory', 'name')
      .populate('amenities', 'name icon')
      .populate('serviceAreas', 'name'),
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
      .populate('vendor', 'firstName lastName fullName image lat long vendor.businessName vendor.location vendor.profileScore vendor.isVerifiedBadge')
      .populate('category', 'name icon')
      .populate('subcategory', 'name')
      .populate('amenities', 'name icon')
      .populate('serviceAreas', 'name'),
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
    .populate('vendor', 'firstName lastName fullName image email phone lat long vendor')
    .populate('category', 'name icon description')
    .populate('subcategory', 'name')
    .populate('amenities', 'name icon description')
    .populate('serviceAreas', 'name region');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  return result;
};

const createVendorServiceIntoDB = async (vendorId: string, payload: TVendorService) => {
  payload.vendor = vendorId as any;
  const result = await VendorService.create(payload);
  return result;
};

const updateVendorServiceInDB = async (
  vendorId: string,
  serviceId: string,
  payload: Partial<TVendorService>,
) => {
  const service = await VendorService.findOne({ _id: serviceId, vendor: vendorId });
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Service not found or unauthorized');

  const result = await VendorService.findByIdAndUpdate(serviceId, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteVendorServiceFromDB = async (vendorId: string, serviceId: string) => {
  const service = await VendorService.findOne({ _id: serviceId, vendor: vendorId });
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Service not found or unauthorized');
  await VendorService.findByIdAndDelete(serviceId);
  return service;
};

// Admin: toggle featured or active status
const adminToggleServiceStatusInDB = async (
  serviceId: string,
  updates: { isFeatured?: boolean; isActive?: boolean },
) => {
  const result = await VendorService.findByIdAndUpdate(serviceId, updates, { new: true });
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

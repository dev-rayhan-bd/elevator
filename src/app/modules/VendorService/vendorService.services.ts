import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { VendorService } from './vendorService.model';
import { TVendorService } from './vendorService.interface';
import { User } from '../User/user.model';
import { ReviewServices } from '../Review/review.services';

const getAllVendorServicesFromDB = async (query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    VendorService.find()
      .populate('vendor', 'firstName lastName fullName image')
      .populate('category', 'name image')
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
    VendorService.find({
      vendor: new Types.ObjectId(vendorId),
      isDraft: { $ne: true },
    })
      .populate('category', 'name image')
      .populate('subcategory', 'name image')
      .populate('eventTypes', 'name image')
      .populate('serviceAreas', 'name region')
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

const getPublicVendorServicesFromDB = async (
  query: Record<string, unknown>,
  userId?: string,
) => {
  const serviceQuery = new QueryBuilder(
    VendorService.find({ isActive: true, isDraft: { $ne: true } })
      .populate(
        'vendor',
        'firstName lastName fullName image lat long vendor.businessName vendor.location vendor.profileScore vendor.isVerifiedBadge',
      )
      .populate('category', 'name image')
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

  // If user is authenticated, attach isFav field
  if (userId) {
    const user = await User.findById(userId).select('favoriteServices');
    const favSet = new Set(
      (user?.favoriteServices ?? []).map((id: Types.ObjectId) => id.toString()),
    );
    const enriched = result.map((service) => ({
      ...service.toObject(),
      isFav: favSet.has(service._id.toString()),
    }));
    return { meta, result: enriched };
  }

  return { meta, result };
};

const getSingleVendorServiceFromDB = async (
  id: string,
  userId?: string,
  reviewPage?: number,
  reviewLimit?: number,
) => {
  const result = await VendorService.findById(id)
    .populate(
      'vendor',
      'firstName lastName fullName image email phone lat long vendor',
    )
    .populate('category', 'name image description')
    .populate('subcategory', 'name image')
    .populate('eventTypes', 'name image')
    .populate('serviceAreas', 'name region')
    .populate('amenities', 'name icon');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Service not found');

  // Fetch reviews + rating summary for this service
  const reviewData = await ReviewServices.getServiceReviewsWithSummary(
    id,
    reviewPage || 1,
    reviewLimit || 10,
  );

  // Attach isFav if user is logged in
  let isFav = false;
  if (userId) {
    const user = await User.findById(userId).select('favoriteServices');
    const favSet = new Set(
      (user?.favoriteServices ?? []).map((id: Types.ObjectId) => id.toString()),
    );
    isFav = favSet.has(result._id.toString());
  }

  return {
    ...result.toObject(),
    isFav,
    reviews: reviewData.reviews,
    ratingSummary: reviewData.summary,
    reviewPagination: reviewData.pagination,
  };
};

const createVendorServiceIntoDB = async (
  vendorId: string,
  payload: Record<string, unknown>,
) => {
  const serviceData = {
    ...payload,
    vendor: new Types.ObjectId(vendorId),
    isDraft: false,
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

  // If images are provided, append them to existing images instead of replacing
  if (payload.images && Array.isArray(payload.images) && payload.images.length > 0) {
    const { images, ...otherUpdates } = payload;
    const result = await VendorService.findByIdAndUpdate(
      serviceId,
      { $set: otherUpdates, $push: { images: { $each: images as string[] } } },
      { new: true, runValidators: true },
    );
    return result;
  }

  const result = await VendorService.findByIdAndUpdate(serviceId, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteServiceImagesFromDB = async (
  vendorId: string,
  serviceId: string,
  imageUrls: string[],
) => {
  const service = await VendorService.findOne({
    _id: new Types.ObjectId(serviceId),
    vendor: new Types.ObjectId(vendorId),
  });
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Service not found or unauthorized');

  const result = await VendorService.findByIdAndUpdate(
    serviceId,
    { $pull: { images: { $in: imageUrls } } },
    { new: true },
  );
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

const getMyServicesListFromDB = async (vendorId: string) => {
  const result = await VendorService.find({
    vendor: new Types.ObjectId(vendorId),
    isDraft: { $ne: true },
  })
    .select('title')
    .sort('-createdAt');
    
  return result;
};

const saveDraftInDB = async (
  vendorId: string,
  payload: Record<string, unknown>,
) => {
  const draftData = {
    ...payload,
    vendor: new Types.ObjectId(vendorId),
    isDraft: true,
  } as TVendorService;

  const result = await VendorService.create(draftData);
  return result;
};

const getMyDraftsFromDB = async (vendorId: string) => {
  const result = await VendorService.find({
    vendor: new Types.ObjectId(vendorId),
    isDraft: true,
  })
    .populate('category', 'name image')
    .populate('subcategory', 'name image')
    .populate('eventTypes', 'name image')
    .populate('serviceAreas', 'name region')
    .populate('amenities', 'name icon')
    .sort('-updatedAt');

  return result;
};

const publishDraftFromDB = async (
  vendorId: string,
  draftId: string,
  payload: Record<string, unknown>,
) => {
  const service = await VendorService.findOne({
    _id: new Types.ObjectId(draftId),
    vendor: new Types.ObjectId(vendorId),
    isDraft: true,
  });
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Draft not found or unauthorized');

  const result = await VendorService.findByIdAndUpdate(
    draftId,
    { $set: { ...payload, isDraft: false } },
    { new: true, runValidators: true },
  );
  return result;
};

const deleteDraftFromDB = async (vendorId: string, draftId: string) => {
  const service = await VendorService.findOneAndDelete({
    _id: new Types.ObjectId(draftId),
    vendor: new Types.ObjectId(vendorId),
    isDraft: true,
  });
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Draft not found or unauthorized');
  return service;
};

const getAllPublishedServicesFromDB = async (query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    VendorService.find({ isDraft: { $ne: true } })
      .populate(
        'vendor',
        'firstName lastName fullName image lat long vendor.businessName vendor.location vendor.profileScore vendor.isVerifiedBadge',
      )
      .populate('category', 'name image')
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

// ── Favourite / Unfavourite ──

const toggleFavServiceInDB = async (userId: string, serviceId: string) => {
  const service = await VendorService.findById(serviceId);
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Service not found');

  const user = await User.findById(userId).select('favoriteServices');
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const objectId = new Types.ObjectId(serviceId);
  const alreadyFav = user.favoriteServices?.some((id: Types.ObjectId) =>
    id.equals(objectId),
  );

  if (alreadyFav) {
    await User.findByIdAndUpdate(userId, {
      $pull: { favoriteServices: objectId },
    });
    return { message: 'Service removed from favorites', isFav: false };
  } else {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { favoriteServices: objectId },
    });
    return { message: 'Service added to favorites', isFav: true };
  }
};

const getFavServicesFromDB = async (userId: string, query: Record<string, unknown>) => {
  const user = await User.findById(userId).select('favoriteServices');
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const favIds = user.favoriteServices ?? [];

  const serviceQuery = new QueryBuilder(
    VendorService.find({ _id: { $in: favIds }, isDraft: { $ne: true } })
      .populate(
        'vendor',
        'firstName lastName fullName image lat long vendor.businessName vendor.location vendor.profileScore vendor.isVerifiedBadge',
      )
      .populate('category', 'name image')
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

  const enriched = result.map((service) => ({
    ...service.toObject(),
    isFav: true,
  }));

  return { meta, result: enriched };
};

export const VendorServiceServices = {
  getAllVendorServicesFromDB,
  getVendorServicesByVendorFromDB,
  getPublicVendorServicesFromDB,
  getAllPublishedServicesFromDB,
  getSingleVendorServiceFromDB,
  createVendorServiceIntoDB,
  updateVendorServiceInDB,
  deleteVendorServiceFromDB,
  adminToggleServiceStatusInDB,
  deleteServiceImagesFromDB,
  getMyServicesListFromDB,
  saveDraftInDB,
  getMyDraftsFromDB,
  publishDraftFromDB,
  deleteDraftFromDB,
  toggleFavServiceInDB,
  getFavServicesFromDB,
};

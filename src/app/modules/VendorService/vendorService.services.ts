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
  // ── Extract special filter params ──
  const {
    category,
    subcategory,
    area,
    minPrice,
    maxPrice,
    sortByPrice,
    rating,
    isVerified,
    isFav,
    ...restQuery
  } = query as Record<string, unknown>;

  // ── Build base filter ──
  const filter: Record<string, any> = { isActive: true, isDraft: { $ne: true } };
  const idAndConditions: any[] = []; // for $and intersection of _id filters

  // Category filter
  if (category) {
    filter.category = new Types.ObjectId(category as string);
  }

  // Subcategory filter
  if (subcategory) {
    filter.subcategory = new Types.ObjectId(subcategory as string);
  }

  // Area filter — serviceAreas is an array; match if the area ID is in the array
  if (area) {
    filter.serviceAreas = { $in: [new Types.ObjectId(area as string)] };
  }

  // Price range filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // isVerified filter — lookup verified vendor IDs
  if (isVerified === 'true' || isVerified === true) {
    const verifiedVendors = await User.find({
      role: 'vendor',
      'vendor.isVerifiedBadge': true,
    })
      .select('_id')
      .lean();
    const vendorIds = verifiedVendors.map((v) => v._id);
    if (vendorIds.length === 0) {
      return {
        meta: { page: 1, limit: 10, total: 0, totalPage: 0 },
        result: [],
      };
    }
    filter.vendor = { $in: vendorIds };
  }

  // Rating filter — aggregate to find services with avg rating >= threshold
  if (rating) {
    const minRating = Number(rating);
    const { Review } = await import('../Review/review.model');
    const ratingAgg = await Review.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$service',
          avgRating: { $avg: '$rating' },
        },
      },
      { $match: { avgRating: { $gte: minRating } } },
    ]);
    const ratedServiceIds = ratingAgg.map(
      (r: { _id: Types.ObjectId }) => r._id,
    );
    if (ratedServiceIds.length === 0) {
      return {
        meta: { page: 1, limit: 10, total: 0, totalPage: 0 },
        result: [],
      };
    }
    idAndConditions.push({ _id: { $in: ratedServiceIds } });
  }

  // isFav filter — only return user's favorited services
  let favSet: Set<string> | null = null;
  if (userId) {
    const user = await User.findById(userId).select('favoriteServices');
    const userFavs = user?.favoriteServices ?? [];
    favSet = new Set(
      userFavs.map((id: Types.ObjectId) => id.toString()),
    );

    if (isFav === 'true' || isFav === true) {
      // Convert to plain ObjectId array for reliable $in query
      const favIds = userFavs.map((id) => new Types.ObjectId(id.toString()));
      if (favIds.length === 0) {
        return {
          meta: { page: 1, limit: 10, total: 0, totalPage: 0 },
          result: [],
        };
      }
      idAndConditions.push({ _id: { $in: favIds } });
    }
  } else if (isFav === 'true' || isFav === true) {
    // isFav requires authentication — no token = no favorites
    return {
      meta: { page: 1, limit: 10, total: 0, totalPage: 0 },
      result: [],
    };
  }

  // Intersect all _id conditions using $and when multiple exist
  if (idAndConditions.length > 1) {
    filter.$and = idAndConditions;
  } else if (idAndConditions.length === 1) {
    filter._id = idAndConditions[0]._id;
  }

  // ── Build sort ──
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  if (sortByPrice === 'asc') {
    sortObj = { price: 1 };
  } else if (sortByPrice === 'desc') {
    sortObj = { price: -1 };
  }

  // ── Pagination ──
  const page = Number(restQuery.page) || 1;
  const limit = Number(restQuery.limit) || 10;
  const skip = (page - 1) * limit;

  // ── Execute query ──
  const [result, total] = await Promise.all([
    VendorService.find(filter)
      .populate(
        'vendor',
        'firstName lastName fullName image lat long vendor.businessName vendor.location vendor.profileScore vendor.isVerifiedBadge',
      )
      .populate('category', 'name image')
      .populate('subcategory', 'name image')
      .populate('eventTypes', 'name image')
      .populate('serviceAreas', 'name region')
      .populate('amenities', 'name icon')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    VendorService.countDocuments(filter),
  ]);

  // ── Search (post-query text search on title & description) ──
  const searchTerm = (restQuery.search as string) || '';
  let filteredResult = result;
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    filteredResult = result.filter(
      (s: any) =>
        (s.title && regex.test(s.title)) ||
        (s.description && regex.test(s.description)),
    );
  }

  // ── Enrich with isFav if user is authenticated ──
  if (favSet) {
    filteredResult = filteredResult.map((service: any) => ({
      ...service,
      isFav: favSet!.has(service._id.toString()),
    }));
  }

  // ── Enrich with rating (average + review count) for each service ──
  const serviceIds = filteredResult.map((s: any) => s._id);
  const { Review } = await import('../Review/review.model');
  const ratingAgg = await Review.aggregate([
    { $match: { service: { $in: serviceIds }, isDeleted: false } },
    {
      $group: {
        _id: '$service',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const ratingMap: Record<string, { avgRating: number; reviewCount: number }> = {};
  for (const r of ratingAgg) {
    ratingMap[r._id.toString()] = {
      avgRating: Math.round(r.avgRating * 10) / 10,
      reviewCount: r.reviewCount,
    };
  }

  filteredResult = filteredResult.map((service: any) => ({
    ...service,
    rating: ratingMap[service._id.toString()]?.avgRating ?? 0,
    reviewCount: ratingMap[service._id.toString()]?.reviewCount ?? 0,
  }));

  const totalPage = Math.ceil(total / limit);
  const meta = { page, limit, total, totalPage };

  return { meta, result: filteredResult };
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

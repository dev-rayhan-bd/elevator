import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { VendorService } from './vendorService.model';
import { TVendorService } from './vendorService.interface';
import { User } from '../User/user.model';
import { ReviewServices } from '../Review/review.services';
import { VendorPromotion } from '../Promotion/promotion.model';

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
    eventTypes,
    minPrice,
    maxPrice,
    sortByPrice,
    rating,
    isVerified,
    isFav,
    ...restQuery
  } = query as Record<string, unknown>;

  // ── Pagination (early — caps limit to prevent abuse) ──
  const page = Number(restQuery.page) || 1;
  const limit = Math.min(Number(restQuery.limit) || 10, 50);
  const skip = (page - 1) * limit;

  // ── Build base filter (direct DB fields — all indexed) ──
  const filter: Record<string, any> = { isActive: true, isDraft: { $ne: true } };

  if (category) {
    filter.category = new Types.ObjectId(category as string);
  }
  if (subcategory) {
    filter.subcategory = new Types.ObjectId(subcategory as string);
  }
  if (area) {
    filter.serviceAreas = { $in: [new Types.ObjectId(area as string)] };
  }
  if (eventTypes) {
    const etIds = Array.isArray(eventTypes)
      ? eventTypes.map((id: any) => new Types.ObjectId(String(id)))
      : String(eventTypes).split(',').map((id: string) => new Types.ObjectId(id.trim()));
    filter.eventTypes = { $in: etIds };
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // ── Search (filter-level regex → accurate count + pagination) ──
  const searchTerm = (restQuery.search as string) || '';
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  // ── Parallel User lookups (isSponsored + isVerified + isFav) ──
  const needVerified = isVerified === 'true' || isVerified === true;
  const needFav = isFav === 'true' || isFav === true;

  const [sponsoredVendorIds, verifiedVendorIds, userFavs] = await Promise.all([
    // Get all sponsored vendor IDs for search ranking
    User.find({ isSponsored: true, role: 'vendor' })
      .select('_id')
      .lean()
      .then((v) => v.map((d) => d._id)),
    needVerified
      ? User.find({ role: 'vendor', 'vendor.isVerifiedBadge': true })
          .select('_id')
          .lean()
          .then((v) => v.map((d) => d._id))
      : Promise.resolve(null),
    userId
      ? User.findById(userId).select('favoriteServices').lean()
          .then((u) => u?.favoriteServices ?? [])
      : Promise.resolve([]),
  ]);

  // isVerified filter
  if (needVerified) {
    if (!verifiedVendorIds || verifiedVendorIds.length === 0) {
      return { meta: { page: 1, limit, total: 0, totalPage: 0 }, result: [] };
    }
    filter.vendor = { $in: verifiedVendorIds };
  }

  // isFav filter — build _id set on filter
  let favSet: Set<string> | null = null;
  if (userId) {
    favSet = new Set(userFavs.map((id: any) => id.toString()));
  }

  if (needFav && !userId) {
    return { meta: { page: 1, limit, total: 0, totalPage: 0 }, result: [] };
  }
  if (needFav && favSet && favSet.size === 0) {
    return { meta: { page: 1, limit, total: 0, totalPage: 0 }, result: [] };
  }
  if (needFav && favSet && favSet.size > 0) {
    filter._id = { $in: [...favSet].map((id) => new Types.ObjectId(id)) };
  }

  // ── Rating filter (scoped — only aggregates reviews for candidate services) ──
  if (rating) {
    const minRating = Number(rating);
    const { Review } = await import('../Review/review.model');

    // Step 1: get candidate service IDs that pass the base filter
    const candidateIds = await VendorService.distinct('_id', filter);
    if (candidateIds.length === 0) {
      return { meta: { page: 1, limit, total: 0, totalPage: 0 }, result: [] };
    }

    // Step 2: aggregate ONLY those candidate reviews (not all reviews)
    const ratingAgg = await Review.aggregate([
      { $match: { service: { $in: candidateIds }, isDeleted: false } },
      { $group: { _id: '$service', avgRating: { $avg: '$rating' } } },
      { $match: { avgRating: { $gte: minRating } } },
    ]);
    const ratedIds = new Set(ratingAgg.map((r: any) => r._id.toString()));

    if (ratedIds.size === 0) {
      return { meta: { page: 1, limit, total: 0, totalPage: 0 }, result: [] };
    }

    // Step 3: intersect with existing _id filter (isFav) if present
    if (filter._id?.$in) {
      const currentIds: Types.ObjectId[] = filter._id.$in;
      const intersected = currentIds.filter((id) => ratedIds.has(id.toString()));
      if (intersected.length === 0) {
        return { meta: { page: 1, limit, total: 0, totalPage: 0 }, result: [] };
      }
      filter._id = { $in: intersected };
    } else {
      filter._id = { $in: [...ratedIds].map((id) => new Types.ObjectId(id)) };
    }
  }

  // ── Sort (prioritize sponsored vendors, then profileScore descending) ──
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  if (sortByPrice === 'asc') sortObj = { price: 1 };
  else if (sortByPrice === 'desc') sortObj = { price: -1 };

  // ── Execute query (find + count in parallel) ──
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

  // ── Sort sponsored vendors first (search ranking) ──
  let enrichedResult = result;
  if (sponsoredVendorIds.length > 0) {
    const sponsoredSet = new Set(sponsoredVendorIds.map((id: any) => id.toString()));
    enrichedResult = [...result].sort((a: any, b: any) => {
      const aSponsored = sponsoredSet.has(a.vendor?._id?.toString() || a.vendor?.toString());
      const bSponsored = sponsoredSet.has(b.vendor?._id?.toString() || b.vendor?.toString());
      if (aSponsored && !bSponsored) return -1;
      if (!aSponsored && bSponsored) return 1;
      // Both sponsored or both not — sort by vendor profileScore descending
      const aScore = a.vendor?.profileScore || 0;
      const bScore = b.vendor?.profileScore || 0;
      return bScore - aScore;
    });
  }

  // ── Enrich: isFav ──
  if (favSet) {
    enrichedResult = enrichedResult.map((s: any) => ({
      ...s,
      isFav: favSet!.has(s._id.toString()),
    }));
  }

  // ── Enrich: rating + reviewCount (only for returned page) ──
  if (enrichedResult.length > 0) {
    const serviceIds = enrichedResult.map((s: any) => s._id);
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

    enrichedResult = enrichedResult.map((s: any) => ({
      ...s,
      rating: ratingMap[s._id.toString()]?.avgRating ?? 0,
      reviewCount: ratingMap[s._id.toString()]?.reviewCount ?? 0,
    }));
  }

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    result: enrichedResult,
  };
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
    reviewPagination: reviewData.meta,
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

// ── Home Feed: Recent Vendors (last 30 days) ──

const getRecentVendorsFromDB = async (query: Record<string, unknown>) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {
    role: 'vendor',
    createdAt: { $gte: thirtyDaysAgo },
  };

  const [vendors, total] = await Promise.all([
    User.find(filter)
      .select('firstName lastName fullName image vendor.businessName vendor.location vendor.isVerifiedBadge vendor.profileScore createdAt')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  // Enrich each vendor with their active service count
  const vendorIds = vendors.map((v) => v._id);
  const serviceCounts = await VendorService.aggregate([
    { $match: { vendor: { $in: vendorIds }, isActive: true, isDraft: { $ne: true } } },
    { $group: { _id: '$vendor', count: { $sum: 1 } } },
  ]);

  const countMap: Record<string, number> = {};
  for (const sc of serviceCounts) {
    countMap[sc._id.toString()] = sc.count;
  }

  const result = vendors.map((v) => ({
    _id: v._id,
    firstName: v.firstName,
    lastName: v.lastName,
    fullName: v.fullName,
    image: v.image,
    businessName: (v as any).vendor?.businessName || '',
    location: (v as any).vendor?.location || null,
    isVerifiedBadge: (v as any).vendor?.isVerifiedBadge || false,
    profileScore: (v as any).vendor?.profileScore || 0,
    serviceCount: countMap[v._id.toString()] || 0,
    joinedAt: (v as any).createdAt,
  }));

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    result,
  };
};

/**
 * PUBLIC: Featured vendors' services with sponsored tags
 * Returns services from vendors who hold an active 'featured' promotion
 * in VendorPromotion, each tagged with isSponsored=true if the vendor
 * also holds an active 'sponsored' promotion.
 *
 * NOTE: We query VendorPromotion directly instead of User.isFeatured
 * because the flag is only synced when admin confirms payment.
 */
const getFeaturedVendorServicesFromDB = async (
  query: Record<string, unknown>,
  userId?: string,
) => {
  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 50);
  const skip = (page - 1) * limit;
  const now = new Date();

  // 1. Find vendor IDs with an active 'featured' promotion
  const featuredPromos = await VendorPromotion.find({
    promotionCategory: 'featured',
    status: 'active',
    isActive: true,
    endDate: { $gt: now },
  })
    .select('vendor')
    .lean();

  const vendorIds = [...new Set(featuredPromos.map((p) => p.vendor.toString()))];
  if (vendorIds.length === 0) {
    return {
      meta: { page: 1, limit, total: 0, totalPage: 0 },
      result: [],
    };
  }

  // 2. Find vendor IDs with an active 'sponsored' promotion
  const sponsoredPromos = await VendorPromotion.find({
    vendor: { $in: vendorIds },
    promotionCategory: 'sponsored',
    status: 'active',
    isActive: true,
    endDate: { $gt: now },
  })
    .select('vendor')
    .lean();

  const sponsoredSet = new Set(
    sponsoredPromos.map((p) => p.vendor.toString()),
  );

  // 3. Fetch active services from featured vendors
  const [result, total] = await Promise.all([
    VendorService.find({
      vendor: { $in: vendorIds.map((id) => new Types.ObjectId(id)) },
      isActive: true,
      isDraft: { $ne: true },
    })
      .populate(
        'vendor',
        'firstName lastName fullName image lat long vendor.businessName vendor.location vendor.profileScore vendor.isVerifiedBadge',
      )
      .populate('category', 'name image')
      .populate('subcategory', 'name image')
      .populate('eventTypes', 'name image')
      .populate('serviceAreas', 'name region')
      .populate('amenities', 'name icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    VendorService.countDocuments({
      vendor: { $in: vendorIds.map((id) => new Types.ObjectId(id)) },
      isActive: true,
      isDraft: { $ne: true },
    }),
  ]);

  // 4. Enrich each service with isSponsored tag
  let enrichedResult = result.map((service: any) => {
    const vendorId = service.vendor?._id?.toString() || service.vendor?.toString();
    return {
      ...service,
      isSponsored: sponsoredSet.has(vendorId),
    };
  });

  // Sort: sponsored first, then by profileScore
  enrichedResult.sort((a: any, b: any) => {
    if (a.isSponsored && !b.isSponsored) return -1;
    if (!a.isSponsored && b.isSponsored) return 1;
    return (b.vendor?.profileScore || 0) - (a.vendor?.profileScore || 0);
  });

  // 5. Attach favourite flag if user is logged in
  if (userId) {
    const user = await User.findById(userId)
      .select('favoriteServices')
      .lean();
    const favSet = new Set(
      (user?.favoriteServices ?? []).map((id: any) => id.toString()),
    );
    enrichedResult = enrichedResult.map((s: any) => ({
      ...s,
      isFav: favSet.has(s._id.toString()),
    }));
  }

  // 6. Attach rating + reviewCount
  if (enrichedResult.length > 0) {
    const serviceIds = enrichedResult.map((s: any) => s._id);
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
    enrichedResult = enrichedResult.map((s: any) => ({
      ...s,
      rating: ratingMap[s._id.toString()]?.avgRating ?? 0,
      reviewCount: ratingMap[s._id.toString()]?.reviewCount ?? 0,
    }));
  }

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    result: enrichedResult,
  };
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
  getRecentVendorsFromDB,
  getFeaturedVendorServicesFromDB,
};

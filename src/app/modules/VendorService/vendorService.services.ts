import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { VendorService } from './vendorService.model';
import { User } from '../User/user.model';
import { ReviewServices } from '../Review/review.services';
import { VendorPromotion } from '../Promotion/promotion.model';

// ── Helper: split amenities into ObjectId refs + custom free-text ──
const processAmenitiesInput = (amenities: string[]) => {
  const refs: Types.ObjectId[] = [];
  const custom: string[] = [];
  for (const item of amenities) {
    if (Types.ObjectId.isValid(item)) {
      refs.push(new Types.ObjectId(item));
    } else {
      custom.push(item);
    }
  }
  return { amenities: refs, customAmenities: custom };
};

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
  // ──────────────────────────────────────────────────────
  //  1. Extract & parse filter params
  // ──────────────────────────────────────────────────────
  const {
    category,
    subcategory,
    area,
    eventTypes,
    amenities,
    minPrice,
    maxPrice,
    guestCapacity,
    rating,
    isVerified,
    isFav,
    search,
    lat: queryLat,
    lng: queryLng,
    maxDistance,
    page: pageStr,
    limit: limitStr,
  } = query as Record<string, unknown>;

  const page = Math.max(Number(pageStr) || 1, 1);
  const limit = Math.min(Number(limitStr) || 10, 50);
  const skip = (page - 1) * limit;

  // ──────────────────────────────────────────────────────
  //  2. Build $match stage (VendorService fields)
  // ──────────────────────────────────────────────────────
  const $match: Record<string, any> = { isActive: true, isDraft: { $ne: true } };

  if (category) $match.category = new Types.ObjectId(category as string);
  if (subcategory) $match.subcategory = new Types.ObjectId(subcategory as string);
  if (area) {
    $match.serviceAreas = { $in: [new Types.ObjectId(area as string)] };
  }
  if (eventTypes) {
    const etIds = Array.isArray(eventTypes)
      ? eventTypes.map((id: any) => new Types.ObjectId(String(id)))
      : String(eventTypes).split(',').map((id: string) => new Types.ObjectId(id.trim()));
    $match.eventTypes = { $in: etIds };
  }
  if (amenities) {
    const amIds = Array.isArray(amenities)
      ? amenities.map((id: any) => new Types.ObjectId(String(id)))
      : String(amenities).split(',').map((id: string) => new Types.ObjectId(id.trim()));
    $match.amenities = { $all: amIds };
  }
  if (minPrice || maxPrice) {
    $match.price = {};
    if (minPrice) $match.price.$gte = Number(minPrice);
    if (maxPrice) $match.price.$lte = Number(maxPrice);
  }
  if (guestCapacity) {
    $match.guestCapacity = { $gte: Number(guestCapacity) };
  }
  if (search) {
    const regex = new RegExp(String(search), 'i');
    $match.$or = [{ title: regex }, { description: regex }];
  }

  // ───────────────────────────────────────────────────────
  // 3. Build the aggregation pipeline
  // ───────────────────────────────────────────────────────
  const pipeline: any[] = [{ $match }];

  // ── 3a. Lookup vendor (User) data ──
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'vendor',
      foreignField: '_id',
      as: 'vendor',
    },
  });
  pipeline.push({ $unwind: { path: '$vendor', preserveNullAndEmptyArrays: false } });

  // ── 3b. Filter: only non-deleted vendors ──
  pipeline.push({ $match: { 'vendor.isDeleted': { $ne: true }, 'vendor.role': 'vendor' } });

  // ── 3c. isVerified filter ──
  const needVerified = isVerified === 'true' || isVerified === true;
  if (needVerified) {
    pipeline.push({ $match: { 'vendor.vendor.isVerifiedBadge': true } });
  }

  // ── 3d. Geo-spatial proximity filter (haversine in $addFields + $match) ──
  const userLat = Number(queryLat);
  const userLng = Number(queryLng);
  const distKm = Number(maxDistance) || 0;
  const hasGeoFilter = !isNaN(userLat) && !isNaN(userLng) && distKm > 0;

  if (hasGeoFilter) {
    // Earth radius in km
    const R = 6371;
    pipeline.push({
      $addFields: {
        distanceKm: {
          $let: {
            vars: {
              dLat: { $degreesToRadians: { $subtract: [{ $ifNull: ['$vendor.vendor.lat', '$vendor.lat'] }, userLat] } },
              dLng: { $degreesToRadians: { $subtract: [{ $ifNull: ['$vendor.vendor.long', '$vendor.long'] }, userLng] } },
              lat1: { $degreesToRadians: userLat },
              lat2: { $degreesToRadians: { $ifNull: ['$vendor.vendor.lat', '$vendor.lat'] } },
            },
            in: {
              $multiply: [
                R,
                2,
                {
                  $asin: {
                    $sqrt: {
                      $add: [
                        {
                          $multiply: [
                            { $sin: { $divide: ['$$dLat', 2] } },
                            { $sin: { $divide: ['$$dLat', 2] } },
                          ],
                        },
                        {
                          $multiply: [
                            { $cos: '$$lat1' },
                            { $cos: '$$lat2' },
                            { $sin: { $divide: ['$$dLng', 2] } },
                            { $sin: { $divide: ['$$dLng', 2] } },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });
    pipeline.push({ $match: { distanceKm: { $lte: distKm } } });
  }

  // ── 3e. isFav filter (pre-filter before $facet) ──
  const needFav = isFav === 'true' || isFav === true;
  let favSet: Set<string> | null = null;

  if (needFav && !userId) {
    return { meta: { page: 1, limit, total: 0, totalPage: 0 }, result: [] };
  }

  if (userId) {
    const userDoc = await User.findById(userId).select('favoriteServices').lean();
    const favs = userDoc?.favoriteServices ?? [];
    favSet = new Set(favs.map((id: any) => id.toString()));

    if (needFav) {
      if (favSet.size === 0) {
        return { meta: { page: 1, limit, total: 0, totalPage: 0 }, result: [] };
      }
      pipeline.push({
        $match: { _id: { $in: [...favSet].map((id) => new Types.ObjectId(id)) } },
      });
    }
  }

  // ── 3f. Lookup active promotions (sponsored) ──
  const now = new Date();
  pipeline.push({
    $lookup: {
      from: 'vendorpromotions',
      let: { vendorId: '$vendor._id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$vendor', '$$vendorId'] },
                { $eq: ['$promotionCategory', 'sponsored'] },
                { $eq: ['$isActive', true] },
                { $eq: ['$status', 'active'] },
                { $lte: ['$startDate', now] },
                { $gte: ['$endDate', now] },
              ],
            },
          },
        },
        { $limit: 1 },
      ],
      as: 'activePromotion',
    },
  });
  pipeline.push({
    $addFields: {
      isSponsored: { $gt: [{ $size: '$activePromotion' }, 0] },
    },
  });

  // ── 3g. Lookup: rating + reviewCount ──
  pipeline.push({
    $lookup: {
      from: 'reviews',
      let: { serviceId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$service', '$$serviceId'] }, isDeleted: false } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ],
      as: 'ratingData',
    },
  });
  pipeline.push({
    $addFields: {
      rating: {
        $ifNull: [
          { $round: [{ $arrayElemAt: ['$ratingData.avgRating', 0] }, 1] },
          0,
        ],
      },
      reviewCount: {
        $ifNull: [{ $arrayElemAt: ['$ratingData.reviewCount', 0] }, 0],
      },
    },
  });

  // ── 3h. Rating filter (post-lookup) ──
  const minRating = Number(rating) || 0;
  if (minRating > 0) {
    pipeline.push({ $match: { rating: { $gte: minRating } } });
  }

  // ── 3i. Add isFav field ──
  if (favSet) {
    pipeline.push({
      $addFields: {
        isFav: { $in: ['$_id', [...favSet].map((id) => new Types.ObjectId(id))] },
      },
    });
  } else {
    pipeline.push({ $addFields: { isFav: false } });
  }

  // ── 3j. Add distanceKm if geo not active ──
  if (!hasGeoFilter) {
    pipeline.push({ $addFields: { distanceKm: null } });
  }

  // ── 3k. Sort: Sponsored → Verified Badge → Profile Score → Rating → Newest ──
  pipeline.push({
    $addFields: {
      sortVerified: { $ifNull: ['$vendor.vendor.isVerifiedBadge', false] },
      sortProfileScore: { $ifNull: ['$vendor.vendor.profileScore', 0] },
    },
  });
  pipeline.push({
    $sort: {
      isSponsored: -1,
      sortVerified: -1,
      sortProfileScore: -1,
      rating: -1,
      createdAt: -1,
    } as Record<string, 1 | -1>,
  });

  // ── 3l. Project: map-pin optimized response ──
  pipeline.push({
    $project: {
      _id: 1,
      title: 1,
      description: 1,
      price: 1,
      pricingType: 1,
      guestCapacity: 1,
      images: 1,
      termsAndCondition: 1,
      isActive: 1,
      isDraft: 1,
      createdAt: 1,
      updatedAt: 1,
      isSponsored: 1,
      isFav: 1,
      rating: 1,
      reviewCount: 1,
      distanceKm: 1,
      category: { _id: 1, name: 1, image: 1 },
      subcategory: { _id: 1, name: 1, image: 1 },
      eventTypes: { _id: 1, name: 1, image: 1 },
      serviceAreas: { _id: 1, name: 1, region: 1 },
      amenities: { _id: 1, name: 1, icon: 1 },
      customAmenities: 1,
      'vendor._id': 1,
      'vendor.firstName': 1,
      'vendor.lastName': 1,
      'vendor.fullName': 1,
      'vendor.image': 1,
      'vendor.lat': 1,
      'vendor.long': 1,
      'vendor.vendor.businessName': 1,
      'vendor.vendor.location': 1,
      'vendor.vendor.profileScore': 1,
      'vendor.vendor.isVerifiedBadge': 1,
      'vendor.vendor.lat': 1,
      'vendor.vendor.long': 1,
    },
  });

  // ── 3m. $facet: paginated results + total count ──
  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [{ $skip: skip }, { $limit: limit }],
    },
  });

  // ───────────────────────────────────────────────────────
  // 4. Execute pipeline
  // ───────────────────────────────────────────────────────
  const [facetResult] = await VendorService.aggregate(pipeline);
  const total = facetResult.metadata[0]?.total ?? 0;
  const result = facetResult.data;

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    result,
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
  const { amenities: am, ...rest } = payload;
  const serviceData: any = {
    ...rest,
    vendor: new Types.ObjectId(vendorId),
    isDraft: false,
  };

  // Split amenities into ObjectId refs and custom text
  if (am && Array.isArray(am)) {
    const processed = processAmenitiesInput(am as string[]);
    serviceData.amenities = processed.amenities;
    serviceData.customAmenities = processed.customAmenities;
  }

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

  // Split amenities into ObjectId refs and custom text
  const { amenities: am, images, ...rest } = payload;
  const updateData: any = { ...rest };
  if (am && Array.isArray(am)) {
    const processed = processAmenitiesInput(am as string[]);
    updateData.amenities = processed.amenities;
    updateData.customAmenities = processed.customAmenities;
  }

  // If images are provided, append them to existing images instead of replacing
  if (images && Array.isArray(images) && images.length > 0) {
    const result = await VendorService.findByIdAndUpdate(
      serviceId,
      { $set: updateData, $push: { images: { $each: images as string[] } } },
      { new: true, runValidators: true },
    );
    return result;
  }

  const result = await VendorService.findByIdAndUpdate(serviceId, updateData, {
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
  const { amenities: am, ...rest } = payload;
  const draftData: any = {
    ...rest,
    vendor: new Types.ObjectId(vendorId),
    isDraft: true,
  };

  // Split amenities into ObjectId refs and custom text
  if (am && Array.isArray(am)) {
    const processed = processAmenitiesInput(am as string[]);
    draftData.amenities = processed.amenities;
    draftData.customAmenities = processed.customAmenities;
  }

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

  // Split amenities into ObjectId refs and custom text
  const { amenities: am, ...rest } = payload;
  const updateData: any = { ...rest, isDraft: false };
  if (am && Array.isArray(am)) {
    const processed = processAmenitiesInput(am as string[]);
    updateData.amenities = processed.amenities;
    updateData.customAmenities = processed.customAmenities;
  }

  const result = await VendorService.findByIdAndUpdate(
    draftId,
    { $set: updateData },
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

// ══════════════════════════════════════════════
//  PUBLIC: GET ACTIVE SERVICES BY VENDOR ID (with isFav)
// ══════════════════════════════════════════════

const getActiveServicesByVendorFromDB = async (
  vendorId: string,
  query: Record<string, unknown>,
  userId?: string,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {
    vendor: new Types.ObjectId(vendorId),
    isActive: true,
    isDraft: { $ne: true },
  };

  // Build favSet if user is logged in
  let favSet: Set<string> | undefined;
  if (userId) {
    const user = await User.findById(userId).select('favoriteServices');
    if (user?.favoriteServices) {
      favSet = new Set(user.favoriteServices.map((id) => id.toString()));
    }
  }

  const [result, total] = await Promise.all([
    VendorService.find(filter)
      .populate('category', 'name image')
      .populate('subcategory', 'name image')
      .populate('eventTypes', 'name image')
      .populate('serviceAreas', 'name region')
      .populate('amenities', 'name icon')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    VendorService.countDocuments(filter),
  ]);

  // Enrich with isFav
  let enriched = result;
  if (favSet) {
    enriched = result.map((s: any) => ({
      ...s,
      isFav: favSet!.has(s._id.toString()),
    }));
  }

  // Enrich with rating + reviewCount
  if (enriched.length > 0) {
    const serviceIds = enriched.map((s: any) => s._id);
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

    enriched = enriched.map((s: any) => ({
      ...s,
      rating: ratingMap[s._id.toString()]?.avgRating ?? 0,
      reviewCount: ratingMap[s._id.toString()]?.reviewCount ?? 0,
    }));
  }

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    result: enriched,
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
  getActiveServicesByVendorFromDB,
};

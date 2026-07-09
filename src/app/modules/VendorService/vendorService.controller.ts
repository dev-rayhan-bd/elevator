import httpStatus from 'http-status';
import { Types } from 'mongoose';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import uploadImage from '../../middleware/upload';
import AppError from '../../errors/AppError';
import { VendorServiceServices } from './vendorService.services';
import { VendorServiceValidations } from './vendorService.validation';

const getAllVendorServices = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getAllVendorServicesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All services retrieved successfully',
    data: result,
  });
});

const getMyServices = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getVendorServicesByVendorFromDB(
    req.user.userId,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your services retrieved successfully',
    data: result,
  });
});

const getPublicVendorServices = catchAsync(async (req, res) => {
  // optionalAuth middleware sets req.user if a valid token is present
  const userId = (req.user as any)?.userId;

  const result = await VendorServiceServices.getPublicVendorServicesFromDB(req.query, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Services retrieved successfully',
    data: result,
  });
});

const getSingleVendorService = catchAsync(async (req, res) => {
  const userId = (req.user as any)?.userId;
  const reviewPage = Number(req.query.reviewPage) || 1;
  const reviewLimit = Number(req.query.reviewLimit) || 10;
  const result = await VendorServiceServices.getSingleVendorServiceFromDB(
    req.params.id,
    userId,
    reviewPage,
    reviewLimit,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service retrieved successfully',
    data: result,
  });
});

const createVendorService = catchAsync(async (req, res) => {
  // Upload multiple images to Cloudinary if files are present (multipart/form-data)
  let imageUrls: string[] = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const uploadPromises = req.files.map((file) => uploadImage(req, file));
    imageUrls = await Promise.all(uploadPromises);
  }

  // Parse data — multipart sends JSON string in 'data' field; regular JSON uses body directly
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;

  // Validate with Zod after parsing
  const validated = VendorServiceValidations.createVendorServiceSchema.parse({
    body: rawData,
  });

  const payload = {
    ...validated.body,
    category: new Types.ObjectId(validated.body.category),
    subcategory: new Types.ObjectId(validated.body.subcategory),
    ...((validated.body.eventTypes?.length ?? 0) > 0 && {
      eventTypes: validated.body.eventTypes!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...((validated.body.serviceAreas?.length ?? 0) > 0 && {
      serviceAreas: validated.body.serviceAreas!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...((validated.body.amenities?.length ?? 0) > 0 && {
      amenities: validated.body.amenities!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...(imageUrls.length > 0 && { images: imageUrls }),
  };

  const result = await VendorServiceServices.createVendorServiceIntoDB(
    req.user.userId,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Service created successfully',
    data: result,
  });
});

const updateVendorService = catchAsync(async (req, res) => {
  // Upload new images if files provided
  let imageUrls: string[] = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const uploadPromises = req.files.map((file) => uploadImage(req, file));
    imageUrls = await Promise.all(uploadPromises);
  }

  // Parse data
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;

  // Validate with Zod
  const validated = VendorServiceValidations.updateVendorServiceSchema.parse({
    body: rawData,
  });

  const payload = {
    ...validated.body,
    ...(validated.body.category && { category: new Types.ObjectId(validated.body.category) }),
    ...(validated.body.subcategory && { subcategory: new Types.ObjectId(validated.body.subcategory) }),
    ...((validated.body.eventTypes?.length ?? 0) > 0 && {
      eventTypes: validated.body.eventTypes!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...((validated.body.serviceAreas?.length ?? 0) > 0 && {
      serviceAreas: validated.body.serviceAreas!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...((validated.body.amenities?.length ?? 0) > 0 && {
      amenities: validated.body.amenities!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...(imageUrls.length > 0 && { images: imageUrls }),
  };

  const result = await VendorServiceServices.updateVendorServiceInDB(
    req.user.userId,
    req.params.id,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service updated successfully',
    data: result,
  });
});

const deleteVendorService = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.deleteVendorServiceFromDB(
    req.user.userId,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service deleted successfully',
    data: result,
  });
});

const adminToggleServiceStatus = catchAsync(async (req, res) => {
  const { isFeatured, isActive } = req.body;
  const result = await VendorServiceServices.adminToggleServiceStatusInDB(req.params.id, {
    isFeatured,
    isActive,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service status updated',
    data: result,
  });
});

const deleteServiceImages = catchAsync(async (req, res) => {
  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please provide an array of image URLs to delete');
  }

  const result = await VendorServiceServices.deleteServiceImagesFromDB(
    req.user.userId,
    req.params.id,
    images,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Images removed successfully',
    data: result,
  });
});

const getMyServicesList = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getMyServicesListFromDB(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your services list retrieved successfully',
    data: result,
  });
});

const saveDraft = catchAsync(async (req, res) => {
  // Upload images if any
  let imageUrls: string[] = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const uploadPromises = req.files.map((file) => uploadImage(req, file));
    imageUrls = await Promise.all(uploadPromises);
  }

  // Parse data
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;

  // Validate with draft schema (all fields optional)
  const validated = VendorServiceValidations.draftVendorServiceSchema.parse({
    body: rawData,
  });

  const payload = {
    ...validated.body,
    ...(validated.body.category && { category: new Types.ObjectId(validated.body.category) }),
    ...(validated.body.subcategory && { subcategory: new Types.ObjectId(validated.body.subcategory) }),
    ...((validated.body.eventTypes?.length ?? 0) > 0 && {
      eventTypes: validated.body.eventTypes!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...((validated.body.serviceAreas?.length ?? 0) > 0 && {
      serviceAreas: validated.body.serviceAreas!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...((validated.body.amenities?.length ?? 0) > 0 && {
      amenities: validated.body.amenities!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...(imageUrls.length > 0 && { images: imageUrls }),
  };

  const result = await VendorServiceServices.saveDraftInDB(
    req.user.userId,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Draft saved successfully',
    data: result,
  });
});

const getMyDrafts = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getMyDraftsFromDB(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your drafts retrieved successfully',
    data: result,
  });
});

const publishDraft = catchAsync(async (req, res) => {
  // Upload images if any
  let imageUrls: string[] = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const uploadPromises = req.files.map((file) => uploadImage(req, file));
    imageUrls = await Promise.all(uploadPromises);
  }

  // Parse data
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;

  // Validate with full publish schema
  const validated = VendorServiceValidations.publishDraftSchema.parse({
    body: rawData,
  });

  const payload = {
    ...validated.body,
    ...(validated.body.category && { category: new Types.ObjectId(validated.body.category) }),
    ...(validated.body.subcategory && { subcategory: new Types.ObjectId(validated.body.subcategory) }),
    ...((validated.body.eventTypes?.length ?? 0) > 0 && {
      eventTypes: validated.body.eventTypes!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...((validated.body.serviceAreas?.length ?? 0) > 0 && {
      serviceAreas: validated.body.serviceAreas!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...((validated.body.amenities?.length ?? 0) > 0 && {
      amenities: validated.body.amenities!.map((id: string) => new Types.ObjectId(id)),
    }),
    ...(imageUrls.length > 0 && { images: imageUrls }),
  };

  const result = await VendorServiceServices.publishDraftFromDB(
    req.user.userId,
    req.params.id,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Draft published successfully',
    data: result,
  });
});

const deleteDraft = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.deleteDraftFromDB(
    req.user.userId,
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Draft deleted successfully',
    data: result,
  });
});

const getAllPublishedServices = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getAllPublishedServicesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All published services retrieved successfully',
    data: result,
  });
});

// ── Favourite / Unfavourite ──

const toggleFavService = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.toggleFavServiceInDB(
    req.user.userId,
    req.params.serviceId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: { isFav: result.isFav },
  });
});

const getFavServices = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getFavServicesFromDB(
    req.user.userId,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Favourite services retrieved successfully',
    data: result,
  });
});

// ── Home Feed: Recent Vendors ──

const getRecentVendors = catchAsync(async (req, res) => {
  const result = await VendorServiceServices.getRecentVendorsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Recent vendors retrieved successfully',
    data: result,
  });
});

// ── Home Feed: Featured Vendors with Sponsored Tags ──

const getFeaturedVendorServices = catchAsync(async (req, res) => {
  const userId = (req.user as any)?.userId;
  const result = await VendorServiceServices.getFeaturedVendorServicesFromDB(
    req.query,
    userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Featured vendor services retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  PUBLIC: GET ACTIVE SERVICES BY VENDOR ID
// ══════════════════════════════════════════════

const getActiveServicesByVendor = catchAsync(async (req, res) => {
  const { vendorId } = req.params;
  const userId = (req.user as any)?.userId;

  const result = await VendorServiceServices.getActiveServicesByVendorFromDB(
    vendorId,
    req.query,
    userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Active vendor services retrieved successfully',
    data: result,
  });
});

// ══════════════════════════════════════════════
//  KARACHI VENUE MAP — Advanced Venue Search
// ══════════════════════════════════════════════

const getKarachiVenues = catchAsync(async (req, res) => {
  // Validate query params
  const parsed = VendorServiceValidations.venueSearchQuerySchema.parse(req.query);
  const userId = (req.user as any)?.userId;

  const result = await VendorServiceServices.getPublicVendorServicesFromDB(
    parsed as unknown as Record<string, unknown>,
    userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Karachi venues retrieved successfully',
    data: result,
  });
});

export const VendorServiceControllers = {
  getAllVendorServices,
  getMyServices,
  getPublicVendorServices,
  getAllPublishedServices,
  getSingleVendorService,
  createVendorService,
  updateVendorService,
  deleteVendorService,
  adminToggleServiceStatus,
  deleteServiceImages,
  getMyServicesList,
  saveDraft,
  getMyDrafts,
  publishDraft,
  deleteDraft,
  toggleFavService,
  getRecentVendors,
  getFavServices,
  getFeaturedVendorServices,
  getActiveServicesByVendor,
  getKarachiVenues,
};

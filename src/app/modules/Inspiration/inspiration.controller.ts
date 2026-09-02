import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { InspirationServices } from './inspiration.services';
import uploadImage, { uploadMultipleImages } from '../../middleware/upload';

// ── Admin: Create ──
const createInspiration = catchAsync(async (req, res) => {
  let fileList: Express.Multer.File[] = [];
  if (req.files) {
    if (Array.isArray(req.files)) {
      fileList = req.files;
    } else {
      const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (filesObj.images) fileList.push(...filesObj.images);
      if (filesObj.image) fileList.push(...filesObj.image);
    }
  } else if (req.file) {
    fileList = [req.file];
  }

  let uploadedUrls: string[] = [];
  if (fileList.length > 0) {
    uploadedUrls = await uploadMultipleImages(fileList);
  }

  // Parse FormData 'data' field
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const existingImages = Array.isArray(rawData.images)
    ? rawData.images
    : rawData.images
    ? [rawData.images]
    : rawData.image
    ? [rawData.image]
    : [];

  const finalImages = [...existingImages, ...uploadedUrls];
  const payload = {
    ...rawData,
    images: finalImages,
    image: finalImages[0] || '',
  };

  const result = await InspirationServices.createInspirationIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Inspiration created successfully',
    data: result,
  });
});

// ── Admin: Update ──
const updateInspiration = catchAsync(async (req, res) => {
  let fileList: Express.Multer.File[] = [];
  if (req.files) {
    if (Array.isArray(req.files)) {
      fileList = req.files;
    } else {
      const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (filesObj.images) fileList.push(...filesObj.images);
      if (filesObj.image) fileList.push(...filesObj.image);
    }
  } else if (req.file) {
    fileList = [req.file];
  }

  let uploadedUrls: string[] = [];
  if (fileList.length > 0) {
    uploadedUrls = await uploadMultipleImages(fileList);
  }

  // Parse FormData 'data' field
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;

  let finalImages: string[] | undefined;
  if (rawData.images !== undefined || uploadedUrls.length > 0) {
    const existingImages = Array.isArray(rawData.images)
      ? rawData.images
      : rawData.images
      ? [rawData.images]
      : [];
    finalImages = [...existingImages, ...uploadedUrls];
  }

  const payload = {
    ...rawData,
    ...(finalImages !== undefined && {
      images: finalImages,
      image: finalImages[0] || rawData.image || '',
    }),
  };

  const result = await InspirationServices.updateInspirationInDB(
    req.params.id,
    payload,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration updated successfully',
    data: result,
  });
});

// ── Admin: Delete ──
const deleteInspiration = catchAsync(async (req, res) => {
  const result = await InspirationServices.deleteInspirationFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration deleted successfully',
    data: result,
  });
});

// ── Admin: Get Single ──
const getSingleInspiration = catchAsync(async (req, res) => {
  const result = await InspirationServices.getSingleInspirationFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration retrieved successfully',
    data: result,
  });
});

// ── Public: Get All ──
const getAllInspirations = catchAsync(async (req, res) => {
  const result = await InspirationServices.getAllInspirationsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspirations retrieved successfully',
    data: result,
  });
});

// ── Admin: Get All (including inactive) ──
const getAdminInspirations = catchAsync(async (req, res) => {
  const result = await InspirationServices.getAdminInspirationsFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspirations retrieved successfully',
    data: result,
  });
});

export const InspirationControllers = {
  createInspiration,
  updateInspiration,
  deleteInspiration,
  getSingleInspiration,
  getAllInspirations,
  getAdminInspirations,
};

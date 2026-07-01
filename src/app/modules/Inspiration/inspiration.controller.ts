import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { InspirationServices } from './inspiration.services';
import uploadImage from '../../middleware/upload';

// ── Admin: Create ──
const createInspiration = catchAsync(async (req, res) => {
  // Upload image to Cloudinary
  let imageUrl = '';
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  // Parse FormData 'data' field
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...rawData, image: imageUrl };

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
  // Upload image to Cloudinary if new file provided
  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  // Parse FormData 'data' field
  const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...rawData, ...(imageUrl && { image: imageUrl }) };

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

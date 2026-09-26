import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { InspirationCategoryServices } from './inspirationCategory.services';
import uploadImage from '../../middleware/upload';
import { verifyToken } from '../Auth/auth.utils';
import config from '../../config';
import { Secret } from 'jsonwebtoken';

// ── Create ──
const createInspirationCategory = catchAsync(async (req, res) => {
  const payload = { ...req.body };

  if (req.file) {
    const imageUrl = await uploadImage(req);
    payload.image = imageUrl;
  }

  const result = await InspirationCategoryServices.createInspirationCategoryIntoDB(payload);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Inspiration category created successfully',
    data: result,
  });
});

// ── Update ──
const updateInspirationCategory = catchAsync(async (req, res) => {
  const payload = { ...req.body };

  if (req.file) {
    const imageUrl = await uploadImage(req);
    payload.image = imageUrl;
  }

  const result = await InspirationCategoryServices.updateInspirationCategoryInDB(
    req.params.id,
    payload,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration category updated successfully',
    data: result,
  });
});

// ── Delete ──
const deleteInspirationCategory = catchAsync(async (req, res) => {
  const result = await InspirationCategoryServices.deleteInspirationCategoryFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration category deleted successfully',
    data: result,
  });
});

// ── Get Single ──
const getSingleInspirationCategory = catchAsync(async (req, res) => {
  const result = await InspirationCategoryServices.getSingleInspirationCategoryFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration category retrieved successfully',
    data: result,
  });
});

// ── Get All (Public) ──
const getAllInspirationCategories = catchAsync(async (req, res) => {
  let isAdmin = false;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyToken(token, config.jwt_access_secret as Secret) as any;
      if (decoded.role === 'admin' || decoded.role === 'superAdmin') {
        isAdmin = true;
      }
    } catch (error) {
      // ignore token error for optional auth
    }
  }

  const result = await InspirationCategoryServices.getAllInspirationCategoriesFromDB(req.query, isAdmin);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration categories retrieved successfully',
    data: result,
  });
});

// ── Get All (Admin) ──
const getAdminInspirationCategories = catchAsync(async (req, res) => {
  const result = await InspirationCategoryServices.getAdminInspirationCategoriesFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration categories retrieved successfully',
    data: result,
  });
});

// ── Get All List (for dropdowns) ──
const getAllInspirationCategoriesList = catchAsync(async (req, res) => {
  const result = await InspirationCategoryServices.getAllInspirationCategoriesListFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inspiration categories list retrieved successfully',
    data: result,
  });
});

export const InspirationCategoryControllers = {
  createInspirationCategory,
  updateInspirationCategory,
  deleteInspirationCategory,
  getSingleInspirationCategory,
  getAllInspirationCategories,
  getAdminInspirationCategories,
  getAllInspirationCategoriesList,
};

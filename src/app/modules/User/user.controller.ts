import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserServices } from './user.services';
import uploadImage from '../../middleware/upload';

const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUsersFromDB(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: 'Users retrieved', data: result });
});

const updateProfile = catchAsync(async (req, res) => {
  let imageUrl;
  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  // FormData JSON parsing if body is wrapped in 'data' field
  const data = req.body.data ? JSON.parse(req.body.data) : req.body;
  const payload = { ...data, image: imageUrl };

  const result = await UserServices.updateProfileInDB(req.user.userId, payload);
  sendResponse(res, { statusCode: 200, success: true, message: 'Profile updated', data: result });
});

export const UserControllers = { getAllUsers, updateProfile };
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminServices } from './admin.services';
import httpStatus from 'http-status';

const loginAdmin = catchAsync(async (req, res) => {
  const result = await AdminServices.loginAdminFromDB(req.body);
  const { refreshToken, accessToken, admin } = result;

  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin Login Successful',
    data: { accessToken, admin },
  });
});

const createAdmin = catchAsync(async (req, res) => {
  const result = await AdminServices.createAdminInDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Admin account created successfully',
    data: result,
  });
});
const approveVendor = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await AdminServices.approveVendorRequest(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendor approved and role updated successfully.',
    data: result,
  });
});
const getPendingVendors = catchAsync(async (req, res) => {

  const result = await AdminServices.getPendingVendorsFromDB(req.query);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pending vendor requests retrieved.',
    data: result,
  });
});
export const AdminControllers = { loginAdmin, createAdmin,approveVendor,getPendingVendors };
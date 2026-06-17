import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.services';
import httpStatus from 'http-status';

const register = catchAsync(async (req, res) => {
  const result = await AuthServices.registerUser(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'OTP sent to phone', data: result });
});

const login = catchAsync(async (req, res) => {
  const result = await AuthServices.loginWithEmailOrPhone(req.body);
  res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true });
  sendResponse(res, { statusCode: 200, success: true, message: 'Login successful', data: result });
});

const verifyOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyOtp(req.body.phone, req.body.otp);
  sendResponse(res, { statusCode: 200, success: true, message: 'OTP Verified', data: result });
});

const handleRefreshToken = catchAsync(async (req, res) => {
  const result = await AuthServices.refreshToken(req.cookies.refreshToken || req.body.refreshToken);
  sendResponse(res, { statusCode: 200, success: true, message: 'Token refreshed', data: result });
});

export const AuthControllers = { register, login, verifyOtp, handleRefreshToken };
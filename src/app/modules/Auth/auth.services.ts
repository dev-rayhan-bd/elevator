import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { User } from '../User/user.model';
import { createToken, verifyToken } from './auth.utils';
import config from '../../config';
import bcrypt from 'bcrypt';
import { sendOTP } from '../../utils/twilio';
import { TChangePassword, TResetPassword } from './auth.interface';
import { TUser } from '../User/user.interface';

const registerUser = async (payload: TUser) => {

  const isExist = await User.findOne({ 
    $or: [{ email: payload.email }, { phone: payload.phone }] 
  });
  
  if (isExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User with this email or phone already exists');
  }

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();

  payload.otp = plainOtp;
  payload.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  if (payload.role === 'vendor') {
    payload.status = 'pending'; 
  } else {
    payload.status = 'active'; 
  }

  //
  const result = await User.create(payload);

  
  await sendOTP(payload.phone, plainOtp);
  
  return result;
};

const changePassword = async (userId: string, payload: TChangePassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');


  const isMatched = await user.isPasswordMatched(payload.oldPassword, user.password!);
  if (!isMatched) {
    throw new AppError(httpStatus.FORBIDDEN, 'Current password is incorrect');
  }

  user.password = payload.newPassword;
  await user.save();

  return { message: 'Password updated successfully' };
};


const verifyOtp = async (phone: string, otp: string) => {

  const user = await User.findOne({ phone }).select('+otp +otpExpires');
  
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }


  const isOtpMatched = await bcrypt.compare(otp, user.otp as string);
  
  if (!isOtpMatched || (user.otpExpires && user.otpExpires < new Date())) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }


  user.isOtpVerified = true;  
  user.otp = null;        
  user.otpExpires = null; 
  

  await user.save();
  
  const jwtPayload = { userId: user._id.toString(), role: user.role };
  const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);

  return { accessToken, refreshToken, user };
};


const loginWithEmailOrPhone = async (payload: any) => {
  const user = await User.findOne({ 
    $or: [{ email: payload.email }, { phone: payload.phone }] 
  }).select('+password');

  if (!user || user.status === 'blocked') throw new AppError(httpStatus.NOT_FOUND, 'Account not found or blocked');


  const isMatched = await user.isPasswordMatched(payload.password, user.password!);
  if (!isMatched) throw new AppError(httpStatus.FORBIDDEN, 'Incorrect password');

  const jwtPayload = { userId: user._id.toString(), role: user.role };
  const accessToken = createToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expires_in as string);

  return { accessToken, refreshToken, user };
};


const forgotPassword = async (phone: string) => {
  const user = await User.findOne({ phone });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'No account with this phone number');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(plainOtp, Number(config.bcrypt_salt_rounds));

  await User.findByIdAndUpdate(user._id, {
    otp: hashedOtp,
    otpExpires: new Date(Date.now() + 10 * 60 * 1000)
  });

  await sendOTP(phone, plainOtp);
  return { message: 'Password reset OTP sent to phone' };
};


const resetPassword = async (payload: TResetPassword) => {

  const user = await User.findOne({ phone: payload.phone }).select('+otp +otpExpires');
  
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found with this phone number');
  }

  const isOtpMatched = await bcrypt.compare(payload.otp, user.otp as string);
  
  if (!isOtpMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
  }

  if (user.otpExpires && user.otpExpires < new Date()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'OTP has expired');
  }

  user.password = payload.newPassword;

  user.otp = null;
  user.otpExpires = null;

  await user.save();

  return { 
    message: 'Password reset successfully. You can now login with your new password.' 
  };
};



const refreshToken = async (token: string) => {
  const decoded = verifyToken(token, config.jwt_refresh_secret as string) as any;
  const user = await User.findById(decoded.userId);
  
  if (!user || user.status === 'blocked') throw new AppError(httpStatus.FORBIDDEN, 'Access denied');

  const accessToken = createToken({ userId: user._id.toString(), role: user.role }, config.jwt_access_secret as string, config.jwt_access_expires_in as string);
  return { accessToken };
};

export const AuthServices = { 
  registerUser, 
  verifyOtp, 
  loginWithEmailOrPhone, 
  forgotPassword, 
  resetPassword, 
  changePassword, 
  refreshToken 
};
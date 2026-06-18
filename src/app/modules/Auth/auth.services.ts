import httpStatus from 'http-status';
import bcrypt from 'bcrypt';
import AppError from '../../errors/AppError';
import { User } from '../User/user.model';
import { createToken, verifyToken } from './auth.utils';
import config from '../../config';
import { sendOTP } from '../../utils/twilio';
import { getEmailTemplate } from '../../utils/emailTemplate';
import sendEmail from '../../utils/sendEmail';
import { TResetPassword } from './auth.interface';
import { TUser } from '../User/user.interface';



const sendOtpToUser = async (user: any, plainOtp: string, title: string, identifier: string) => {

  if (identifier.includes('@')) {
    const html = getEmailTemplate({
      userName: user.firstName,
      title: title,
      body: `Your verification code is below. Please use it within 10 minutes.`,
      otpCode: plainOtp
    });
    
    await sendEmail({
      to: user.email,
      subject: title,
      html: html
    });
    console.log("OTP sent via Email to:", user.email);

  } 

  else {
    await sendOTP(user.phone, plainOtp);
    console.log("OTP sent via SMS to:", user.phone);
  }
};

// const registerUser = async (payload: any) => {
//   const isExist = await User.findOne({ $or: [{ email: payload.email }, { phone: payload.phone }] });
//   if (isExist) throw new AppError(httpStatus.CONFLICT, 'Email or Phone already exists');

//   const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
//   payload.otp = plainOtp;
//   payload.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
//   payload.isOtpVerified = false;
//   payload.status = payload.role === 'vendor' ? 'pending' : 'active';

//   const newUser = await User.create(payload);
//   try {
//     await sendOTP(payload.phone, plainOtp);
//     return newUser;
//   } catch (error: any) {
//     await User.findByIdAndDelete(newUser._id);
//     throw new AppError(httpStatus.BAD_GATEWAY, `Twilio Error: ${error.message}`);
//   }
// };
const registerUser = async (payload: TUser) => {
  const isExist = await User.findOne({ $or: [{ email: payload.email }, { phone: payload.phone }] });
  if (isExist) throw new AppError(409, 'Email or Phone already registered');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  
  payload.otp = plainOtp;
  payload.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  payload.role = 'user'; 
  payload.status = 'active'; 
  payload.isOtpVerified = false;

  const newUser = await User.create(payload);

  try {
    await sendOTP(payload.phone, plainOtp);
    return newUser;
  } catch (error) {
    await User.findByIdAndDelete(newUser._id);
    throw new AppError(502, 'Failed to send OTP');
  }
};
const verifyOTPForRegistration = async (phone: string, otp: string) => {
  const user = await User.findOne({ phone }).select('+otp +otpExpires');
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  const isMatch = await bcrypt.compare(otp, user.otp!);
  if (!isMatch || user.otpExpires! < new Date()) throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid/Expired OTP');

  user.isOtpVerified = true;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  const jwtPayload = { userId: user._id.toString(), role: user.role };
  return { 
    accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!),
    refreshToken: createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!),
    user 
  };
};

const loginUser = async (payload: any) => {
  const user = await User.findOne({ $or: [{ email: payload.identifier }, { phone: payload.identifier }] }).select('+password');
  if (!user || user.status === 'blocked' || !user.isOtpVerified) 
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid credentials or account not verified');

  const isMatch = await user.isPasswordMatched(payload.password, user.password!);
  if (!isMatch) throw new AppError(httpStatus.FORBIDDEN, 'Incorrect password');

  const jwtPayload = { userId: user._id.toString(), role: user.role };
  return {
    accessToken: createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!),
    refreshToken: createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!),
    user
  };
};
// ---------------------------------------

const resendOTP = async (identifier: string) => {
  const user = await User.findOne({ 
    $or: [{ email: identifier }, { phone: identifier }] 
  });
  
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = plainOtp; 
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOtpToUser(user, plainOtp, "Your New Verification Code",identifier);
  return { message: 'Verification code resent successfully' };
};

const forgotPass = async (identifier: string) => {
  const user = await User.findOne({ 
    $or: [{ email: identifier }, { phone: identifier }] 
  });
  
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = plainOtp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOtpToUser(user, plainOtp, "Password Reset OTP",identifier);
  return { message: 'Reset OTP sent successfully' };
};


const resetPassword = async (payload: TResetPassword) => {
  const { phone, otp, newPassword } = payload;
  
 
  const user = await User.findOne({ 
    $or: [{ phone: phone }, { email: phone }] 
  }).select('+otp +otpExpires');

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');


  const isOtpMatched = await bcrypt.compare(otp, user.otp as string);
  if (!isOtpMatched || (user.otpExpires && user.otpExpires < new Date())) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  user.password = newPassword;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  return { message: 'Password reset successful' };
};


// -------------------------------

// const resendOTP = async (phone: string) => {
//   const user = await User.findOne({ phone });
//   if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
//   const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
//   user.otp = plainOtp;
//   user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
//   await user.save();
//   await sendOTP(phone, plainOtp);
//   return { message: 'OTP resent successfully' };
// };


// const forgotPass = async (identifier: string) => {
//   const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
//   if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
//   const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
//   user.otp = plainOtp;
//   user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
//   await user.save();
//   await sendOTP(user.phone, plainOtp);
//   return { message: 'Reset OTP sent' };
// };


// const resetPassword = async (payload: any) => {
//   const user = await User.findOne({ phone: payload.phone }).select('+otp +otpExpires');
//   const isMatch = await bcrypt.compare(payload.otp, user?.otp || '');
//   if (!user || !isMatch) throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
//   user.password = payload.newPassword;
//   user.otp = null;
//   await user.save();
//   return { message: 'Password reset successful' };
// };


const changePassword = async (userId: string, payload: any) => {
  const user = await User.findById(userId).select('+password');
  const isMatch = await user?.isPasswordMatched(payload.oldPassword, user.password!);
  if (!isMatch) throw new AppError(httpStatus.FORBIDDEN, 'Old password incorrect');
  user!.password = payload.newPassword;
  await user!.save();
  return { message: 'Password updated' };
};


const refreshToken = async (token: string) => {
  const decoded = verifyToken(token, config.jwt_refresh_secret!) as any;
  const user = await User.findById(decoded.userId);
  if (!user || user.status === 'blocked') throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized');
  return { accessToken: createToken({ userId: user._id.toString(), role: user.role }, config.jwt_access_secret!, '1d') };
};




export const AuthServices = { registerUser, verifyOTPForRegistration, loginUser, resendOTP, forgotPass, resetPassword, changePassword, refreshToken,sendOtpToUser };
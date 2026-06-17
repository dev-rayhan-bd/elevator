export type TLoginUser = {
  email?: string;
  phone?: string;
  password?: string;
};

export type TVerifyOtp = {
  phone: string;
  otp: string;
};

export type TRefreshToken = {
  refreshToken: string;
};

export type TForgetPassword = {
  email?: string;
  phone?: string;
};

export type TChangePassword = {
  oldPassword: string;
  newPassword: string;
};

export type TResetPassword = {
  phone: string;
  otp: string;
  newPassword: string;
};
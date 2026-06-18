import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Admin } from './admin.model';
import { createToken } from '../Auth/auth.utils';
import config from '../../config';
import { User } from '../User/user.model';
import QueryBuilder from '../../builder/QueryBuilder';

const loginAdminFromDB = async (payload: any) => {
  const { identifier, password } = payload;

  const admin = await Admin.findOne({
    $or: [{ email: identifier }, { phone: identifier }]
  }).select('+password');

  if (!admin || admin.status === 'blocked' || admin.isDeleted) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid credentials or account restricted');
  }

  const isMatched = await admin.isPasswordMatched(password, admin.password!);
  if (!isMatched) {
    throw new AppError(httpStatus.FORBIDDEN, 'Incorrect password');
  }

  const jwtPayload = { userId: admin._id.toString(), role: admin.role };
  const accessToken = createToken(jwtPayload, config.jwt_access_secret!, config.jwt_access_expires_in!);
  const refreshToken = createToken(jwtPayload, config.jwt_refresh_secret!, config.jwt_refresh_expires_in!);

  return { accessToken, refreshToken, admin };
};

const createAdminInDB = async (payload: any) => {
  return await Admin.create(payload);
};
const approveVendorRequest = async (id: string) => {
  const user = await User.findById(id);
  if (!user || !user.vendor) throw new AppError(404, 'Invalid vendor request');

  const result = await User.findByIdAndUpdate(
    id,
    {
      role: 'vendor', 
      status: 'active'
    },
    { new: true }
  );

  return result;
};
const getPendingVendorsFromDB = async (query: Record<string, unknown>) => {
  const pendingQuery = new QueryBuilder(
    User.find({ role: 'user', status: 'pending' }), 
    query
  ).filter().sort().paginate();

  const result = await pendingQuery.modelQuery;
  const meta = await pendingQuery.countTotal();
  return { meta, result };
};
export const AdminServices = { loginAdminFromDB, createAdminInDB,approveVendorRequest,getPendingVendorsFromDB };
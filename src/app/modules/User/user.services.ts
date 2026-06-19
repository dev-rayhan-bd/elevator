import QueryBuilder from '../../builder/QueryBuilder';
import { User } from './user.model';
import httpStatus from 'http-status'
import AppError from '../../errors/AppError';
import { Admin } from '../Admin/admin.model';

const getAllUsersFromDB = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(User.find({ isDeleted: false }), query)
    .search(['firstName', 'lastName', 'email', 'phone'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();
  return { meta, result };
};

const updateProfileInDB = async (userId: string, payload: any) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
delete payload.role;
  delete payload.password;
  delete payload.email;
  delete payload.isOtpVerified
  if (user.role === 'vendor' && payload.vendor) {
    let score = 0;
    const vendorData = payload.vendor || user.vendor;

    if (vendorData?.isVerifiedBadge) score += 25; // Business Verification
    if (vendorData?.categories?.length >= 3) score += 20; // Services Variety
    if (vendorData?.portfolio?.length > 0) score += 15; // Portfolio/Activity

    
    if (payload.vendor) {
      payload.vendor.profileScore = score;
    } else {
      payload['vendor.profileScore'] = score;
    }
  }
  
  return await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
};

const manageAvailabilityInDB = async (userId: string, availability: any) => {
  return await User.findByIdAndUpdate(userId, { 'vendor.availability': availability }, { new: true });
};
const applyToBecomeVendor = async (userId: string, vendorData: any) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  if (user.role === 'vendor') throw new AppError(400, 'You are already a vendor');

  const result = await User.findByIdAndUpdate(
    userId,
    {
      status: 'pending',
      vendor: {
        ...vendorData,
        // isProfileCompleted: true,
        profileScore: 40 
      }
    },
    { new: true, runValidators: true }
  );

  return result;
};
const getMeFromDB = async (userId: string, role: string) => {
  let result = null;


  if (role === 'admin' || role === 'superAdmin') {
    result = await Admin.findById(userId);
  } else {

    result = await User.findById(userId);
  }

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile not found!');
  }

  return result;
};

export const UserServices = { getAllUsersFromDB, updateProfileInDB,manageAvailabilityInDB,applyToBecomeVendor,getMeFromDB };
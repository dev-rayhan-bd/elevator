import QueryBuilder from '../../builder/QueryBuilder';
import { User } from './user.model';
import { TUser } from './user.interface';

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

const updateProfileInDB = async (userId: string, payload: Partial<TUser>) => {
  return await User.findByIdAndUpdate(userId, payload, { new: true, runValidators: true });
};

export const UserServices = { getAllUsersFromDB, updateProfileInDB };
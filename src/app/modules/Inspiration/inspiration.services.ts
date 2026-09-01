import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { Inspiration } from './inspiration.model';
import { User } from '../User/user.model';
import { Types } from 'mongoose';
import { sendNotificationToMultipleUsers } from '../../utils/sendNotification';
import { ServiceCategory } from '../ServiceCategory/category.model';

// ── Admin: Create ──
const createInspirationIntoDB = async (payload: Record<string, unknown>) => {
  // Validate vendor exists and is a vendor
  const vendorUser = await User.findOne({
    _id: new Types.ObjectId(payload.vendor as string),
    role: 'vendor',
  });
  if (!vendorUser) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Vendor not found');
  }

  const categoryExists = await ServiceCategory.findById(payload.category);
  if (!categoryExists) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Category not found');
  }

  const result = await Inspiration.create(payload);

  // ── Bulk push to all active users ──
  try {
    const activeUsers = await User.find({
      role: { $in: ['user', 'vendor'] },
      status: 'active',
      isDeleted: false,
    }).select('_id');

    if (activeUsers.length > 0) {
      sendNotificationToMultipleUsers(
        activeUsers.map((u) => u._id.toString()),
        '📸 Fresh Wedding Inspo Inside!',
        'Tap to get inspired!',
        'new_inspiration',
        { inspirationId: result._id.toString(), action: 'new_inspiration' },
      );
    }
  } catch (error) {
    console.error('❌ Error sending inspiration bulk notification:', error);
  }

  return result;
};

// ── Admin: Update ──
const updateInspirationInDB = async (
  id: string,
  payload: Record<string, unknown>,
) => {
  // If vendor is being changed, validate new vendor exists
  if (payload.vendor) {
    const vendorUser = await User.findOne({
      _id: new Types.ObjectId(payload.vendor as string),
      role: 'vendor',
    });
    if (!vendorUser) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Vendor not found');
    }
  }

  // If category is being changed, validate new category exists
  if (payload.category) {
    const categoryExists = await ServiceCategory.findById(payload.category);
    if (!categoryExists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Category not found');
    }
  }

  const result = await Inspiration.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Inspiration not found');
  return result;
};

// ── Admin: Delete ──
const deleteInspirationFromDB = async (id: string) => {
  const result = await Inspiration.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Inspiration not found');
  return result;
};

// ── Admin: Get Single (for edit form) ──
const getSingleInspirationFromDB = async (id: string) => {
  const result = await Inspiration.findById(id)
    .populate('vendor', 'firstName lastName fullName image phone')
    .populate('category', 'name image');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Inspiration not found');
  return result;
};

// ── Public: Get All with QueryBuilder ──
const getAllInspirationsFromDB = async (query: Record<string, unknown>) => {
  const inspirationQuery = new QueryBuilder(
    Inspiration.find({ isActive: true })
      .populate('vendor', 'firstName lastName fullName image phone')
      .populate('category', 'name image'),
    query,
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await inspirationQuery.modelQuery;
  const meta = await inspirationQuery.countTotal();
  return { meta, result };
};

// ── Admin: Get All (including inactive) ──
const getAdminInspirationsFromDB = async (query: Record<string, unknown>) => {
  const inspirationQuery = new QueryBuilder(
    Inspiration.find()
      .populate('vendor', 'firstName lastName fullName image phone')
      .populate('category', 'name image'),
    query,
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await inspirationQuery.modelQuery;
  const meta = await inspirationQuery.countTotal();
  return { meta, result };
};

export const InspirationServices = {
  createInspirationIntoDB,
  updateInspirationInDB,
  deleteInspirationFromDB,
  getSingleInspirationFromDB,
  getAllInspirationsFromDB,
  getAdminInspirationsFromDB,
};

import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import {
  AdvisorService,
  AdvisorBooking,
} from './advisor.model';
import { User } from '../User/user.model';

// ══════════════════════════════════════════════
//  ADMIN: ADVISOR SERVICE CRUD
// ══════════════════════════════════════════════

const createAdvisorServiceIntoDB = async (payload: any) => {
  const existing = await AdvisorService.findOne({ name: payload.name });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'Advisor service name already exists');
  }
  const result = await AdvisorService.create(payload);
  return result;
};

const updateAdvisorServiceInDB = async (id: string, payload: any) => {
  if (payload.name) {
    const duplicate = await AdvisorService.findOne({
      name: payload.name,
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new AppError(httpStatus.CONFLICT, 'Advisor service name already taken');
    }
  }
  const result = await AdvisorService.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Advisor service not found');
  return result;
};

const deleteAdvisorServiceFromDB = async (id: string) => {
  const bookingCount = await AdvisorBooking.countDocuments({ advisorService: id });
  if (bookingCount > 0) {
    const result = await AdvisorService.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Advisor service not found');
    return result;
  }
  const result = await AdvisorService.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Advisor service not found');
  return result;
};

const getAllAdvisorServicesFromDB = async (query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(AdvisorService.find(), query)
    .search(['name', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

const getSingleAdvisorServiceFromDB = async (id: string) => {
  const result = await AdvisorService.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Advisor service not found');
  return result;
};

// ══════════════════════════════════════════════
//  PUBLIC: GET ACTIVE ADVISOR SERVICES
// ══════════════════════════════════════════════

const getActiveAdvisorServicesFromDB = async (query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    AdvisorService.find({ isActive: true }),
    query,
  )
    .search(['name', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

// ══════════════════════════════════════════════
//  USER: BOOK AN ADVISOR
// ══════════════════════════════════════════════

const createBookingIntoDB = async (userId: string, payload: any) => {
  const service = await AdvisorService.findById(payload.advisorService);
  if (!service) throw new AppError(httpStatus.NOT_FOUND, 'Advisor service not found');
  if (!service.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This advisor service is currently unavailable');
  }

  const bookingData: any = {
    user: new Types.ObjectId(userId),
    advisorService: new Types.ObjectId(payload.advisorService),
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    weddingDate: new Date(payload.weddingDate),
    weddingLocation: payload.weddingLocation,
    budget: payload.budget,
    guestCount: payload.guestCount,
    specialRequirements: payload.specialRequirements,
    status: 'pending',
    paymentStatus: 'unpaid',
  };

  const result = await AdvisorBooking.create(bookingData);

  return result.populate([
    { path: 'advisorService', select: 'name description price' },
  ]);
};

// ══════════════════════════════════════════════
//  USER: GET MY BOOKINGS
// ══════════════════════════════════════════════

const getMyBookingsFromDB = async (userId: string, query: Record<string, unknown>) => {
  const bookingQuery = new QueryBuilder(
    AdvisorBooking.find({ user: new Types.ObjectId(userId) })
      .populate('advisorService', 'name description price')
      .populate('assignedAssociate', 'firstName lastName image phone')
      .sort('-createdAt'),
    query,
  )
    .filter()
    .paginate()
    .fields();

  const result = await bookingQuery.modelQuery;
  const meta = await bookingQuery.countTotal();
  return { meta, result };
};

// ══════════════════════════════════════════════
//  USER: GET SINGLE BOOKING
// ══════════════════════════════════════════════

const getMySingleBookingFromDB = async (userId: string, bookingId: string) => {
  const result = await AdvisorBooking.findOne({
    _id: new Types.ObjectId(bookingId),
    user: new Types.ObjectId(userId),
  })
    .populate('advisorService', 'name description price')
    .populate('assignedAssociate', 'firstName lastName image phone email');

  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  return result;
};

// ══════════════════════════════════════════════
//  USER: CANCEL BOOKING
// ══════════════════════════════════════════════

const cancelBookingFromDB = async (userId: string, bookingId: string) => {
  const booking = await AdvisorBooking.findOne({
    _id: new Types.ObjectId(bookingId),
    user: new Types.ObjectId(userId),
  });

  if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  if (!['pending', 'assigned'].includes(booking.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot cancel a booking that is in progress or already completed',
    );
  }

  booking.status = 'cancelled';
  booking.cancellationReason = 'Cancelled by user';
  await booking.save();
  return booking;
};

// ══════════════════════════════════════════════
//  ADMIN: GET ALL BOOKINGS
// ══════════════════════════════════════════════

const adminGetAllBookingsFromDB = async (query: Record<string, unknown>) => {
  const bookingQuery = new QueryBuilder(
    AdvisorBooking.find()
      .populate('user', 'firstName lastName email image phone')
      .populate('advisorService', 'name description price')
      .populate('assignedAssociate', 'firstName lastName image phone'),
    query,
  )
    .search(['adminNotes'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await bookingQuery.modelQuery;
  const meta = await bookingQuery.countTotal();

  // ── Stats ──
  const totalBookings = await AdvisorBooking.countDocuments();
  const pending = await AdvisorBooking.countDocuments({ status: 'pending' });
  const assigned = await AdvisorBooking.countDocuments({ status: 'assigned' });
  const inProgress = await AdvisorBooking.countDocuments({ status: 'in_progress' });
  const completed = await AdvisorBooking.countDocuments({ status: 'completed' });
  const cancelled = await AdvisorBooking.countDocuments({ status: 'cancelled' });

  const revenueAgg = await AdvisorBooking.aggregate([
    { $match: { status: { $in: ['completed', 'in_progress'] } } },
    { $group: { _id: null, totalRevenue: { $sum: '$budget' } } },
  ]);
  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

  return {
    meta,
    result,
    stats: {
      total: totalBookings,
      pending,
      assigned,
      inProgress,
      completed,
      cancelled,
      totalRevenue,
    },
  };
};

// ══════════════════════════════════════════════
//  ADMIN: ASSIGN ASSOCIATE TO BOOKING
// ══════════════════════════════════════════════

const assignAssociateToBookingInDB = async (
  bookingId: string,
  associateId: string,
  adminNotes?: string,
) => {
  const booking = await AdvisorBooking.findById(bookingId);
  if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');

  if (!['pending', 'assigned'].includes(booking.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot assign associate to a booking with status '${booking.status}'`,
    );
  }

  const associate = await User.findById(associateId);
  if (!associate || associate.role !== 'vendor') {
    throw new AppError(httpStatus.NOT_FOUND, 'Associate vendor not found');
  }

  booking.assignedAssociate = new Types.ObjectId(associateId);
  booking.status = 'assigned';
  booking.assignedAt = new Date();
  if (adminNotes) booking.adminNotes = adminNotes;
  await booking.save();

  return booking.populate([
    { path: 'assignedAssociate', select: 'firstName lastName image phone email' },
    { path: 'advisorService', select: 'name description price' },
    { path: 'user', select: 'firstName lastName email image' },
  ]);
};

// ══════════════════════════════════════════════
//  ADMIN: UPDATE BOOKING STATUS
// ══════════════════════════════════════════════

const adminUpdateBookingStatusInDB = async (
  bookingId: string,
  payload: { status: string; cancellationReason?: string; adminNotes?: string },
) => {
  const booking = await AdvisorBooking.findById(bookingId);
  if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');

  const allowedTransitions: Record<string, string[]> = {
    pending: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  const currentAllowed = allowedTransitions[booking.status] || [];
  if (!currentAllowed.includes(payload.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot transition from '${booking.status}' to '${payload.status}'`,
    );
  }

  if (payload.status === 'cancelled' && !payload.cancellationReason) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cancellation reason is required when cancelling a booking',
    );
  }

  booking.status = payload.status as any;
  if (payload.cancellationReason) booking.cancellationReason = payload.cancellationReason;
  if (payload.adminNotes) booking.adminNotes = payload.adminNotes;
  if (payload.status === 'completed') booking.completedAt = new Date();

  await booking.save();

  return booking.populate([
    { path: 'user', select: 'firstName lastName email image' },
    { path: 'assignedAssociate', select: 'firstName lastName image phone' },
    { path: 'advisorService', select: 'name description price' },
  ]);
};

// ══════════════════════════════════════════════
//  ADMIN: DASHBOARD STATISTICS
// ══════════════════════════════════════════════

const getAdvisorDashboardStatsFromDB = async () => {
  const now = new Date();

  const totalServices = await AdvisorService.countDocuments();
  const activeServices = await AdvisorService.countDocuments({ isActive: true });

  const totalBookings = await AdvisorBooking.countDocuments();
  const pendingBookings = await AdvisorBooking.countDocuments({ status: 'pending' });
  const assignedBookings = await AdvisorBooking.countDocuments({ status: 'assigned' });
  const inProgressBookings = await AdvisorBooking.countDocuments({ status: 'in_progress' });
  const completedBookings = await AdvisorBooking.countDocuments({ status: 'completed' });
  const cancelledBookings = await AdvisorBooking.countDocuments({ status: 'cancelled' });

  const revenueAgg = await AdvisorBooking.aggregate([
    { $match: { status: { $in: ['completed', 'in_progress'] } } },
    { $group: { _id: null, totalRevenue: { $sum: '$budget' } } },
  ]);
  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthBookings = await AdvisorBooking.countDocuments({
    createdAt: { $gte: monthStart },
  });

  const bookingsByService = await AdvisorBooking.aggregate([
    { $group: { _id: '$advisorService', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'advisorservices',
        localField: '_id',
        foreignField: '_id',
        as: 'service',
      },
    },
    { $unwind: '$service' },
    {
      $project: {
        serviceName: '$service.name',
        count: 1,
      },
    },
  ]);

  const recentBookings = await AdvisorBooking.find()
    .populate('user', 'firstName lastName image')
    .populate('advisorService', 'name')
    .populate('assignedAssociate', 'firstName lastName image')
    .sort('-createdAt')
    .limit(5)
    .select('status budget weddingDate createdAt');

  return {
    services: { total: totalServices, active: activeServices },
    bookings: {
      total: totalBookings,
      pending: pendingBookings,
      assigned: assignedBookings,
      inProgress: inProgressBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
    },
    revenue: { total: totalRevenue, thisMonth: thisMonthBookings },
    bookingsByService,
    recentBookings,
  };
};

// ══════════════════════════════════════════════
//  ADMIN: EXPORT ALL DATA
// ══════════════════════════════════════════════

const exportAllDataFromDB = async () => {
  const services = await AdvisorService.find().lean();
  const bookings = await AdvisorBooking.find()
    .populate('user', 'firstName lastName email phone')
    .populate('advisorService', 'name description price')
    .populate('assignedAssociate', 'firstName lastName email phone')
    .lean();

  return { services, bookings };
};

export const AdvisorServices = {
  createAdvisorServiceIntoDB,
  updateAdvisorServiceInDB,
  deleteAdvisorServiceFromDB,
  getAllAdvisorServicesFromDB,
  getSingleAdvisorServiceFromDB,
  getActiveAdvisorServicesFromDB,
  createBookingIntoDB,
  getMyBookingsFromDB,
  getMySingleBookingFromDB,
  cancelBookingFromDB,
  adminGetAllBookingsFromDB,
  assignAssociateToBookingInDB,
  adminUpdateBookingStatusInDB,
  getAdvisorDashboardStatsFromDB,
  exportAllDataFromDB,
};

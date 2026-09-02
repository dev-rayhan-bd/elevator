import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import {
  AdvisorService,
  AdvisorBooking,
  AdvisorReview,
} from './advisor.model';
import { User } from '../User/user.model';
import { getEmailTemplate } from '../../utils/emailTemplate';
import PDFDocument from 'pdfkit';

// ══════════════════════════════════════════════
//  ADMIN: ADVISOR SERVICE CRUD
// ══════════════════════════════════════════════

const createAdvisorServiceIntoDB = async (payload: any) => {
  // ── Limit: Only 1 advisor service allowed for now ──
  const totalCount = await AdvisorService.countDocuments();
  if (totalCount >= 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only one advisor service is allowed. Please update the existing service instead.',
    );
  }

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

  // Fetch all active reviews by this user for advisor services/bookings
  const userReviews = await AdvisorReview.find({
    user: new Types.ObjectId(userId),
    isDeleted: false,
  }).lean();

  const reviewsMap = new Map<string, any>();
  const serviceReviewsMap = new Map<string, any>();

  for (const review of userReviews) {
    if (review.booking) {
      reviewsMap.set(review.booking.toString(), review);
    }
    if (review.advisorService) {
      serviceReviewsMap.set(review.advisorService.toString(), review);
    }
  }

  const updatedResult = result.map((doc: any) => {
    const docObj = doc.toObject ? doc.toObject() : doc;
    const bookingId = docObj._id.toString();
    const serviceId = docObj.advisorService?._id?.toString() || docObj.advisorService?.toString();

    const review = reviewsMap.get(bookingId) || (serviceId ? serviceReviewsMap.get(serviceId) : null);
    const isReviewed = Boolean(review);

    return {
      ...docObj,
      isReviewed,
      hasReviewed: isReviewed,
      review: review || null,
    };
  });

  return { meta, result: updatedResult };
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

  const docObj = result.toObject();
  const serviceId = docObj.advisorService?._id?.toString() || docObj.advisorService?.toString();

  const review = await AdvisorReview.findOne({
    user: new Types.ObjectId(userId),
    $or: [
      { booking: new Types.ObjectId(bookingId) },
      ...(serviceId ? [{ advisorService: new Types.ObjectId(serviceId) }] : []),
    ],
    isDeleted: false,
  }).lean();

  const isReviewed = Boolean(review);

  return {
    ...docObj,
    isReviewed,
    hasReviewed: isReviewed,
    review: review || null,
  };
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
  const filterCondition: Record<string, any> = {};

  // Status Filter
  if (query.status) {
    const statusVal = String(query.status).trim();
    if (statusVal === 'inProgress' || statusVal === 'in_progress') {
      filterCondition.status = 'in_progress';
    } else {
      filterCondition.status = statusVal;
    }
  }

  // Payment Status Filter
  if (query.paymentStatus) {
    filterCondition.paymentStatus = String(query.paymentStatus).trim();
  }

  // Date Range Filter (supports startDate/endDate, dateFrom/dateTo, from/to)
  const startDate = query.startDate || query.dateFrom || query.from;
  const endDate = query.endDate || query.dateTo || query.to;

  if (startDate || endDate) {
    const dateQuery: Record<string, any> = {};
    if (startDate) {
      dateQuery.$gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      if (typeof endDate === 'string' && endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      dateQuery.$lte = end;
    }
    const dateField = query.dateField === 'weddingDate' ? 'weddingDate' : 'createdAt';
    filterCondition[dateField] = dateQuery;
  }

  const queryObj = { ...query };
  delete queryObj.status;
  delete queryObj.paymentStatus;
  delete queryObj.startDate;
  delete queryObj.endDate;
  delete queryObj.dateFrom;
  delete queryObj.dateTo;
  delete queryObj.from;
  delete queryObj.to;
  delete queryObj.dateField;

  const bookingQuery = new QueryBuilder(
    AdvisorBooking.find(filterCondition)
      .populate('user', 'firstName lastName email image phone')
      .populate('advisorService', 'name description price')
      .populate('assignedAssociate', 'firstName lastName image phone'),
    queryObj,
  )
    .search(['fullName', 'email', 'phone', 'adminNotes'])
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

  // Fetch logo buffer
  let logoBuffer: Buffer | null = null;
  try {
    const res = await fetch("https://res.cloudinary.com/da1uxchgo/image/upload/v1781263900/un4seen/i9ti2hs0hnzi8apxz5fj.png");
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      logoBuffer = Buffer.from(arrayBuffer);
    }
  } catch (error) {
    console.error("Failed to fetch logo for PDF", error);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // --- Header ---
    doc.rect(0, 0, 595, 85).fill('#0f172a');
    
    if (logoBuffer) {
      doc.image(logoBuffer, 50, 15, { height: 55 });
    } else {
      doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('WEEPLAN', 50, 30);
    }

    // Align text to the right side of the header so it doesn't overlap the logo
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text(
      `Advisor Data Report\nGenerated on ${new Date().toLocaleDateString()}`,
      250, 30, { align: 'right', width: 295 }
    );
    
    // Move cursor below the header
    doc.y = 110;

    // --- Helper function for dividers ---
    const drawDivider = () => {
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.moveDown(0.5);
    };

    // --- Services Section ---
    doc.fillColor('#334155').fontSize(18).font('Helvetica-Bold').text('Advisor Services');
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor('#cbd5e1').lineWidth(2).stroke();
    doc.moveDown(1.5);

    if (services.length === 0) {
      doc.fillColor('#64748b').fontSize(12).font('Helvetica').text('No advisor services found.');
    } else {
      services.forEach((s) => {
        doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(s.name, { continued: true });
        
        // Status indicator (simulated with text on the same line using spaces, or just next line)
        const statusColor = s.isActive ? '#10b981' : '#ef4444';
        doc.fillColor(statusColor).fontSize(10).text(`   [ ${s.isActive ? 'ACTIVE' : 'INACTIVE'} ]`);
        
        doc.moveDown(0.5);
        doc.fillColor('#475569').fontSize(11).font('Helvetica-Bold').text('Price: ', { continued: true })
           .font('Helvetica').text(`$${s.price.toLocaleString()}`);
        
        doc.moveDown(0.5);
        doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(s.description);
        
        drawDivider();
      });
    }

    doc.moveDown(2);

    // --- Bookings Section ---
    doc.fillColor('#334155').fontSize(18).font('Helvetica-Bold').text('Recent Bookings');
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor('#cbd5e1').lineWidth(2).stroke();
    doc.moveDown(1.5);

    if (bookings.length === 0) {
      doc.fillColor('#64748b').fontSize(12).font('Helvetica').text('No bookings found.');
    } else {
      bookings.forEach((b: any) => {
        doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(`${b.fullName}`, { continued: true });
        
        const bStatusColor = b.status === 'completed' ? '#10b981' : b.status === 'pending' ? '#f59e0b' : '#3b82f6';
        doc.fillColor(bStatusColor).fontSize(10).text(`   [ ${b.status.toUpperCase()} ]`);
        
        doc.moveDown(0.3);
        
        // Grid-like layout using tabs/columns
        const yStart = doc.y;
        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text('Service:', 50, yStart, { width: 60 });
        doc.font('Helvetica').text(b.advisorService?.name || 'N/A', 110, yStart, { width: 180 });
        
        doc.font('Helvetica-Bold').text('Client Email:', 300, yStart, { width: 70 });
        doc.font('Helvetica').text(b.user?.email || 'N/A', 370, yStart);
        
        doc.moveDown(0.2);
        const yRow2 = doc.y;
        doc.font('Helvetica-Bold').text('Budget:', 50, yRow2, { width: 60 });
        doc.font('Helvetica').text(`$${b.budget.toLocaleString()}`, 110, yRow2, { width: 180 });
        
        doc.font('Helvetica-Bold').text('Guests:', 300, yRow2, { width: 70 });
        doc.font('Helvetica').text(b.guestCount.toString(), 370, yRow2);

        doc.moveDown(0.2);
        const yRow3 = doc.y;
        doc.font('Helvetica-Bold').text('Wedding:', 50, yRow3, { width: 60 });
        doc.font('Helvetica').text(`${new Date(b.weddingDate).toLocaleDateString()} at ${b.weddingLocation}`, 110, yRow3, { width: 400 });

        doc.moveDown(0.2);
        const yRow4 = doc.y;
        doc.font('Helvetica-Bold').text('Assigned:', 50, yRow4, { width: 60 });
        doc.font('Helvetica').text(b.assignedAssociate ? `${b.assignedAssociate.firstName} ${b.assignedAssociate.lastName}` : 'Unassigned', 110, yRow4, { width: 400 });

        // Reset X to default margin after custom positions
        doc.x = 50;
        doc.moveDown(1);
        
        drawDivider();
      });
    }

    doc.end();
  });
};

// ══════════════════════════════════════════════
//  USER: ADVISOR REVIEW
// ══════════════════════════════════════════════

const createAdvisorReviewInDB = async (userId: string, payload: {
  advisorService: string;
  rating: number;
  comment: string;
}) => {
  const { advisorService, rating, comment } = payload;

  // 1. Verify the advisor service exists & is active
  const service = await AdvisorService.findById(advisorService);
  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, 'Advisor service not found');
  }

  // 2. Verify the user has a completed booking for this service (purchase check)
  const booking = await AdvisorBooking.findOne({
    user: new Types.ObjectId(userId),
    advisorService: new Types.ObjectId(advisorService),
    status: { $in: ['in_progress', 'completed'] },
  });
  if (!booking) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only review an advisor service you have purchased and used.',
    );
  }

  // 3. Check for existing review (one per user per advisor service)
  const existing = await AdvisorReview.findOne({
    user: new Types.ObjectId(userId),
    advisorService: new Types.ObjectId(advisorService),
    isDeleted: false,
  });
  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already reviewed this advisor service.',
    );
  }

  // 4. Create the review
  const result = await AdvisorReview.create({
    user: new Types.ObjectId(userId),
    advisorService: new Types.ObjectId(advisorService),
    booking: booking._id,
    rating,
    comment,
  });

  return result;
};

const getAdvisorServiceReviewsFromDB = async (
  advisorServiceId: string,
  query: Record<string, unknown>,
  userId?: string,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    AdvisorReview.find({ advisorService: advisorServiceId, isDeleted: false })
      .populate('user', 'firstName lastName image')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    AdvisorReview.countDocuments({ advisorService: advisorServiceId, isDeleted: false }),
  ]);

  // Rating summary
  const allReviews = await AdvisorReview.find({
    advisorService: advisorServiceId,
    isDeleted: false,
  })
    .select('rating')
    .lean();
  const summary = computeAdvisorRatingSummary(allReviews);

  // Add isOwnReview flag
  const reviewsWithFlag = reviews.map((review) => ({
    ...review.toObject(),
    isOwnReview: userId ? review.user._id.toString() === userId : false,
  }));

  return {
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    reviews: reviewsWithFlag,
    summary,
  };
};

const deleteAdvisorReviewInDB = async (userId: string, reviewId: string) => {
  const review = await AdvisorReview.findOne({
    _id: reviewId,
    user: userId,
    isDeleted: false,
  });
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found or unauthorized');
  }

  review.isDeleted = true;
  await review.save();
  return review;
};

const adminGetAllReviewsFromDB = async (query: Record<string, unknown>) => {
  const reviewQuery = new QueryBuilder(
    AdvisorReview.find()
      .populate('user', 'firstName lastName email image phone')
      .populate('advisorService', 'name description price')
      .populate('booking', 'status budget createdAt'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery;
  const meta = await reviewQuery.countTotal();

  // Overall rating summary
  const allReviews = await AdvisorReview.find().select('rating').lean();
  const summary = computeAdvisorRatingSummary(allReviews);

  return { meta, result, summary };
};

const adminDeleteAdvisorReviewFromDB = async (reviewId: string) => {
  const review = await AdvisorReview.findByIdAndUpdate(
    reviewId,
    { isDeleted: true },
    { new: true },
  );
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, 'Review not found');
  }
  return review;
};

// ── Helper ──
const computeAdvisorRatingSummary = (reviews: any[]) => {
  const total = reviews.length;
  if (total === 0) {
    return {
      average: 0,
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const sum = reviews.reduce((acc: number, r: any) => acc + r.rating, 0);
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    distribution[r.rating as keyof typeof distribution]++;
  }

  return {
    average: Math.round((sum / total) * 10) / 10,
    total,
    distribution,
  };
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
  createAdvisorReviewInDB,
  getAdvisorServiceReviewsFromDB,
  deleteAdvisorReviewInDB,
  adminDeleteAdvisorReviewFromDB,
  adminGetAllReviewsFromDB,
};

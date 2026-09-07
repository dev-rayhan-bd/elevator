import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { EventRequest } from './eventRequest.model';
import { EventQuote } from '../EventQuote/eventQuote.model';
import { User } from '../User/user.model';
import { sendNotification, sendNotificationToMultipleUsers } from '../../utils/sendNotification';

/**
 * User: Create a new event request (post requirement)
 */
const createEventRequestIntoDB = async (userId: string, payload: Record<string, unknown>) => {
  const requestData = {
    user: new Types.ObjectId(userId),
    eventType: new Types.ObjectId(payload.eventType as string),
    eventDate: new Date(payload.eventDate as string),
    guestCount: payload.guestCount,
    budgetMin: payload.budgetMin,
    budgetMax: payload.budgetMax,
    area: new Types.ObjectId(payload.area as string),
    serviceCategory: new Types.ObjectId(payload.serviceCategory as string),
    additionalDetails: payload.additionalDetails,
    referenceImages: payload.referenceImages,
  };

  const result = await EventRequest.create(requestData);

  // ── Push notification to relevant vendors ──
  try {
    const relevantVendors = await User.find({
      role: 'vendor',
      status: 'active',
      isDeleted: false,
      'vendor.categories': payload.serviceCategory as string,
      'vendor.serviceArea': payload.area as string,
    }).select('_id');

    if (relevantVendors.length > 0) {
      sendNotificationToMultipleUsers(
        relevantVendors.map((v) => v._id.toString()),
        '⏳ New Project Posted!',
        'Submit your quotation before others take the lead!',
        'new_requirement',
        { eventRequestId: result._id.toString(), action: 'new_requirement' },
      );
    }
  } catch (error) {
    console.error('❌ Error sending new-requirement vendor notification:', error);
  }

  return result;
};

/**
 * User: Get my own event requests
 */
const getMyEventRequestsFromDB = async (userId: string, query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    EventRequest.find({ user: new Types.ObjectId(userId) })
      .populate('eventType', 'name image')
      .populate('area', 'name region')
      .populate('serviceCategory', 'name image')
      .sort('-createdAt'),
    query,
  )
    .filter()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

/**
 * User: Get single event request detail (own requests only)
 */
const getSingleEventRequestFromDB = async (userId: string, requestId: string) => {
  const result = await EventRequest.findOne({
    _id: new Types.ObjectId(requestId),
    user: new Types.ObjectId(userId),
  })
    .populate('eventType', 'name image')
    .populate('area', 'name region')
    .populate('serviceCategory', 'name image');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  return result;
};

/**
 * Vendor: Get all active event requests (for "All Posts" / bidding page)
 */
const getAllActiveEventRequestsFromDB = async (query: Record<string, unknown>) => {
  const serviceQuery = new QueryBuilder(
    EventRequest.find({ status: 'active' })
      .populate('user', 'firstName lastName image')
      .populate('eventType', 'name image')
      .populate('area', 'name region')
      .populate('serviceCategory', 'name image'),
    query,
  )
    .search(['additionalDetails'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await serviceQuery.modelQuery;
  const meta = await serviceQuery.countTotal();
  return { meta, result };
};

/**
 * Vendor: Get single event request detail (for viewing before bidding)
 */
const getEventRequestDetailForVendorFromDB = async (requestId: string) => {
  const result = await EventRequest.findById(requestId)
    .populate('user', 'firstName lastName image')
    .populate('eventType', 'name image')
    .populate('area', 'name region')
    .populate('serviceCategory', 'name image');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  return result;
};

/**
 * User: Update event request status (close/cancel)
 */
const updateEventRequestStatusFromDB = async (
  userId: string,
  requestId: string,
  status: string,
) => {
  const eventRequest = await EventRequest.findOne({
    _id: new Types.ObjectId(requestId),
    user: new Types.ObjectId(userId),
  });
  if (!eventRequest) throw new AppError(httpStatus.NOT_FOUND, 'Event request not found or unauthorized');

  // Prevent changing already closed/cancelled requests
  if (eventRequest.status === 'closed' || eventRequest.status === 'cancelled') {
    throw new AppError(httpStatus.BAD_REQUEST, `This event request is already ${eventRequest.status}`);
  }

  // If cancelling, decline all associated quotes and notify vendors
  if (status === 'cancelled') {
    const pendingQuotes = await EventQuote.find({
      eventRequest: eventRequest._id,
      status: { $in: ['pending', 'countered'] },
    });

    await EventQuote.updateMany(
      { eventRequest: eventRequest._id, status: { $in: ['pending', 'countered'] } },
      { status: 'declined' },
    );

    // Notify all vendors whose quotes are being declined due to cancellation
    for (const quote of pendingQuotes) {
      sendNotification(
        quote.vendor.toString(),
        'Event Request Cancelled',
        `The client has cancelled their event request. Your quote of PKR ${quote.quoteAmount.toLocaleString()} has been declined.`,
        'request_cancelled',
        { eventRequestId: eventRequest._id.toString(), quoteId: quote._id.toString(), action: 'request_cancelled' }
      );
    }

    // Notify the user
    sendNotification(
      userId,
      'Event Request Cancelled',
      'Your event request has been cancelled successfully.',
      'request_cancelled',
      { eventRequestId: eventRequest._id.toString(), action: 'request_cancelled' }
    );
  }

  eventRequest.status = status as import('./eventRequest.interface').TEventRequestStatus;
  await eventRequest.save();

  return eventRequest;
};

/**
 * Admin: Get all user requirements with quote counts, multi-field search, full filters, and summary statistics
 */
const getAdminRequirementsFromDB = async (query: Record<string, unknown>) => {
  const [
    totalRequirements,
    activeRequirements,
    closedRequirements,
    cancelledRequirements,
    totalQuotationsReceived,
  ] = await Promise.all([
    EventRequest.countDocuments(),
    EventRequest.countDocuments({ status: 'active' }),
    EventRequest.countDocuments({ status: 'closed' }),
    EventRequest.countDocuments({ status: 'cancelled' }),
    EventQuote.countDocuments(),
  ]);

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build match stage for direct field filters
  const matchStage: Record<string, any> = {};

  if (query.status) {
    matchStage.status = query.status;
  }
  if (query.user || query.userId) {
    matchStage.user = new Types.ObjectId((query.user || query.userId) as string);
  }
  if (query.serviceCategory || query.category) {
    matchStage.serviceCategory = new Types.ObjectId((query.serviceCategory || query.category) as string);
  }
  if (query.eventType) {
    matchStage.eventType = new Types.ObjectId(query.eventType as string);
  }
  if (query.area) {
    matchStage.area = new Types.ObjectId(query.area as string);
  }

  // Budget range filtering
  if (query.minBudget !== undefined) {
    matchStage.budgetMax = { $gte: Number(query.minBudget) };
  }
  if (query.maxBudget !== undefined) {
    matchStage.budgetMin = { ...(matchStage.budgetMin || {}), $lte: Number(query.maxBudget) };
  }

  // Date range filtering (Event Date)
  if (query.startDate || query.endDate) {
    matchStage.eventDate = {};
    if (query.startDate) {
      const sDate = new Date(query.startDate as string);
      sDate.setHours(0, 0, 0, 0);
      matchStage.eventDate.$gte = sDate;
    }
    if (query.endDate) {
      const eDate = new Date(query.endDate as string);
      eDate.setHours(23, 59, 59, 999);
      matchStage.eventDate.$lte = eDate;
    }
  }

  // Post Creation Date range filtering (Created At)
  if (query.createdStartDate || query.createdEndDate) {
    matchStage.createdAt = {};
    if (query.createdStartDate) {
      const csDate = new Date(query.createdStartDate as string);
      csDate.setHours(0, 0, 0, 0);
      matchStage.createdAt.$gte = csDate;
    }
    if (query.createdEndDate) {
      const ceDate = new Date(query.createdEndDate as string);
      ceDate.setHours(23, 59, 59, 999);
      matchStage.createdAt.$lte = ceDate;
    }
  }

  const pipeline: any[] = [
    { $match: matchStage },
    { $sort: { createdAt: -1 } },

    // Lookup quotation/bid counts via Aggregation $lookup & $size
    {
      $lookup: {
        from: 'eventquotes',
        localField: '_id',
        foreignField: 'eventRequest',
        as: 'quotes',
      },
    },
    {
      $addFields: {
        totalQuotesCount: { $size: '$quotes' },
      },
    },
    {
      $project: {
        quotes: 0,
      },
    },

    // Lookup user details
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

    // Lookup eventType details
    {
      $lookup: {
        from: 'eventtypes',
        localField: 'eventType',
        foreignField: '_id',
        as: 'eventType',
      },
    },
    { $unwind: { path: '$eventType', preserveNullAndEmptyArrays: true } },

    // Lookup area details
    {
      $lookup: {
        from: 'serviceareas',
        localField: 'area',
        foreignField: '_id',
        as: 'area',
      },
    },
    { $unwind: { path: '$area', preserveNullAndEmptyArrays: true } },

    // Lookup serviceCategory details
    {
      $lookup: {
        from: 'servicecategories',
        localField: 'serviceCategory',
        foreignField: '_id',
        as: 'serviceCategory',
      },
    },
    { $unwind: { path: '$serviceCategory', preserveNullAndEmptyArrays: true } },

    // Project clean output fields
    {
      $project: {
        'user.password': 0,
        'user.otp': 0,
        'user.otpExpires': 0,
      },
    },
  ];

  // Comprehensive multi-field search (details, user name/email/phone, category/eventType/area names)
  if (query.searchTerm) {
    const searchRegex = { $regex: String(query.searchTerm), $options: 'i' };
    pipeline.push({
      $match: {
        $or: [
          { additionalDetails: searchRegex },
          { 'user.firstName': searchRegex },
          { 'user.lastName': searchRegex },
          { 'user.email': searchRegex },
          { 'user.phone': searchRegex },
          { 'eventType.name': searchRegex },
          { 'serviceCategory.name': searchRegex },
          { 'area.name': searchRegex },
          { 'area.region': searchRegex },
        ],
      },
    });
  }

  // Execute aggregation pipeline for data and count
  const [countResult, result] = await Promise.all([
    EventRequest.aggregate([...pipeline, { $count: 'total' }]),
    EventRequest.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
  ]);

  const total = countResult[0]?.total || 0;
  const totalPage = Math.ceil(total / limit);

  return {
    summary: {
      totalRequirements,
      activeRequirements,
      closedRequirements,
      cancelledRequirements,
      totalQuotationsReceived,
    },
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    result,
  };
};

export const EventRequestServices = {
  createEventRequestIntoDB,
  getMyEventRequestsFromDB,
  getSingleEventRequestFromDB,
  getAllActiveEventRequestsFromDB,
  getEventRequestDetailForVendorFromDB,
  updateEventRequestStatusFromDB,
  getAdminRequirementsFromDB,
};

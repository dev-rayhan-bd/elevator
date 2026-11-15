import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { EventType } from './eventType.model';
import { TEventType } from './eventType.interface';
import { VendorService } from '../VendorService/vendorService.model';

const getAllEventTypesFromDB = async (query: Record<string, unknown>) => {
  const queryObj = { ...query };
  if (!queryObj.sort) {
    queryObj.sort = 'order,-createdAt';
  }

  const eventTypeQuery = new QueryBuilder(EventType.find(), queryObj)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = (await eventTypeQuery.modelQuery.lean()) as any[];
  const meta = await eventTypeQuery.countTotal();

  if (result.length > 0) {
    const eventTypeIds = result.map((e: any) => e._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { isDraft: { $ne: true }, eventTypes: { $in: eventTypeIds } } },
      { $unwind: '$eventTypes' },
      { $match: { eventTypes: { $in: eventTypeIds } } },
      { $group: { _id: '$eventTypes', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    const enrichedResult = result.map((item: any) => ({
      ...item,
      listingCount: countMap.get(String(item._id)) || 0,
      serviceCount: countMap.get(String(item._id)) || 0,
    }));

    return { meta, result: enrichedResult };
  }

  return { meta, result };
};

const getSingleEventTypeFromDB = async (id: string) => {
  const result = await EventType.findById(id).lean();
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Event type not found');

  const serviceCount = await VendorService.countDocuments({
    eventTypes: id,
    isDraft: { $ne: true },
  });

  return {
    ...result,
    listingCount: serviceCount,
    serviceCount,
  };
};

const createEventTypeIntoDB = async (payload: TEventType) => {
  const existing = await EventType.findOne({ name: payload.name });
  if (existing) throw new AppError(httpStatus.CONFLICT, 'Event type already exists');

  if (payload.order === undefined || payload.order === null) {
    const highestOrderDoc = await EventType.findOne().sort({ order: -1 }).select('order');
    payload.order =
      highestOrderDoc && typeof highestOrderDoc.order === 'number'
        ? highestOrderDoc.order + 1
        : 0;
  }

  const result = await EventType.create(payload);
  return result;
};

const updateEventTypeInDB = async (id: string, payload: Partial<TEventType>) => {
  if (payload.name) {
    const duplicate = await EventType.findOne({ name: payload.name, _id: { $ne: id } });
    if (duplicate) throw new AppError(httpStatus.CONFLICT, 'Event type name already taken');
  }
  const result = await EventType.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Event type not found');

  // Cascade disable/enable logic
  if (payload.isActive !== undefined) {
    if (payload.isActive === false) {
      // 1. Disable vendor services referencing this event type
      await VendorService.updateMany(
        { eventTypes: id, isActive: true },
        { isActive: false, isEventTypeDisabled: true },
      );
    } else if (payload.isActive === true) {
      // 2. Restore vendor services referencing this event type that were approved
      await VendorService.updateMany(
        { eventTypes: id, isEventTypeDisabled: true, status: 'approved' },
        { isActive: true, isEventTypeDisabled: false },
      );
    }
  }

  return result;
};

const deleteEventTypeFromDB = async (id: string) => {
  const result = await EventType.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Event type not found');
  return result;
};

const reorderEventTypesInDB = async (orders: { id: string; order: number }[]) => {
  if (!orders || orders.length === 0) {
    return { modifiedCount: 0 };
  }

  const bulkOps = orders.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } },
    },
  }));

  const result = await EventType.bulkWrite(bulkOps);
  return result;
};

const getAllEventTypesListFromDB = async () => {
  const result = (await EventType.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .lean()) as any[];

  if (result.length > 0) {
    const eventTypeIds = result.map((e: any) => e._id);
    const serviceCounts = await VendorService.aggregate([
      { $match: { isDraft: { $ne: true }, eventTypes: { $in: eventTypeIds } } },
      { $unwind: '$eventTypes' },
      { $match: { eventTypes: { $in: eventTypeIds } } },
      { $group: { _id: '$eventTypes', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      serviceCounts.map((s: any) => [String(s._id), s.count]),
    );

    return result.map((item: any) => ({
      ...item,
      listingCount: countMap.get(String(item._id)) || 0,
      serviceCount: countMap.get(String(item._id)) || 0,
    }));
  }

  return result;
};

export const EventTypeServices = {
  getAllEventTypesFromDB,
  getSingleEventTypeFromDB,
  createEventTypeIntoDB,
  updateEventTypeInDB,
  deleteEventTypeFromDB,
  reorderEventTypesInDB,
  getAllEventTypesListFromDB,
};

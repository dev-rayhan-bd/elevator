import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { EventType } from './eventType.model';
import { TEventType } from './eventType.interface';

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

  const result = await eventTypeQuery.modelQuery;
  const meta = await eventTypeQuery.countTotal();
  return { meta, result };
};

const getSingleEventTypeFromDB = async (id: string) => {
  const result = await EventType.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Event type not found');
  return result;
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
  const result = await EventType.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
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

import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Newsletter } from './newsletter.model';
import { INewsletter } from './newsletter.interface';

// ══════════════════════════════════════════════
//  PUBLIC: SUBSCRIBE
// ══════════════════════════════════════════════

const subscribeToNewsletter = async (
  payload: Partial<INewsletter>,
  userId?: string,
) => {
  const email = payload.email!.toLowerCase().trim();

  // Check if already subscribed (active or unsubscribed)
  const existing = await Newsletter.findOne({ email, isDeleted: false });

  if (existing) {
    if (existing.status === 'active') {
      throw new AppError(
        httpStatus.CONFLICT,
        'This email is already subscribed to the newsletter',
      );
    }

    // Re-subscribe if previously unsubscribed
    if (existing.status === 'unsubscribed') {
      existing.status = 'active';
      existing.subscribedAt = new Date();
      existing.unsubscribedAt = undefined;
      if (userId) existing.user = new Types.ObjectId(userId);
      if (payload.name) existing.name = payload.name;
      if (payload.phone) existing.phone = payload.phone;
      await existing.save();
      return existing;
    }

    // Blocked email cannot re-subscribe
    if (existing.status === 'blocked') {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'This email has been blocked from the newsletter',
      );
    }
  }

  const result = await Newsletter.create({
    email,
    name: payload.name,
    phone: payload.phone,
    user: userId ? new Types.ObjectId(userId) : undefined,
    source: 'web',
    status: 'active',
    subscribedAt: new Date(),
  });

  return result;
};

const unsubscribeFromNewsletter = async (email: string) => {
  const subscriber = await Newsletter.findOne({
    email: email.toLowerCase().trim(),
    isDeleted: false,
  });

  if (!subscriber) {
    throw new AppError(httpStatus.NOT_FOUND, 'Email not found in subscriber list');
  }

  if (subscriber.status !== 'active') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Subscriber is already ${subscriber.status}`,
    );
  }

  subscriber.status = 'unsubscribed';
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();

  return subscriber;
};

// ══════════════════════════════════════════════
//  ADMIN: SUBSCRIBER MANAGEMENT
// ══════════════════════════════════════════════

const getAllSubscribersFromDB = async (query: Record<string, unknown>) => {
  const subscriberQuery = new QueryBuilder(
    Newsletter.find({ isDeleted: false }),
    query,
  )
    .search(['email', 'name', 'phone'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await subscriberQuery.modelQuery;
  const meta = await subscriberQuery.countTotal();
  return { meta, result };
};

const getSingleSubscriberFromDB = async (id: string) => {
  const result = await Newsletter.findOne({ _id: id, isDeleted: false });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscriber not found');
  }
  return result;
};

const addSubscriberByAdmin = async (payload: Partial<INewsletter>) => {
  const email = payload.email!.toLowerCase().trim();

  const existing = await Newsletter.findOne({ email, isDeleted: false });
  if (existing) {
    throw new AppError(httpStatus.CONFLICT, 'Email already exists in subscriber list');
  }

  const result = await Newsletter.create({
    email,
    name: payload.name,
    phone: payload.phone,
    source: payload.source || 'admin',
    status: 'active',
    subscribedAt: new Date(),
    tags: payload.tags,
  });

  return result;
};

const bulkImportSubscribers = async (
  subscribers: Array<{ email: string; name?: string; phone?: string }>,
) => {
  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const sub of subscribers) {
    try {
      const email = sub.email.toLowerCase().trim();
      const existing = await Newsletter.findOne({ email, isDeleted: false });
      if (existing) {
        results.skipped++;
        continue;
      }
      await Newsletter.create({
        email,
        name: sub.name,
        phone: sub.phone,
        source: 'import',
        status: 'active',
        subscribedAt: new Date(),
      });
      results.imported++;
    } catch (err: any) {
      results.errors.push(`${sub.email}: ${err.message}`);
    }
  }

  return results;
};

const updateSubscriberFromDB = async (
  id: string,
  payload: Partial<INewsletter>,
) => {
  // Strip restricted fields
  delete (payload as any).email;
  delete (payload as any).isDeleted;
  delete (payload as any).user;
  delete (payload as any).source;
  delete (payload as any).subscribedAt;

  const result = await Newsletter.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: payload },
    { new: true, runValidators: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscriber not found');
  }

  return result;
};

const updateSubscriberStatusFromDB = async (
  id: string,
  status: 'active' | 'unsubscribed' | 'blocked',
) => {
  const subscriber = await Newsletter.findOne({ _id: id, isDeleted: false });
  if (!subscriber) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscriber not found');
  }

  subscriber.status = status;
  if (status === 'unsubscribed') {
    subscriber.unsubscribedAt = new Date();
  } else if (status === 'active') {
    subscriber.unsubscribedAt = undefined;
  }
  await subscriber.save();

  return subscriber;
};

const deleteSubscriberFromDB = async (id: string) => {
  const result = await Newsletter.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscriber not found');
  }

  return result;
};

// ══════════════════════════════════════════════
//  ADMIN: STATS
// ══════════════════════════════════════════════

const getSubscriberStatsFromDB = async () => {
  const [total, active, unsubscribed, blocked, recentSubscribers] =
    await Promise.all([
      Newsletter.countDocuments({ isDeleted: false }),
      Newsletter.countDocuments({ isDeleted: false, status: 'active' }),
      Newsletter.countDocuments({ isDeleted: false, status: 'unsubscribed' }),
      Newsletter.countDocuments({ isDeleted: false, status: 'blocked' }),
      Newsletter.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('email name status createdAt'),
    ]);

  return {
    total,
    active,
    unsubscribed,
    blocked,
    recentSubscribers,
  };
};

export const NewsletterServices = {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getAllSubscribersFromDB,
  getSingleSubscriberFromDB,
  addSubscriberByAdmin,
  bulkImportSubscribers,
  updateSubscriberFromDB,
  updateSubscriberStatusFromDB,
  deleteSubscriberFromDB,
  getSubscriberStatsFromDB,
};

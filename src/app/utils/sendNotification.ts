import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { NotificationModel } from '../modules/Notification/notification.model';
import path from 'path';
import { User } from '../modules/User/user.model';
import { TUser } from '../modules/User/user.interface';
import { Types } from 'mongoose';

// Firebase Initialize (Modular Style)
const serviceAccount = require(path.join(process.cwd(), 'firebase-admin-config.json'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

type LeanUser = TUser & { _id: Types.ObjectId };

/**
 * Send a single push + persist notification to DB (simple version).
 */
export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'general',
  data: Record<string, string> = {}
) => {
  try {
    const user = await User.findById(userId).lean<LeanUser | null>();
    if (!user) {
      console.warn(`⚠️ User not found for notification: ${userId}`);
      return;
    }

    // Persist notification to DB
    await NotificationModel.create({
      user: userId,
      title,
      message,
      type,
      data,
    });

    // Send FCM push if token exists
    if (user.fcmToken) {
      await sendFCMPush(user, title, message, type, data);
    } else {
      console.log(`⚠️ No FCM token found for user: ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
};

/**
 * Internal helper: send FCM push payload.
 */
const sendFCMPush = async (
  user: LeanUser,
  title: string,
  message: string,
  type: string,
  data: Record<string, string> = {}
) => {
  try {
    const payload: Message = {
      token: user.fcmToken!,
      notification: {
        title,
        body: message,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          channelId: 'default_channel',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        type,
        ...data,
      },
    };

    await getMessaging().send(payload);
    console.log(`✅ Push notification sent to user: ${user._id}`);
  } catch (error) {
    console.error(`❌ FCM send failed for user ${user._id}:`, error);
  }
};

/**
 * Send notification to all admin / superAdmin users.
 */
/**
 * Send notification to multiple users (bulk).
 */
export const sendNotificationToMultipleUsers = async (
  userIds: string[],
  title: string,
  message: string,
  type: string = 'general',
  data: Record<string, string> = {}
) => {
  try {
    if (userIds.length === 0) return;
    const notificationPromises = userIds.map((userId) =>
      sendNotification(userId, title, message, type, data)
    );
    await Promise.all(notificationPromises);
    console.log(`🚀 Bulk notifications sent to ${userIds.length} users.`);
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
  }
};

export const sendNotificationToAdmins = async (
  title: string,
  message: string,
  type: string = 'general',
  data: Record<string, string> = {}
) => {
  try {
    const admins = await User.find({
      role: { $in: ['admin', 'superAdmin'] },
      status: 'active',
      isDeleted: false,
    });

    if (admins.length > 0) {
      const notificationPromises = admins.map((admin) =>
        sendNotification(admin._id.toString(), title, message, type, data)
      );
      await Promise.all(notificationPromises);
      console.log(`🚀 Bulk notifications sent to ${admins.length} admins.`);
    }
  } catch (error) {
    console.error('❌ Error sending notification to admins:', error);
  }
};
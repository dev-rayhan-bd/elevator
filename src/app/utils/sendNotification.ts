import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { NotificationModel } from '../modules/Notification/notification.model';
import { UserModel } from '../modules/User/user.model';
import path from 'path';

// Firebase Initialize (Modular Style)
const serviceAccount = require(path.join(process.cwd(), 'firebase-admin-config.json'));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'general'
) => {
  try {
 
    await NotificationModel.create({
      user: userId,
      title,
      message,
      type, 
    });


    const user = await UserModel.findById(userId);
    
    if (user && user.fcmToken) {

      const payload: Message = {
        token: user.fcmToken,
        notification: {
          title: title,
          body: message,
        },
        // Android Specific Configuration
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            channelId: 'default_channel', 
          },
        },
        // iOS/APNS Specific Configuration
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
          type: type,
        },
      };

  
      await getMessaging().send(payload);
      console.log(`✅ Push notification sent to user: ${userId}`);
    } else {
      console.log(`⚠️ No FCM token found for user: ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
};


export const sendNotificationToAdmins = async (
  title: string,
  message: string,
  type: string = 'general'
) => {
  try {
    const admins = await UserModel.find({ 
      role: { $in: ['admin', 'superAdmin'] },
      status: 'active' 
    });

    if (admins.length > 0) {
      const notificationPromises = admins.map((admin) =>
        sendNotification(admin._id.toString(), title, message, type)
      );
      await Promise.all(notificationPromises);
      console.log(`🚀 Bulk notifications sent to ${admins.length} admins.`);
    }
  } catch (error) {
    console.error('❌ Error sending notification to admins:', error);
  }
};
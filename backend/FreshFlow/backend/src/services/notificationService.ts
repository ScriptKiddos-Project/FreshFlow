import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { io } from '../config/socket';

interface NotificationData {
  userId: string;
  type: 'order' | 'price' | 'expiry' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface BulkNotificationData {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export class NotificationService {
  // Send notification to a single user
  async sendNotification(notificationData: NotificationData) {
    try {
      const {
        userId,
        type,
        title,
        message,
        data = {},
        priority = 'medium'
      } = notificationData;

      // Create notification in database
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        data,
        priority,
        isRead: false,
        createdAt: new Date()
      });

      await notification.save();

      // Send real-time notification via Socket.IO
      // Send real-time notification via Socket.IO
      if (io) {
        io.to(`user_${userId}`).emit('notification', {
          id: notification._id,
          type,
          title,
          message,
          data,
          priority,
          timestamp: notification.createdAt
        });
      } else {
        logger.warn(`Socket.IO not initialized. Notification to ${userId} not sent in real-time.`);
      }

      // Send push notification if user has enabled it
      await this.sendPushNotification(userId, title, message, data);

      logger.info(`Notification sent to user ${userId}: ${title}`);

      return notification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send notifications to multiple users
  async sendBulkNotification(bulkData: BulkNotificationData) {
    try {
      const {
        userIds,
        type,
        title,
        message,
        data = {},
        priority = 'medium'
      } = bulkData;

      // Create notifications for all users
      const notifications = userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        data,
        priority,
        isRead: false,
        createdAt: new Date()
      }));

      const savedNotifications = await Notification.insertMany(notifications);

      // Send real-time notifications
      // Send real-time notifications
      if (io) {
        const socket = io; // now it's guaranteed non-undefined
        userIds.forEach(userId => {
          socket.to(`user_${userId}`).emit('notification', {
            type,
            title,
            message,
            data,
            priority,
            timestamp: new Date()
          });
        });
      } else {
        logger.warn('Socket.IO not initialized. Bulk notifications not emitted in real-time.');
      }


      // Send push notifications
      const pushPromises = userIds.map(userId => 
        this.sendPushNotification(userId, title, message, data)
      );
      await Promise.allSettled(pushPromises);

      logger.info(`Bulk notification sent to ${userIds.length} users: ${title}`);

      return savedNotifications;
    } catch (error) {
      logger.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  // Send specific order notification
  async sendOrderNotification(userId: string, orderType: string, message: string, orderId: string) {
    const orderNotificationTypes: Record<string, string> = {
      'new_order': 'New Order Received',
      'order_accepted': 'Order Accepted',
      'order_rejected': 'Order Rejected',
      'order_cancelled': 'Order Cancelled',
      'order_shipped': 'Order Shipped',
      'order_delivered': 'Order Delivered',
      'order_update': 'Order Update'
    };

    await this.sendNotification({
      userId,
      type: 'order',
      title: orderNotificationTypes[orderType] || 'Order Update',
      message,
      data: {
        orderId,
        orderType,
        action: 'view_order'
      },
      priority: orderType === 'new_order' ? 'high' : 'medium'
    });
  }

  // Send price alert notification
  async sendPriceAlert(userId: string, ingredientName: string, oldPrice: number, newPrice: number, priceChange: number) {
    const isIncrease = priceChange > 0;
    const changeType = isIncrease ? 'increased' : 'decreased';
    const emoji = isIncrease ? '📈' : '📉';

    await this.sendNotification({
      userId,
      type: 'price',
      title: `${emoji} Price Alert: ${ingredientName}`,
      message: `Price ${changeType} from ₹${oldPrice} to ₹${newPrice} (${Math.abs(priceChange).toFixed(1)}%)`,
      data: {
        ingredientName,
        oldPrice,
        newPrice,
        priceChange,
        action: 'view_ingredient'
      },
      priority: Math.abs(priceChange) > 20 ? 'high' : 'medium'
    });
  }

  // Send expiry warning notification
  async sendExpiryWarning(userId: string, ingredientName: string, hoursRemaining: number, quantity: number) {
    let urgencyLevel: 'medium' | 'high' | 'urgent' = 'medium';
    let emoji = '⏰';

    if (hoursRemaining <= 6) {
      urgencyLevel = 'urgent';
      emoji = '🚨';
    } else if (hoursRemaining <= 24) {
      urgencyLevel = 'high';
      emoji = '⚠️';
    }

    const timeText = hoursRemaining < 24 ? 
      `${Math.round(hoursRemaining)} hours` : 
      `${Math.round(hoursRemaining / 24)} days`;

    await this.sendNotification({
      userId,
      type: 'expiry',
      title: `${emoji} Expiry Warning: ${ingredientName}`,
      message: `${quantity}kg of ${ingredientName} expires in ${timeText}. Consider reducing price for quick sale.`,
      data: {
        ingredientName,
        hoursRemaining,
        quantity,
        action: 'reduce_price'
      },
      priority: urgencyLevel
    });
  }

  // Send system notification
  async sendSystemNotification(userId: string, title: string, message: string, data: any = {}) {
    await this.sendNotification({
      userId,
      type: 'system',
      title,
      message,
      data,
      priority: 'medium'
    });
  }

  // Send promotional notification
  async sendPromotionalNotification(userId: string, title: string, message: string, data: any = {}) {
    await this.sendNotification({
      userId,
      type: 'promotion',
      title,
      message,
      data,
      priority: 'low'
    });
  }

  // Get user notifications with pagination
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false) {
    try {
      const query: any = { userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const skip = (page - 1) * limit;

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(query),
        Notification.countDocuments({ userId, isRead: false })
      ]);

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          unreadCount,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Emit real-time update
      // Emit real-time update
      if (io) {
        io.to(`user_${userId}`).emit('notification_read', {
          notificationId,
          readAt: notification.readAt
        });
      } else {
        logger.warn(`Socket.IO not initialized. 'notification_read' event not emitted for ${userId}.`);
      }
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      // Emit real-time update
          // Emit real-time update
    if (io) {
      io.to(`user_${userId}`).emit('all_notifications_read', {
        readCount: result.modifiedCount,
        readAt: new Date()
      });
    } else {
      logger.warn(`Socket.IO not initialized. 'all_notifications_read' event not emitted for ${userId}.`);
    }


      return result;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Emit real-time update
          // Emit real-time update
    if (io) {
      io.to(`user_${userId}`).emit('notification_deleted', {
        notificationId
      });
    } else {
      logger.warn(`Socket.IO not initialized. 'notification_deleted' event not emitted for ${userId}.`);
    }

      return notification;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(userId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await Notification.aggregate([
        {
          $match: {
            userId: userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            unreadCount: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            }
          }
        }
      ]);

      const totalStats = await Notification.aggregate([
        {
          $match: { userId: userId }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            }
          }
        }
      ]);

      return {
        byType: stats,
        total: totalStats[0]?.total || 0,
        unread: totalStats[0]?.unread || 0,
        timeframe: `${days} days`
      };
    } catch (error) {
      logger.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysOld: number = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true
      });

      logger.info(`Cleaned up ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  // Send push notification (placeholder for external push service)
  private async sendPushNotification(userId: string, title: string, message: string, data: any = {}) {
    try {
      // Check if user has push notifications enabled
      const user = await User.findById(userId).select('pushToken pushEnabled');
      
      if (!user || !user.pushEnabled || !user.pushToken) {
        return;
      }

      // Here you would integrate with push notification service like:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNs)
      // - OneSignal
      // - Pusher

      // Example implementation (replace with actual push service):
      /*
      const pushPayload = {
        to: user.pushToken,
        title,
        body: message,
        data,
        sound: 'default',
        badge: await this.getUnreadCount(userId)
      };

      await externalPushService.send(pushPayload);
      */

      logger.info(`Push notification sent to user ${userId}: ${title}`);
    } catch (error) {
      logger.error('Error sending push notification:', error);
      // Don't throw error - push notifications are not critical
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({
        userId,
        isRead: false
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Send notification to all vendors in a specific area
  async sendAreaNotification(city: string, state: string, title: string, message: string, data: any = {}) {
    try {
      const vendors = await User.find({
        role: 'vendor',
        'address.city': city,
        'address.state': state,
        isActive: true
      }).select('_id');

      const userIds = vendors.map(vendor => vendor._id.toString());

      await this.sendBulkNotification({
        userIds,
        type: 'system',
        title,
        message,
        data,
        priority: 'medium'
      });

      return { sentTo: userIds.length };
    } catch (error) {
      logger.error('Error sending area notification:', error);
      throw error;
    }
  }

  // Send notification to all users (admin broadcast)
  async sendBroadcastNotification(title: string, message: string, data: any = {}, userRole?: 'vendor' | 'admin') {
    try {
      const query: any = { isActive: true };
      if (userRole) {
        query.role = userRole;
      }

      const users = await User.find(query).select('_id');
      const userIds = users.map(user => user._id.toString());

      await this.sendBulkNotification({
        userIds,
        type: 'system',
        title,
        message,
        data,
        priority: 'medium'
      });

      return { sentTo: userIds.length };
    } catch (error) {
      logger.error('Error sending broadcast notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
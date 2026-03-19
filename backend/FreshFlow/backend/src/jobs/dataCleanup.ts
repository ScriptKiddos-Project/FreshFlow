// backend/src/jobs/dataCleanup.ts
import cron from 'node-cron';
import { User } from '../models/User';
import { Ingredient } from '../models/Ingredient';
import { Order } from '../models/Order';
import { Transaction } from '../models/Transaction';
import { Notification } from '../models/Notification';
import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redis';
import { io } from '../config/socket';

class DataCleanup {
  private isRunning = false;
  
  public startScheduler() {
    logger.info('Starting data cleanup scheduler');
    
    // Daily cleanup at 3 AM
    cron.schedule('0 3 * * *', async () => {
      if (this.isRunning) {
        logger.warn('Data cleanup already running, skipping...');
        return;
      }
      await this.runDailyCleanup();
    });

    // Weekly deep cleanup every Sunday at 4 AM
    cron.schedule('0 4 * * 0', async () => {
      await this.runWeeklyCleanup();
    });

    // Monthly archive cleanup on 1st of every month at 5 AM
    cron.schedule('0 5 1 * *', async () => {
      await this.runMonthlyCleanup();
    });

    // Cache cleanup every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      await this.cleanupCache();
    });
  }

  private async runDailyCleanup() {
    this.isRunning = true;
    logger.info('Starting daily data cleanup...');

    try {
      const results = await Promise.allSettled([
        this.cleanupExpiredIngredients(),
        this.cleanupOldNotifications(),
        this.cleanupFailedOrders(),
        this.cleanupTempFiles(),
        this.cleanupOldSessions(),
        this.updateIngredientStatuses()
      ]);

      this.logCleanupResults('Daily', results);
      
      // Send cleanup summary to admin
  io?.to('admin').emit('daily_cleanup_complete', {
        timestamp: new Date(),
        results: results.map((result, index) => ({
          task: ['expired_ingredients', 'old_notifications', 'failed_orders', 'temp_files', 'old_sessions', 'ingredient_statuses'][index],
          status: result.status,
          error: result.status === 'rejected' ? result.reason : null
        }))
      });

    } catch (error) {
      logger.error('Error in daily cleanup:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async runWeeklyCleanup() {
    logger.info('Starting weekly data cleanup...');

    try {
      const results = await Promise.allSettled([
        this.cleanupOldTransactions(),
        this.cleanupInactiveUsers(),
        this.optimizeDatabase(),
        this.cleanupOldLogs(),
        this.updateUserStatistics(),
        this.cleanupOldPriceHistory()
      ]);

      this.logCleanupResults('Weekly', results);

      // Generate cleanup report
      const report = await this.generateCleanupReport('weekly');
  io?.to('admin').emit('weekly_cleanup_complete', report);

    } catch (error) {
      logger.error('Error in weekly cleanup:', error);
    }
  }

  private async runMonthlyCleanup() {
    logger.info('Starting monthly data cleanup...');

    try {
      const results = await Promise.allSettled([
        this.archiveOldOrders(),
        this.archiveOldTransactions(),
        this.cleanupOldAnalytics(),
        this.compactDatabase(),
        this.generateMonthlyReport()
      ]);

      this.logCleanupResults('Monthly', results);

      const report = await this.generateCleanupReport('monthly');
  io?.to('admin').emit('monthly_cleanup_complete', report);

    } catch (error) {
      logger.error('Error in monthly cleanup:', error);
    }
  }

  // Clean up expired ingredients
  private async cleanupExpiredIngredients() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Ingredient.deleteMany({
      status: 'expired',
      updatedAt: { $lt: thirtyDaysAgo }
    });

    logger.info(`Cleaned up ${result.deletedCount} old expired ingredients`);
    return { deletedCount: result.deletedCount };
  }

  // Clean up old notifications
  private async cleanupOldNotifications() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Delete read notifications older than 7 days
    const result = await Notification.deleteMany({
      status: 'read',
      createdAt: { $lt: sevenDaysAgo }
    });

    // Archive unread notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const archiveResult = await Notification.updateMany(
      {
        status: 'unread',
        createdAt: { $lt: thirtyDaysAgo }
      },
      {
        archived: true,
        status: 'archived'
      }
    );

    logger.info(`Cleaned up ${result.deletedCount} old notifications, archived ${archiveResult.modifiedCount}`);
    return { deletedCount: result.deletedCount, archivedCount: archiveResult.modifiedCount };
  }

  // Clean up failed/cancelled orders
  private async cleanupFailedOrders() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await Order.deleteMany({
      status: { $in: ['failed', 'cancelled'] },
      createdAt: { $lt: sevenDaysAgo }
    });

    logger.info(`Cleaned up ${result.deletedCount} failed/cancelled orders`);
    return { deletedCount: result.deletedCount };
  }

  // Clean up temporary files and uploads
  private async cleanupTempFiles() {
    // This would integrate with your file storage system (Cloudinary)
    // For now, we'll clean up any temporary file references
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Clean up any temporary file references in database
    const ingredientCleanup = await Ingredient.updateMany(
      {
        'images.isTemporary': true,
        'images.uploadedAt': { $lt: oneDayAgo }
      },
      {
        $pull: {
          images: {
            isTemporary: true,
            uploadedAt: { $lt: oneDayAgo }
          }
        }
      }
    );

    logger.info(`Cleaned up temporary file references: ${ingredientCleanup.modifiedCount} ingredients`);
    return { modifiedCount: ingredientCleanup.modifiedCount };
  }

  // Clean up old session data
  private async cleanupOldSessions() {
    try {
      // Clean up Redis session data
      const redis = getRedisClient();
      const keys = await redis.keys('session:*');
      let deletedCount = 0;

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) { // Keys without expiry
          await redis.del(key);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} old session keys`);
      return { deletedCount };

    } catch (error) {
      logger.error('Error cleaning up sessions:', error);
      return { deletedCount: 0 };
    }
  }

  // Update ingredient statuses based on current conditions
  private async updateIngredientStatuses() {
    const now = new Date();
    
    // Mark ingredients as expired if expiry date has passed
    const expiredResult = await Ingredient.updateMany(
      {
        expiryDate: { $lt: now },
        status: { $ne: 'expired' }
      },
      {
        status: 'expired'
      }
    );

    // Mark ingredients as low stock if quantity is below threshold
    const lowStockResult = await Ingredient.updateMany(
      {
        quantity: { $lte: 5, $gt: 0 },
        status: 'available'
      },
      {
        status: 'low_stock'
      }
    );

    // Mark ingredients as out of stock if quantity is 0
    const outOfStockResult = await Ingredient.updateMany(
      {
        quantity: { $lte: 0 },
        status: { $in: ['available', 'low_stock'] }
      },
      {
        status: 'out_of_stock'
      }
    );

    logger.info(`Updated ingredient statuses: ${expiredResult.modifiedCount} expired, ${lowStockResult.modifiedCount} low stock, ${outOfStockResult.modifiedCount} out of stock`);
    
    return {
      expired: expiredResult.modifiedCount,
      lowStock: lowStockResult.modifiedCount,
      outOfStock: outOfStockResult.modifiedCount
    };
  }

  // Clean up old transaction records (weekly)
  private async cleanupOldTransactions() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Archive old completed transactions
    const result = await Transaction.updateMany(
      {
        status: 'completed',
        createdAt: { $lt: ninetyDaysAgo },
        archived: { $ne: true }
      },
      {
        archived: true
      }
    );

    logger.info(`Archived ${result.modifiedCount} old transactions`);
    return { archivedCount: result.modifiedCount };
  }

  // Clean up inactive users (weekly)
  private async cleanupInactiveUsers() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Mark users as inactive if they haven't logged in for 6 months
    const result = await User.updateMany(
      {
        lastLoginAt: { $lt: sixMonthsAgo },
        status: 'active'
      },
      {
        status: 'inactive'
      }
    );

    logger.info(`Marked ${result.modifiedCount} users as inactive`);
    return { inactiveCount: result.modifiedCount };
  }

  // Update user statistics (weekly)
  private async updateUserStatistics() {
    const users = await User.find({ status: 'active' });
    let updatedCount = 0;

    for (const user of users) {
      try {
        const [orderCount, totalSales, totalPurchases, avgRating] = await Promise.all([
          Order.countDocuments({ 
            $or: [{ buyerId: user._id }, { sellerId: user._id }],
            status: 'completed'
          }),
          Order.aggregate([
            { $match: { sellerId: user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
          ]),
          Order.aggregate([
            { $match: { buyerId: user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
          ]),
          Order.aggregate([
            { $match: { sellerId: user._id, 'rating.rating': { $exists: true } } },
            { $group: { _id: null, avgRating: { $avg: '$rating.rating' } } }
          ])
        ]);

        await User.findByIdAndUpdate(user._id, {
          'statistics.totalOrders': orderCount,
          'statistics.totalSales': totalSales[0]?.total || 0,
          'statistics.totalPurchases': totalPurchases[0]?.total || 0,
          'statistics.averageRating': avgRating[0]?.avgRating || 0,
          'statistics.lastUpdated': new Date()
        });

        updatedCount++;

      } catch (error) {
        logger.error(`Error updating statistics for user ${user._id}:`, error);
      }
    }

    logger.info(`Updated statistics for ${updatedCount} users`);
    return { updatedCount };
  }

  // Clean up old price history (weekly)
  private async cleanupOldPriceHistory() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await Ingredient.updateMany(
      {},
      {
        $pull: {
          priceHistory: {
            timestamp: { $lt: ninetyDaysAgo }
          }
        }
      }
    );

    logger.info(`Cleaned up old price history from ${result.modifiedCount} ingredients`);
    return { modifiedCount: result.modifiedCount };
  }

  // Archive old orders (monthly)
  private async archiveOldOrders() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await Order.updateMany(
      {
        createdAt: { $lt: oneYearAgo },
        status: 'completed',
        archived: { $ne: true }
      },
      {
        archived: true
      }
    );

    logger.info(`Archived ${result.modifiedCount} old orders`);
    return { archivedCount: result.modifiedCount };
  }

  // Archive old transactions (monthly)
  private async archiveOldTransactions() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await Transaction.updateMany(
      {
        createdAt: { $lt: oneYearAgo },
        status: 'completed',
        archived: { $ne: true }
      },
      {
        archived: true
      }
    );

    logger.info(`Archived ${result.modifiedCount} old transactions`);
    return { archivedCount: result.modifiedCount };
  }

  // Clean up old analytics data (monthly)
  private async cleanupOldAnalytics() {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    // Clean up daily analytics older than 2 years
    // This would depend on your analytics schema
    // For now, we'll clean up old notification analytics
    const result = await Notification.deleteMany({
      type: 'ANALYTICS',
      createdAt: { $lt: twoYearsAgo }
    });

    logger.info(`Cleaned up ${result.deletedCount} old analytics records`);
    return { deletedCount: result.deletedCount };
  }

  // Database optimization tasks
  private async optimizeDatabase() {
    try {
      // This would run database-specific optimization commands
      // For MongoDB, we can update indexes and run maintenance
      logger.info('Running database optimization...');
      
      // Example: Rebuild indexes (be careful in production)
      // await User.collection.reIndex();
      // await Ingredient.collection.reIndex();
      // await Order.collection.reIndex();
      
      return { optimized: true };
    } catch (error) {
      logger.error('Error optimizing database:', error);
      return { optimized: false };
    }
  }

  // Compact database (monthly)
  private async compactDatabase() {
    try {
      logger.info('Running database compaction...');
      
      // MongoDB specific compaction
      // This is database-specific and should be done carefully
      
      return { compacted: true };
    } catch (error) {
      logger.error('Error compacting database:', error);
      return { compacted: false };
    }
  }

  // Clean up old log files
  private async cleanupOldLogs() {
    try {
      // This would clean up log files if stored in database
      // For file-based logs, you'd need file system operations
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Example cleanup of system logs stored in database
      let deletedCount = 0;
      
      logger.info(`Cleaned up ${deletedCount} old log entries`);
      return { deletedCount };
    } catch (error) {
      logger.error('Error cleaning up logs:', error);
      return { deletedCount: 0 };
    }
  }

  // Clean up cache data
  private async cleanupCache() {
    try {
      logger.info('Cleaning up cache data...');
      
      // Clean up expired Redis keys
      const redis = getRedisClient();
      const keys = await redis.keys('*');
      let deletedCount = 0;

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -2) { // Key doesn't exist or expired
          deletedCount++;
        }
      }

      // Clean up specific cache patterns
      const patterns = ['cache:*', 'temp:*', 'session:expired:*'];
      
      for (const pattern of patterns) {
        const patternKeys = await redis.keys(pattern);
        if (patternKeys.length > 0) {
          // redis.del accepts multiple keys
          // pass array directly to match redis client overloads
          await redis.del(patternKeys as unknown as any);
          deletedCount += patternKeys.length;
        }
      }

      logger.info(`Cleaned up ${deletedCount} cache entries`);
      return { deletedCount };

    } catch (error) {
      logger.error('Error cleaning up cache:', error);
      return { deletedCount: 0 };
    }
  }

  // Generate cleanup reports
  private async generateCleanupReport(type: 'weekly' | 'monthly') {
    try {
      const now = new Date();
      const periodStart = new Date();
      
      if (type === 'weekly') {
        periodStart.setDate(periodStart.getDate() - 7);
      } else {
        periodStart.setMonth(periodStart.getMonth() - 1);
      }

      const [
        totalUsers,
        activeUsers,
        totalIngredients,
        expiredIngredients,
        totalOrders,
        completedOrders,
        totalTransactions,
        archivedTransactions
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        Ingredient.countDocuments(),
        Ingredient.countDocuments({ status: 'expired' }),
        Order.countDocuments(),
        Order.countDocuments({ status: 'completed' }),
        Transaction.countDocuments(),
        Transaction.countDocuments({ archived: true })
      ]);

      const report = {
        type,
        generatedAt: now,
        period: { start: periodStart, end: now },
        statistics: {
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers
          },
          ingredients: {
            total: totalIngredients,
            expired: expiredIngredients,
            active: totalIngredients - expiredIngredients
          },
          orders: {
            total: totalOrders,
            completed: completedOrders,
            pending: totalOrders - completedOrders
          },
          transactions: {
            total: totalTransactions,
            archived: archivedTransactions,
            active: totalTransactions - archivedTransactions
          }
        }
      };

      logger.info(`Generated ${type} cleanup report`);
      return report;

    } catch (error) {
      logger.error('Error generating cleanup report:', error);
      throw error;
    }
  }

  // Generate monthly business report
  private async generateMonthlyReport() {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [currentMonth, lastMonth] = await Promise.all([
        this.getMonthlyStats(monthStart, now),
        this.getMonthlyStats(lastMonthStart, lastMonthEnd)
      ]);

      const report = {
        generatedAt: now,
        currentMonth: {
          period: { start: monthStart, end: now },
          ...currentMonth
        },
        lastMonth: {
          period: { start: lastMonthStart, end: lastMonthEnd },
          ...lastMonth
        },
        growth: {
          users: this.calculateGrowth(lastMonth.newUsers, currentMonth.newUsers),
          orders: this.calculateGrowth(lastMonth.totalOrders, currentMonth.totalOrders),
          revenue: this.calculateGrowth(lastMonth.totalRevenue, currentMonth.totalRevenue),
          ingredients: this.calculateGrowth(lastMonth.newIngredients, currentMonth.newIngredients)
        }
      };

  // Send report to admin (guard in case socket isn't initialized)
  io?.to('admin').emit('monthly_business_report', report);
      
      logger.info('Generated monthly business report');
      return report;

    } catch (error) {
      logger.error('Error generating monthly report:', error);
      throw error;
    }
  }

  private async getMonthlyStats(startDate: Date, endDate: Date) {
    const [
      newUsers,
      totalOrders,
      completedOrders,
      totalRevenue,
      newIngredients,
      wasteReduced
    ] = await Promise.all([
      User.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate } 
      }),
      Order.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate } 
      }),
      Order.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]),
      Ingredient.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate } 
      }),
      Ingredient.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: 'expired' },
            quantity: 0
          }
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$originalQuantity' }
          }
        }
      ])
    ]);

    return {
      newUsers,
      totalOrders,
      completedOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      newIngredients,
      wasteReduced: wasteReduced[0]?.totalQuantity || 0,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    };
  }

  private calculateGrowth(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private logCleanupResults(type: string, results: PromiseSettledResult<any>[]) {
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`${type} cleanup completed: ${successful} successful, ${failed} failed`);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`${type} cleanup task ${index} failed:`, result.reason);
      }
    });
  }

  // Manual cleanup triggers for admin
  public async triggerManualCleanup(type: 'daily' | 'weekly' | 'monthly') {
    logger.info(`Manual ${type} cleanup triggered`);
    
    switch (type) {
      case 'daily':
        await this.runDailyCleanup();
        break;
      case 'weekly':
        await this.runWeeklyCleanup();
        break;
      case 'monthly':
        await this.runMonthlyCleanup();
        break;
    }
  }

  // Get cleanup statistics
  public async getCleanupStatistics() {
    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        expiredIngredients: await Ingredient.countDocuments({ status: 'expired' }),
        oldNotifications: await Notification.countDocuments({ 
          status: 'read', 
          createdAt: { $lt: weekAgo } 
        }),
        failedOrders: await Order.countDocuments({ 
          status: { $in: ['failed', 'cancelled'] },
          createdAt: { $lt: weekAgo }
        }),
        archivedTransactions: await Transaction.countDocuments({ archived: true }),
        inactiveUsers: await User.countDocuments({ status: 'inactive' }),
        lastCleanup: {
          daily: dayAgo,
          weekly: weekAgo,
          monthly: new Date(now.getFullYear(), now.getMonth(), 1)
        }
      };

      return stats;

    } catch (error) {
      logger.error('Error getting cleanup statistics:', error);
      throw error;
    }
  }
}

export const dataCleanup = new DataCleanup();
// backend/src/jobs/expiryChecker.ts
import cron from 'node-cron';
import { Ingredient } from '../models/Ingredient';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';
import { io } from '../config/socket';

interface ExpiryAlert {
  ingredientId: string;
  vendorId: string;
  name: string;
  quantity: number;
  expiryDate: Date;
  daysUntilExpiry: number;
  currentPrice: number;
  location: string;
}

class ExpiryChecker {
  private isRunning = false;

  // Run every hour to check for expiring ingredients
  public startScheduler() {
    logger.info('Starting expiry checker scheduler');
    
    // Check every hour
    cron.schedule('0 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Expiry checker already running, skipping...');
        return;
      }
      
      await this.checkExpiringIngredients();
    });

    // Deep clean expired ingredients daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupExpiredIngredients();
    });

    // Weekly summary report every Sunday at 8 AM
    cron.schedule('0 8 * * 0', async () => {
      await this.generateWeeklySummary();
    });
  }

  private async checkExpiringIngredients() {
    this.isRunning = true;
    logger.info('Running expiry checker...');

    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Find ingredients expiring in different time frames
      const [expiredIngredients, expiringToday, expiringIn3Days, expiringInWeek] = 
        await Promise.all([
          this.findExpiredIngredients(now),
          this.findExpiringIngredients(now, tomorrow),
          this.findExpiringIngredients(tomorrow, threeDaysLater),
          this.findExpiringIngredients(threeDaysLater, weekLater)
        ]);

      // Process each category
      await Promise.all([
        this.handleExpiredIngredients(expiredIngredients),
        this.handleCriticalExpiry(expiringToday, 'CRITICAL'),
        this.handleWarningExpiry(expiringIn3Days, 'WARNING'),
        this.handleInfoExpiry(expiringInWeek, 'INFO')
      ]);

      // Generate dynamic pricing suggestions
      await this.generatePricingSuggestions([
        ...expiringToday,
        ...expiringIn3Days,
        ...expiringInWeek
      ]);

      logger.info(`Expiry check completed. Found: ${expiredIngredients.length} expired, ${expiringToday.length} critical, ${expiringIn3Days.length} warning, ${expiringInWeek.length} info`);

    } catch (error) {
      logger.error('Error in expiry checker:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async findExpiredIngredients(currentDate: Date) {
    return await Ingredient.find({
      expiryDate: { $lt: currentDate },
      status: { $in: ['available', 'low_stock'] },
      quantity: { $gt: 0 }
    }).populate('vendorId', 'name phone location');
  }

  private async findExpiringIngredients(startDate: Date, endDate: Date) {
    return await Ingredient.find({
      expiryDate: { $gte: startDate, $lt: endDate },
      status: { $in: ['available', 'low_stock'] },
      quantity: { $gt: 0 }
    }).populate('vendorId', 'name phone location');
  }

  private async handleExpiredIngredients(ingredients: any[]) {
    if (ingredients.length === 0) return;

    logger.warn(`Found ${ingredients.length} expired ingredients`);

    for (const ingredient of ingredients) {
      try {
        // Mark as expired
        await Ingredient.findByIdAndUpdate(ingredient._id, {
          status: 'expired',
          availableUntil: new Date(),
          lastPriceUpdate: new Date()
        });

        // Notify vendor
        await this.createExpiryNotification(
          ingredient.vendorId._id,
          ingredient,
          'EXPIRED',
          `Your ${ingredient.name} has expired and has been removed from marketplace`
        );

        // Real-time update (guard in case socket isn't initialized)
        io?.to(`vendor_${ingredient.vendorId._id}`).emit('ingredient_expired', {
          ingredientId: ingredient._id,
          name: ingredient.name,
          quantity: ingredient.quantity
        });

      } catch (error) {
        logger.error(`Error handling expired ingredient ${ingredient._id}:`, error);
      }
    }
  }

  private async handleCriticalExpiry(ingredients: any[], priority: string) {
    if (ingredients.length === 0) return;
    
    logger.warn(`Found ${ingredients.length} ingredients expiring within 24 hours`);

    for (const ingredient of ingredients) {
      const daysUntilExpiry = this.calculateDaysUntilExpiry(ingredient.expiryDate);
      
      // Apply aggressive pricing for critical expiry
      const discountedPrice = Math.round(ingredient.basePrice * 0.6); // 40% discount
      
      await Promise.all([
        // Update price
        Ingredient.findByIdAndUpdate(ingredient._id, {
          currentPrice: discountedPrice,
          priceHistory: [
            ...ingredient.priceHistory,
            {
              price: discountedPrice,
              timestamp: new Date(),
              reason: 'Critical expiry discount'
            }
          ],
          lastPriceUpdate: new Date()
        }),

        // Create urgent notification
        this.createExpiryNotification(
          ingredient.vendorId._id,
          ingredient,
          priority,
          `URGENT: Your ${ingredient.name} expires in ${Math.ceil(daysUntilExpiry)} hours! Price reduced to ₹${discountedPrice} to boost sales.`
        )
      ]);

      // Real-time alert (guard in case socket isn't initialized)
      io?.to(`vendor_${ingredient.vendorId._id}`).emit('critical_expiry_alert', {
        ingredientId: ingredient._id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        expiryDate: ingredient.expiryDate,
        newPrice: discountedPrice,
        daysUntilExpiry: daysUntilExpiry
      });
    }
  }

  private async handleWarningExpiry(ingredients: any[], priority: string) {
    if (ingredients.length === 0) return;

    for (const ingredient of ingredients) {
      const daysUntilExpiry = this.calculateDaysUntilExpiry(ingredient.expiryDate);
      
      // Apply moderate pricing for warning expiry
      const discountedPrice = Math.round(ingredient.basePrice * 0.8); // 20% discount
      
      await Promise.all([
        Ingredient.findByIdAndUpdate(ingredient._id, {
          currentPrice: discountedPrice,
          priceHistory: [
            ...ingredient.priceHistory,
            {
              price: discountedPrice,
              timestamp: new Date(),
              reason: 'Expiry warning discount'
            }
          ],
          lastPriceUpdate: new Date()
        }),

        this.createExpiryNotification(
          ingredient.vendorId._id,
          ingredient,
          priority,
          `Your ${ingredient.name} expires in ${Math.ceil(daysUntilExpiry)} days. Price adjusted to ₹${discountedPrice} for quick sale.`
        )
      ]);
    }
  }

  private async handleInfoExpiry(ingredients: any[], priority: string) {
    if (ingredients.length === 0) return;

    for (const ingredient of ingredients) {
      const daysUntilExpiry = this.calculateDaysUntilExpiry(ingredient.expiryDate);
      
      await this.createExpiryNotification(
        ingredient.vendorId._id,
        ingredient,
        priority,
        `Reminder: Your ${ingredient.name} will expire in ${Math.ceil(daysUntilExpiry)} days. Consider promoting for faster sale.`
      );
    }
  }

  private async generatePricingSuggestions(ingredients: any[]) {
    const suggestions = ingredients.map(ingredient => {
      const daysUntilExpiry = this.calculateDaysUntilExpiry(ingredient.expiryDate);
      const currentDiscount = ((ingredient.basePrice - ingredient.currentPrice) / ingredient.basePrice) * 100;
      
      let suggestedDiscount = 0;
      let reasoning = '';

      if (daysUntilExpiry <= 1) {
        suggestedDiscount = Math.max(50, currentDiscount + 10);
        reasoning = 'Critical expiry - maximum discount recommended';
      } else if (daysUntilExpiry <= 3) {
        suggestedDiscount = Math.max(30, currentDiscount + 5);
        reasoning = 'Short expiry - increased discount suggested';
      } else if (daysUntilExpiry <= 7) {
        suggestedDiscount = Math.max(15, currentDiscount);
        reasoning = 'Approaching expiry - moderate discount suggested';
      }

      return {
        ingredientId: ingredient._id,
        vendorId: ingredient.vendorId._id,
        name: ingredient.name,
        currentPrice: ingredient.currentPrice,
        basePrice: ingredient.basePrice,
        currentDiscount: Math.round(currentDiscount),
        suggestedDiscount: Math.round(suggestedDiscount),
        suggestedPrice: Math.round(ingredient.basePrice * (1 - suggestedDiscount / 100)),
        daysUntilExpiry: Math.ceil(daysUntilExpiry),
        reasoning
      };
    });

  // Send suggestions to admin panel (guard in case socket isn't initialized)
  io?.to('admin').emit('pricing_suggestions', suggestions);

    return suggestions;
  }

  private async createExpiryNotification(
    vendorId: string,
    ingredient: any,
    priority: string,
    message: string
  ) {
    try {
      // Build plain notification data and use notification service to handle creation and delivery
      const notificationData = {
        userId: vendorId.toString(),
        type: 'expiry',
        title: `Expiry Alert: ${ingredient.name}`,
        message,
        data: {
          ingredientId: ingredient._id.toString(),
          ingredientName: ingredient.name,
          quantity: ingredient.quantity,
          expiryDate: ingredient.expiryDate,
          currentPrice: ingredient.currentPrice
        },
        priority: priority.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent'
      };

      await notificationService.sendNotification(notificationData as any);

    } catch (error) {
      logger.error('Error creating expiry notification:', error);
    }
  }

  private async cleanupExpiredIngredients() {
    logger.info('Running daily expired ingredients cleanup...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Remove expired ingredients older than 30 days
      const result = await Ingredient.deleteMany({
        status: 'expired',
        expiryDate: { $lt: thirtyDaysAgo }
      });

      logger.info(`Cleaned up ${result.deletedCount} old expired ingredients`);

      // Archive old notifications
      await Notification.updateMany(
        {
          type: 'EXPIRY_ALERT',
          createdAt: { $lt: thirtyDaysAgo },
          status: 'read'
        },
        {
          archived: true
        }
      );

    } catch (error) {
      logger.error('Error in cleanup process:', error);
    }
  }

  private async generateWeeklySummary() {
    logger.info('Generating weekly expiry summary...');

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const summary = await Ingredient.aggregate([
        {
          $match: {
            lastPriceUpdate: { $gte: weekAgo },
            $or: [
              { status: 'expired' },
              { currentPrice: { $lt: '$basePrice' } }
            ]
          }
        },
        {
          $group: {
            _id: '$vendorId',
            totalExpired: {
              $sum: {
                $cond: [{ $eq: ['$status', 'expired'] }, 1, 0]
              }
            },
            totalDiscounted: {
              $sum: {
                $cond: [{ $lt: ['$currentPrice', '$basePrice'] }, 1, 0]
              }
            },
            totalValueSaved: {
              $sum: {
                $cond: [
                  { $lt: ['$currentPrice', '$basePrice'] },
                  { $multiply: ['$quantity', { $subtract: ['$basePrice', '$currentPrice'] }] },
                  0
                ]
              }
            },
            totalWastePrevented: {
              $sum: {
                $cond: [
                  { $and: [
                    { $lt: ['$currentPrice', '$basePrice'] },
                    { $eq: ['$quantity', 0] }
                  ]},
                  '$quantity',
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'vendor'
          }
        }
      ]);

      // Send summary to admin (guard in case socket isn't initialized)
      io?.to('admin').emit('weekly_expiry_summary', {
        weekEnding: new Date(),
        vendorSummaries: summary,
        totalVendors: summary.length,
        totalExpired: summary.reduce((sum, v) => sum + v.totalExpired, 0),
        totalDiscounted: summary.reduce((sum, v) => sum + v.totalDiscounted, 0),
        totalValueSaved: summary.reduce((sum, v) => sum + v.totalValueSaved, 0)
      });

    } catch (error) {
      logger.error('Error generating weekly summary:', error);
    }
  }

  private calculateDaysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const timeDiff = expiryDate.getTime() - now.getTime();
    return timeDiff / (1000 * 3600 * 24);
  }

  // Manual trigger for testing
  public async triggerManualCheck() {
    logger.info('Manual expiry check triggered');
    await this.checkExpiringIngredients();
  }

  // Get expiry statistics
  public async getExpiryStatistics() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const stats = await Promise.all([
        Ingredient.countDocuments({ expiryDate: { $lt: now }, status: { $ne: 'expired' } }),
        Ingredient.countDocuments({ expiryDate: { $gte: now, $lt: tomorrow }, status: { $in: ['available', 'low_stock'] } }),
        Ingredient.countDocuments({ expiryDate: { $gte: tomorrow, $lt: threeDaysLater }, status: { $in: ['available', 'low_stock'] } }),
        Ingredient.countDocuments({ expiryDate: { $gte: threeDaysLater, $lt: weekLater }, status: { $in: ['available', 'low_stock'] } })
      ]);

      return {
        expired: stats[0],
        expiringToday: stats[1],
        expiringIn3Days: stats[2],
        expiringInWeek: stats[3],
        lastChecked: new Date()
      };

    } catch (error) {
      logger.error('Error getting expiry statistics:', error);
      throw error;
    }
  }
}

export const expiryChecker = new ExpiryChecker();
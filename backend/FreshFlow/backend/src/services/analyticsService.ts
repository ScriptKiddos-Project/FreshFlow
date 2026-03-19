import mongoose from 'mongoose';
import { User } from '../models/User';
import { Ingredient } from '../models/Ingredient';
import { Order } from '../models/Order';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';

interface TimeframeData {
  startDate: Date;
  endDate: Date;
  days: number;
}

interface DashboardAnalytics {
  overview: {
    totalVendors: number;
    activeVendors: number;
    totalOrders: number;
    totalRevenue: number;
    totalIngredients: number;
    wasteReduced: number;
  };
  trends: {
    vendorGrowth: number;
    orderGrowth: number;
    revenueGrowth: number;
  };
  charts: {
    ordersByDay: any[];
    topCategories: any[];
    revenueByDay: any[];
    vendorsByCity: any[];
  };
}

export class AnalyticsService {
  // Get dashboard analytics
  async getDashboardAnalytics(timeframe: string): Promise<DashboardAnalytics> {
    try {
      const { startDate, endDate, days } = this.parseTimeframe(timeframe);
      const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Overview metrics
      const [
        totalVendors,
        activeVendors,
        currentPeriodOrders,
        previousPeriodOrders,
        currentPeriodRevenue,
        previousPeriodRevenue,
        totalIngredients,
        wasteReduced
      ] = await Promise.all([
        User.countDocuments({ role: 'vendor' }),
        User.countDocuments({ role: 'vendor', isActive: true, lastActive: { $gte: startDate } }),
        Order.countDocuments({ orderDate: { $gte: startDate, $lte: endDate } }),
        Order.countDocuments({ orderDate: { $gte: previousPeriodStart, $lt: startDate } }),
        this.getTotalRevenue(startDate, endDate),
        this.getTotalRevenue(previousPeriodStart, startDate),
        Ingredient.countDocuments({ status: 'active' }),
        this.calculateWasteReduced(startDate, endDate)
      ]);

      // Calculate growth percentages
      const orderGrowth = this.calculateGrowthPercentage(currentPeriodOrders, previousPeriodOrders);
      const revenueGrowth = this.calculateGrowthPercentage(currentPeriodRevenue, previousPeriodRevenue);
      const vendorGrowth = await this.getVendorGrowth(startDate, previousPeriodStart);

      // Get chart data
      const [ordersByDay, topCategories, revenueByDay, vendorsByCity] = await Promise.all([
        this.getOrdersByDay(startDate, endDate),
        this.getTopCategories(startDate, endDate),
        this.getRevenueByDay(startDate, endDate),
        this.getVendorsByCity()
      ]);

      return {
        overview: {
          totalVendors,
          activeVendors,
          totalOrders: currentPeriodOrders,
          totalRevenue: currentPeriodRevenue,
          totalIngredients,
          wasteReduced
        },
        trends: {
          vendorGrowth,
          orderGrowth,
          revenueGrowth
        },
        charts: {
          ordersByDay,
          topCategories,
          revenueByDay,
          vendorsByCity
        }
      };
    } catch (error) {
      logger.error('Error getting dashboard analytics:', error);
      throw error;
    }
  }

  // Compatibility wrapper used by controllers that expect `getDashboardStats`
  public async getDashboardStats(timeframe: string) {
    return this.getDashboardAnalytics(timeframe);
  }

  // Get vendor-specific analytics
  async getVendorAnalytics(vendorId: string, startDate: string, endDate: string) {
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const [
        totalOrders,
        totalRevenue,
        avgOrderValue,
        totalIngredients,
        soldIngredients,
        topBuyers,
        orderStatusBreakdown,
        revenueByDay,
        topSellingIngredients
      ] = await Promise.all([
        Order.countDocuments({ sellerId: vendorId, orderDate: { $gte: start, $lte: end } }),
        this.getVendorRevenue(vendorId, start, end),
        this.getVendorAvgOrderValue(vendorId, start, end),
        Ingredient.countDocuments({ sellerId: vendorId, status: 'active' }),
        Ingredient.countDocuments({ sellerId: vendorId, soldQuantity: { $gt: 0 } }),
        this.getTopBuyers(vendorId, start, end),
        this.getOrderStatusBreakdown(vendorId, start, end),
        this.getVendorRevenueByDay(vendorId, start, end),
        this.getTopSellingIngredients(vendorId, start, end)
      ]);

      return {
        overview: {
          totalOrders,
          totalRevenue,
          avgOrderValue,
          totalIngredients,
          soldIngredients,
          conversionRate: totalIngredients > 0 ? (soldIngredients / totalIngredients) * 100 : 0
        },
        charts: {
          topBuyers,
          orderStatusBreakdown,
          revenueByDay,
          topSellingIngredients
        }
      };
    } catch (error) {
      logger.error('Error getting vendor analytics:', error);
      throw error;
    }
  }

  // Get marketplace analytics
  async getMarketplaceAnalytics(category: string, timeframe: string) {
    try {
      const { startDate, endDate } = this.parseTimeframe(timeframe);
      const matchFilter: any = { createdAt: { $gte: startDate, $lte: endDate } };
      
      if (category && category !== 'all') {
        matchFilter.category = category;
      }

      const [
        totalListings,
        activeListing,
        avgPrice,
        priceRange,
        demandSupplyRatio,
        categoryBreakdown,
        priceDistribution,
        expiryAnalysis
      ] = await Promise.all([
        Ingredient.countDocuments(matchFilter),
        Ingredient.countDocuments({ ...matchFilter, status: 'active', quantity: { $gt: 0 } }),
        this.getAvgMarketPrice(matchFilter),
        this.getPriceRange(matchFilter),
        this.getDemandSupplyRatio(matchFilter, startDate, endDate),
        this.getCategoryBreakdown(startDate, endDate),
        this.getPriceDistribution(matchFilter),
        this.getExpiryAnalysis(matchFilter)
      ]);

      return {
        overview: {
          totalListings,
          activeListing,
          avgPrice,
          priceRange,
          demandSupplyRatio
        },
        charts: {
          categoryBreakdown,
          priceDistribution,
          expiryAnalysis
        }
      };
    } catch (error) {
      logger.error('Error getting marketplace analytics:', error);
      throw error;
    }
  }

  // Compatibility wrapper expected by controllers: getMarketplaceTrends
  public async getMarketplaceTrends(options: { category?: string; timeRange?: string; groupBy?: string; includeForecasting?: boolean }) {
    const category = options?.category ?? 'all';
    const timeframe = options?.timeRange ?? '30d';
    // The service currently produces marketplace analytics via getMarketplaceAnalytics.
    // `groupBy` and `includeForecasting` are acknowledged but handled at controller level for now.
    return this.getMarketplaceAnalytics(category, timeframe);
  }

  // Get ingredient trends
  async getIngredientTrends(ingredientType: string, days: number) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const matchFilter: any = { createdAt: { $gte: startDate, $lte: endDate } };
      if (ingredientType && ingredientType !== 'all') {
        matchFilter.name = new RegExp(ingredientType, 'i');
      }

      const [priceHistory, volumeHistory, demandHistory] = await Promise.all([
        this.getPriceHistory(matchFilter, days),
        this.getVolumeHistory(matchFilter, days),
        this.getDemandHistory(matchFilter, days)
      ]);

      return {
        priceHistory,
        volumeHistory,
        demandHistory,
        timeframe: `${days} days`
      };
    } catch (error) {
      logger.error('Error getting ingredient trends:', error);
      throw error;
    }
  }

  // Get waste reduction metrics
  async getWasteReductionMetrics(timeframe: string) {
    try {
      const { startDate, endDate } = this.parseTimeframe(timeframe);

      const [
        totalWasteReduced,
        wasteByCategory,
        avgExpiryTime,
        discountEffectiveness,
        wasteReductionTrend
      ] = await Promise.all([
        this.calculateWasteReduced(startDate, endDate),
        this.getWasteByCategory(startDate, endDate),
        this.getAvgExpiryTime(startDate, endDate),
        this.getDiscountEffectiveness(startDate, endDate),
        this.getWasteReductionTrend(startDate, endDate)
      ]);

      return {
        overview: {
          totalWasteReduced,
          avgExpiryTime,
          discountEffectiveness
        },
        charts: {
          wasteByCategory,
          wasteReductionTrend
        }
      };
    } catch (error) {
      logger.error('Error getting waste reduction metrics:', error);
      throw error;
    }
  }

  // Get revenue analytics
  async getRevenueAnalytics(timeframe: string, vendorId?: string) {
    try {
      const { startDate, endDate } = this.parseTimeframe(timeframe);
      
      const matchFilter: any = { orderDate: { $gte: startDate, $lte: endDate }, status: 'delivered' };
      if (vendorId) {
        matchFilter.sellerId = new mongoose.Types.ObjectId(vendorId);
      }

      const [
        totalRevenue,
        avgOrderValue,
        revenueByDay,
        revenueByCategory,
        topEarningVendors,
        paymentMethodBreakdown
      ] = await Promise.all([
        this.getTotalRevenueFromOrders(matchFilter),
        this.getAvgOrderValueFromOrders(matchFilter),
        this.getRevenueByDay(startDate, endDate, vendorId),
        this.getRevenueByCategory(matchFilter),
        vendorId ? [] : this.getTopEarningVendors(startDate, endDate),
        this.getPaymentMethodBreakdown(matchFilter)
      ]);

      return {
        overview: {
          totalRevenue,
          avgOrderValue,
          totalOrders: await Order.countDocuments(matchFilter)
        },
        charts: {
          revenueByDay,
          revenueByCategory,
          topEarningVendors,
          paymentMethodBreakdown
        }
      };
    } catch (error) {
      logger.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  // Get real-time metrics
  async getRealTimeMetrics() {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        activeUsers,
        ordersToday,
        ordersLastHour,
        revenueToday,
        activeListings,
        expiringIngredients,
        systemHealth
      ] = await Promise.all([
        User.countDocuments({ lastActive: { $gte: lastHour } }),
        Order.countDocuments({ orderDate: { $gte: last24Hours } }),
        Order.countDocuments({ orderDate: { $gte: lastHour } }),
        this.getTotalRevenue(last24Hours, now),
        Ingredient.countDocuments({ status: 'active', quantity: { $gt: 0 } }),
        Ingredient.countDocuments({ 
          status: 'active', 
          expiryDate: { 
            $gte: now, 
            $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) 
          } 
        }),
        this.getSystemHealth()
      ]);

      return {
        activeUsers,
        ordersToday,
        ordersLastHour,
        revenueToday,
        activeListings,
        expiringIngredients,
        systemHealth,
        timestamp: now
      };
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      throw error;
    }
  }

  // Compatibility wrapper expected by controllers
  public async getSystemMetrics(timeRange: string) {
    // Controllers request system metrics via getSystemMetrics; map to platform health for now.
    return this.getPlatformHealth();
  }

  // Generate analytics report
  async generateReport(options: any) {
    try {
      const { reportType, startDate, endDate, format } = options;
      
      let reportData: any = {};

      switch (reportType) {
        case 'dashboard':
          reportData = await this.getDashboardAnalytics('30d');
          break;
        case 'revenue':
          reportData = await this.getRevenueAnalytics('30d');
          break;
        case 'waste':
          reportData = await this.getWasteReductionMetrics('30d');
          break;
        case 'marketplace':
          reportData = await this.getMarketplaceAnalytics('all', '30d');
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (format === 'json') {
        return reportData;
      }

      // For PDF/Excel formats, you would integrate with libraries like:
      // - PDFKit or Puppeteer for PDF
      // - ExcelJS for Excel
      // This is a placeholder for the actual implementation
      
      return {
        message: `${format.toUpperCase()} report generation not implemented yet`,
        data: reportData
      };
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  // Get platform health metrics
  async getPlatformHealth() {
    try {
      const [
        dbHealth,
        apiHealth,
        avgResponseTime,
        errorRate,
        memoryUsage,
        activeConnections
      ] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkApiHealth(),
        this.getAvgResponseTime(),
        this.getErrorRate(),
        this.getMemoryUsage(),
        this.getActiveConnections()
      ]);

      return {
        database: dbHealth,
        api: apiHealth,
        performance: {
          avgResponseTime,
          errorRate,
          memoryUsage
        },
        connections: activeConnections,
        status: this.getOverallHealthStatus(dbHealth, apiHealth, errorRate),
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error getting platform health:', error);
      throw error;
    }
  }

  // Helper methods
  private parseTimeframe(timeframe: string): TimeframeData {
    const days = parseInt(timeframe.replace('d', ''));
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    return { startDate, endDate, days };
  }

  private calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private async getTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
    const result = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    return result[0]?.total || 0;
  }

  private async calculateWasteReduced(startDate: Date, endDate: Date): Promise<number> {
    // Calculate waste reduced based on ingredients sold vs expired
    const result = await Ingredient.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$soldQuantity' },
          totalExpired: { 
            $sum: {
              $cond: [
                { $lt: ['$expiryDate', new Date()] },
                '$quantity',
                0
              ]
            }
          }
        }
      }
    ]);

    const data = result[0] || { totalSold: 0, totalExpired: 0 };
    return data.totalSold; // Simplified - actual implementation would be more complex
  }

  private async getVendorGrowth(currentStart: Date, previousStart: Date): Promise<number> {
    const [currentVendors, previousVendors] = await Promise.all([
      User.countDocuments({ role: 'vendor', createdAt: { $gte: currentStart } }),
      User.countDocuments({ role: 'vendor', createdAt: { $gte: previousStart, $lt: currentStart } })
    ]);

    return this.calculateGrowthPercentage(currentVendors, previousVendors);
  }

  private async getOrdersByDay(startDate: Date, endDate: Date) {
    return await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$orderDate'
            }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
  }

  private async getTopCategories(startDate: Date, endDate: Date) {
    return await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'ingredients',
          localField: 'ingredientId',
          foreignField: '_id',
          as: 'ingredient'
        }
      },
      {
        $unwind: '$ingredient'
      },
      {
        $group: {
          _id: '$ingredient.category',
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          quantity: { $sum: '$quantity' }
        }
      },
      { $sort: { orders: -1 } },
      { $limit: 10 }
    ]);
  }

  private async getRevenueByDay(startDate: Date, endDate: Date, vendorId?: string) {
    const matchFilter: any = {
      orderDate: { $gte: startDate, $lte: endDate },
      status: 'delivered'
    };

    if (vendorId) {
      matchFilter.sellerId = new mongoose.Types.ObjectId(vendorId);
    }

    return await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$orderDate'
            }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
  }

  private async getVendorsByCity() {
    return await User.aggregate([
      {
        $match: { role: 'vendor' }
      },
      {
        $group: {
          _id: '$address.city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
  }

  // Additional helper methods for complex analytics
  private async getSystemHealth() {
    return {
      database: 'healthy',
      api: 'healthy',
      cache: 'healthy',
      storage: 'healthy'
    };
  }

  private async checkDatabaseHealth() {
    try {
      const db: any = mongoose.connection && (mongoose.connection.db as any);
      if (!db) {
        return 'unhealthy';
      }

      // Prefer admin().ping() when available
      if (typeof db.admin === 'function') {
        const admin = db.admin();
        if (admin && typeof admin.ping === 'function') {
          await admin.ping();
          return 'healthy';
        }
      }

      // Fallback to command ping if supported by the driver
      if (typeof db.command === 'function') {
        await db.command({ ping: 1 });
        return 'healthy';
      }

      return 'unhealthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  private async checkApiHealth() {
    // This would check various API endpoints
    return 'healthy';
  }

  private async getAvgResponseTime() {
    // This would be implemented with actual monitoring data
    return Math.random() * 200 + 50; // Placeholder
  }

  private async getErrorRate() {
    // This would be implemented with actual error tracking
    return Math.random() * 5; // Placeholder percentage
  }

  private async getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      rss: used.rss / 1024 / 1024, // MB
      heapTotal: used.heapTotal / 1024 / 1024,
      heapUsed: used.heapUsed / 1024 / 1024,
      external: used.external / 1024 / 1024
    };
  }

  private async getActiveConnections() {
    return mongoose.connections.length;
  }

  private getOverallHealthStatus(dbHealth: string, apiHealth: string, errorRate: number) {
    if (dbHealth === 'healthy' && apiHealth === 'healthy' && errorRate < 1) {
      return 'healthy';
    } else if (errorRate < 5) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  // Placeholder methods for additional analytics (implement as needed)
  private async getVendorRevenue(vendorId: string, startDate: Date, endDate: Date) {
    const result = await Order.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(vendorId),
          orderDate: { $gte: startDate, $lte: endDate },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    return result[0]?.total || 0;
  }

  private async getVendorAvgOrderValue(vendorId: string, startDate: Date, endDate: Date) {
    const result = await Order.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(vendorId),
          orderDate: { $gte: startDate, $lte: endDate },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: null,
          avg: { $avg: '$totalAmount' }
        }
      }
    ]);
    return result[0]?.avg || 0;
  }

  // Add more helper methods as needed for complete analytics functionality
  private async getTopBuyers(vendorId: string, startDate: Date, endDate: Date) {
    return await Order.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(vendorId),
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$buyerId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'buyer'
        }
      },
      {
        $unwind: '$buyer'
      },
      {
        $project: {
          buyerName: '$buyer.name',
          businessName: '$buyer.businessName',
          totalOrders: 1,
          totalSpent: 1
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);
  }

  private async getOrderStatusBreakdown(vendorId: string, startDate: Date, endDate: Date) {
    return await Order.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(vendorId),
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
  }

  private async getVendorRevenueByDay(vendorId: string, startDate: Date, endDate: Date) {
    return this.getRevenueByDay(startDate, endDate, vendorId);
  }

  private async getTopSellingIngredients(vendorId: string, startDate: Date, endDate: Date) {
    return await Order.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(vendorId),
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$ingredientId',
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'ingredients',
          localField: '_id',
          foreignField: '_id',
          as: 'ingredient'
        }
      },
      {
        $unwind: '$ingredient'
      },
      {
        $project: {
          name: '$ingredient.name',
          category: '$ingredient.category',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);
  }

  private async getAvgMarketPrice(matchFilter: any) {
    const result = await Ingredient.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$currentPrice' }
        }
      }
    ]);
    return result[0]?.avgPrice || 0;
  }

  private async getPriceRange(matchFilter: any) {
    const result = await Ingredient.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$currentPrice' },
          maxPrice: { $max: '$currentPrice' }
        }
      }
    ]);
    return result[0] || { minPrice: 0, maxPrice: 0 };
  }

  private async getDemandSupplyRatio(matchFilter: any, startDate: Date, endDate: Date) {
    const [supply, demand] = await Promise.all([
      Ingredient.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalSupply: { $sum: '$quantity' }
          }
        }
      ]),
      Order.aggregate([
        {
          $match: {
            orderDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalDemand: { $sum: '$quantity' }
          }
        }
      ])
    ]);

    const totalSupply = supply[0]?.totalSupply || 1;
    const totalDemand = demand[0]?.totalDemand || 0;
    
    return totalDemand / totalSupply;
  }

  private async getCategoryBreakdown(startDate: Date, endDate: Date) {
    return await Ingredient.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          avgPrice: { $avg: '$currentPrice' }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  private async getPriceDistribution(matchFilter: any) {
    return await Ingredient.aggregate([
      { $match: matchFilter },
      {
        $bucket: {
          groupBy: '$currentPrice',
          boundaries: [0, 50, 100, 200, 500, 1000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgPrice: { $avg: '$currentPrice' }
          }
        }
      }
    ]);
  }

  private async getExpiryAnalysis(matchFilter: any) {
    const now = new Date();
    return await Ingredient.aggregate([
      { $match: matchFilter },
      {
        $addFields: {
          hoursUntilExpiry: {
            $divide: [
              { $subtract: ['$expiryDate', now] },
              1000 * 60 * 60
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$hoursUntilExpiry',
          boundaries: [-Infinity, 0, 6, 24, 72, 168, Infinity], // Expired, <6h, <24h, <3d, <7d, >7d
          default: 'Other',
          output: {
            count: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' }
          }
        }
      }
    ]);
  }

  private async getPriceHistory(matchFilter: any, days: number) {
    // This would track price changes over time
    // Placeholder implementation
    return [];
  }

  private async getVolumeHistory(matchFilter: any, days: number) {
    // This would track volume changes over time
    // Placeholder implementation
    return [];
  }

  private async getDemandHistory(matchFilter: any, days: number) {
    // This would track demand changes over time
    // Placeholder implementation
    return [];
  }

  private async getWasteByCategory(startDate: Date, endDate: Date) {
    return await Ingredient.aggregate([
      {
        $match: {
          expiryDate: { $gte: startDate, $lte: endDate },
          quantity: { $gt: 0 },
          soldQuantity: { $lt: '$quantity' }
        }
      },
      {
        $group: {
          _id: '$category',
          wastedQuantity: { 
            $sum: { $subtract: ['$quantity', '$soldQuantity'] }
          },
          totalItems: { $sum: 1 }
        }
      },
      { $sort: { wastedQuantity: -1 } }
    ]);
  }

  private async getAvgExpiryTime(startDate: Date, endDate: Date) {
    const result = await Ingredient.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
          shelfLife: {
            $divide: [
              { $subtract: ['$expiryDate', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgShelfLife: { $avg: '$shelfLife' }
        }
      }
    ]);
    return result[0]?.avgShelfLife || 0;
  }

  private async getDiscountEffectiveness(startDate: Date, endDate: Date) {
    // This would analyze how discounts affect sales
    // Placeholder implementation
    return 75; // 75% effectiveness
  }

  private async getWasteReductionTrend(startDate: Date, endDate: Date) {
    // This would show waste reduction over time
    // Placeholder implementation
    return [];
  }

  private async getTotalRevenueFromOrders(matchFilter: any) {
    const result = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    return result[0]?.total || 0;
  }

  private async getAvgOrderValueFromOrders(matchFilter: any) {
    const result = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          avg: { $avg: '$totalAmount' }
        }
      }
    ]);
    return result[0]?.avg || 0;
  }

  private async getRevenueByCategory(matchFilter: any) {
    return await Order.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'ingredients',
          localField: 'ingredientId',
          foreignField: '_id',
          as: 'ingredient'
        }
      },
      {
        $unwind: '$ingredient'
      },
      {
        $group: {
          _id: '$ingredient.category',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
  }

  private async getTopEarningVendors(startDate: Date, endDate: Date) {
    return await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: '$sellerId',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $unwind: '$vendor'
      },
      {
        $project: {
          vendorName: '$vendor.name',
          businessName: '$vendor.businessName',
          totalRevenue: 1,
          totalOrders: 1
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);
  }

  private async getPaymentMethodBreakdown(matchFilter: any) {
    return await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  // Stub methods for missing analytics
  async getPriceAnalytics(options: any) {
    return this.getRevenueAnalytics('7d');
  }

  async getWasteMetrics(timeRange: string) {
    return this.getWasteReductionMetrics(timeRange);
  }

  async getUserEngagementMetrics(options: any) {
    return this.getRealTimeMetrics();
  }

  async generateCustomReport(options: any) {
    return this.getDashboardAnalytics('7d');
  }
}

export const analyticsService = new AnalyticsService();
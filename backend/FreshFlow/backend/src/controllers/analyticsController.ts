import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { analyticsService } from '../services/analyticsService';
import { logger } from '../utils/logger';

// interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     role: string;
//   };
// }

class AnalyticsController {
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '7d' } = req.query;

      // Validate timeRange parameter
      const validTimeRanges = ['1d', '7d', '30d', '90d', '1y'];
      if (!validTimeRanges.includes(timeRange as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time range. Allowed values: 1d, 7d, 30d, 90d, 1y'
        });
        return;
      }

      const stats = await analyticsService.getDashboardStats(timeRange as string);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getVendorAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { vendorId, startDate, endDate, metrics } = req.query;

      // Validate required vendorId
      if (!vendorId) {
        res.status(400).json({
          success: false,
          message: 'vendorId is required'
        });
        return;
      }

      // Validate date format if provided
      if (startDate && !this.isValidDate(startDate as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid startDate format. Use YYYY-MM-DD'
        });
        return;
      }

      if (endDate && !this.isValidDate(endDate as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid endDate format. Use YYYY-MM-DD'
        });
        return;
      }

      const analytics = await analyticsService.getVendorAnalytics(
        vendorId as string,
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      logger.error('Error fetching vendor analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendor analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getMarketplaceTrends(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        timeRange = '30d',
        groupBy = 'day',
        includeForecasting = 'false'
      } = req.query;

      // Validate groupBy parameter
      const validGroupBy = ['hour', 'day', 'week', 'month'];
      if (!validGroupBy.includes(groupBy as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid groupBy value. Allowed values: hour, day, week, month'
        });
        return;
      }

      // Validate timeRange
      const validTimeRanges = ['1d', '7d', '30d', '90d', '1y'];
      if (!validTimeRanges.includes(timeRange as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time range. Allowed values: 1d, 7d, 30d, 90d, 1y'
        });
        return;
      }

      const trends = await analyticsService.getMarketplaceTrends({
        category: category as string | undefined,
        timeRange: timeRange as string,
        groupBy: groupBy as 'hour' | 'day' | 'week' | 'month',
        includeForecasting: includeForecasting === 'true'
      });

      res.json({
        success: true,
        data: trends
      });
    } catch (error: any) {
      logger.error('Error fetching marketplace trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch marketplace trends',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getPriceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { ingredientId, timeRange = '30d', includePredictions = 'false' } = req.query;

      // Validate required ingredientId
      if (!ingredientId) {
        res.status(400).json({
          success: false,
          message: 'ingredientId is required'
        });
        return;
      }

      // Validate timeRange
      const validTimeRanges = ['1d', '7d', '30d', '90d', '1y'];
      if (!validTimeRanges.includes(timeRange as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time range. Allowed values: 1d, 7d, 30d, 90d, 1y'
        });
        return;
      }

      const priceData = await analyticsService.getPriceAnalytics(
        ingredientId as string,
      );

      res.json({
        success: true,
        data: priceData
      });
    } catch (error: any) {
      logger.error('Error fetching price analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch price analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getWasteMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '30d', vendorId, category } = req.query;

      // Validate timeRange
      const validTimeRanges = ['1d', '7d', '30d', '90d', '1y'];
      if (!validTimeRanges.includes(timeRange as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time range. Allowed values: 1d, 7d, 30d, 90d, 1y'
        });
        return;
      }

      const wasteMetrics = await analyticsService.getWasteMetrics(timeRange as string);

      res.json({
        success: true,
        data: wasteMetrics
      });
    } catch (error: any) {
      logger.error('Error fetching waste metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch waste metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getRevenueAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'day',
        vendorId,
        includeProjections = 'false'
      } = req.query;

      // Validate required date parameters
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      // Validate date format
      if (!this.isValidDate(startDate as string) || !this.isValidDate(endDate as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
        return;
      }

      // Validate date range
      if (new Date(startDate as string) > new Date(endDate as string)) {
        res.status(400).json({
          success: false,
          message: 'startDate cannot be after endDate'
        });
        return;
      }

      // Validate groupBy parameter
      const validGroupBy = ['day', 'week', 'month'];
      if (!validGroupBy.includes(groupBy as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid groupBy value. Allowed values: day, week, month'
        });
        return;
      }

      const revenueData = await analyticsService.getRevenueAnalytics(
        startDate as string,
        endDate as string,
      );

      res.json({
        success: true,
        data: revenueData
      });
    } catch (error: any) {
      logger.error('Error fetching revenue analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getUserEngagementMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '30d', segmentBy } = req.query;

      // Validate timeRange
      const validTimeRanges = ['1d', '7d', '30d', '90d', '1y'];
      if (!validTimeRanges.includes(timeRange as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time range. Allowed values: 1d, 7d, 30d, 90d, 1y'
        });
        return;
      }

      // Validate segmentBy if provided
      if (segmentBy) {
        const validSegments = ['location', 'userType', 'registrationDate', 'activityLevel'];
        if (!validSegments.includes(segmentBy as string)) {
          res.status(400).json({
            success: false,
            message: 'Invalid segmentBy value. Allowed values: location, userType, registrationDate, activityLevel'
          });
          return;
        }
      }

      const engagementData = await analyticsService.getUserEngagementMetrics(timeRange as string);

      res.json({
        success: true,
        data: engagementData
      });
    } catch (error: any) {
      logger.error('Error fetching user engagement metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user engagement metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const {
        reportType,
        parameters,
        format = 'json',
        includeChartData = true
      } = req.body;

      // Validate required fields
      if (!reportType) {
        res.status(400).json({
          success: false,
          message: 'reportType is required'
        });
        return;
      }

      // Validate format
      const validFormats = ['json', 'csv', 'pdf'];
      if (!validFormats.includes(format)) {
        res.status(400).json({
          success: false,
          message: 'Invalid format. Allowed values: json, csv, pdf'
        });
        return;
      }

      // Validate reportType
      const validReportTypes = ['sales', 'inventory', 'waste', 'vendor', 'market'];
      if (!validReportTypes.includes(reportType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid reportType. Allowed values: sales, inventory, waste, vendor, market'
        });
        return;
      }

      const report = await analyticsService.generateCustomReport(
        reportType,
      );

      if (format === 'json') {
        res.json({
          success: true,
          data: report
        });
      } else {
        const filename = `report_${reportType}_${Date.now()}`;
        const contentType = format === 'csv' ? 'text/csv' : 'application/pdf';
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);
        res.setHeader('Content-Type', contentType);
        res.send(report);
      }
    } catch (error: any) {
      logger.error('Error generating custom report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate custom report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getRealTimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await analyticsService.getRealTimeMetrics();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('Error fetching real-time metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch real-time metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '1h' } = req.query;

      // Validate timeRange for system metrics
      const validTimeRanges = ['5m', '15m', '30m', '1h', '6h', '12h', '24h'];
      if (!validTimeRanges.includes(timeRange as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid time range. Allowed values: 5m, 15m, 30m, 1h, 6h, 12h, 24h'
        });
        return;
      }

      const systemMetrics = await analyticsService.getSystemMetrics(timeRange as string);

      res.json({
        success: true,
        data: systemMetrics
      });
    } catch (error: any) {
      logger.error('Error fetching system metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Helper method to validate date format
  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && 
           date.toISOString().split('T')[0] === dateString;
  }
}

export const analyticsController = new AnalyticsController();
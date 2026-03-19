import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';
import { analyticsController } from '../controllers/analyticsController';
import Joi from 'joi';

const router = Router();

// Validation schemas
const analyticsQuerySchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month', 'quarter', 'year', 'custom').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  granularity: Joi.string().valid('hour', 'day', 'week', 'month').optional(),
  category: Joi.string().min(1).max(50).optional(),
  vendorId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional()
});

const dashboardQuerySchema = Joi.object({
  timeframe: Joi.string().valid('24h', '7d', '30d', '90d').optional(),
  includeDetails: Joi.boolean().optional()
});

// Dashboard overview analytics
router.get('/dashboard', 
  auth, 
  validate(dashboardQuerySchema, 'query'), 
  analyticsController.getDashboardStats
);

// Market trends and pricing analytics
router.get('/market-trends', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getMarketplaceTrends
);

// Ingredient popularity and demand analytics
router.get('/ingredient-analytics', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getMarketplaceTrends // Using existing method
);

// Vendor performance analytics
router.get('/vendor-performance', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getVendorAnalytics
);

// Order analytics and patterns
router.get('/order-analytics', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getDashboardStats // Using existing method
);

// Revenue and financial analytics
router.get('/revenue-analytics', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getRevenueAnalytics
);

// Waste reduction analytics
router.get('/waste-analytics', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getWasteMetrics
);

// Geographic distribution analytics
router.get('/geographic-analytics', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getDashboardStats // Using existing method
);

// Time-based usage patterns
router.get('/usage-patterns', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getUserEngagementMetrics
);

// Cost savings analytics
router.get('/cost-savings', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getRevenueAnalytics // Using existing method
);

// Real-time metrics
router.get('/real-time', 
  auth, 
  validate(Joi.object({
    metrics: Joi.array().items(Joi.string()).optional()
  }), 'query'),
  analyticsController.getRealTimeMetrics
);

// Export analytics data
const exportQuerySchema = Joi.object({
  format: Joi.string().valid('csv', 'excel', 'pdf').required(),
  type: Joi.string().valid('dashboard', 'orders', 'revenue', 'vendors', 'ingredients').required(),
  period: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

router.get('/export', 
  auth, 
  validate(exportQuerySchema, 'query'), 
  analyticsController.getCustomReport
);

// Custom analytics queries
router.post('/custom-query', 
  auth, 
  analyticsController.getCustomReport
);

// Predictive analytics
const predictionsQuerySchema = Joi.object({
  type: Joi.string().valid('demand', 'pricing', 'waste', 'revenue').required(),
  horizon: Joi.string().valid('1d', '7d', '30d', '90d').optional(),
  period: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

router.get('/predictions', 
  auth, 
  validate(predictionsQuerySchema, 'query'), 
  analyticsController.getPriceAnalytics // Using existing method
);

// Comparison analytics
const comparisonQuerySchema = Joi.object({
  compareWith: Joi.string().valid('previous_period', 'same_period_last_year', 'custom').required(),
  period: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

router.get('/comparison', 
  auth, 
  validate(comparisonQuerySchema, 'query'), 
  analyticsController.getRevenueAnalytics
);

// Alerts and notifications analytics
router.get('/alerts-analytics', 
  auth, 
  validate(analyticsQuerySchema, 'query'), 
  analyticsController.getDashboardStats
);

export default router;
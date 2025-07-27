import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getRevenueAnalytics, 
  getOrderAnalytics, 
  getVendorAnalytics, 
  getOrderTrends,
  getVendorGrowthRate,
  getSeasonalTrends,
  getHourlyDistribution,
  calculateGrowthRate,
  calculateConversionRate,
  predictTrend
} from '../src/services/analytics';
import { 
  formatCurrency, 
  formatNumber, 
  formatPercentage,
  generateColorPalette,
  getStatusColor,
  createLineChartConfig,
  createBarChartConfig,
  createPieChartConfig
} from '../src/utils/chartHelpers';
import dataProcessing from '../src/utils/dataProcessing';
import { formatDate, formatRelativeTime, generateDateRange, calculateBusinessDays, isWeekend, convertToIST, convertToTimezone, getFiscalYear} from '../src/utils/dateUtils';

// Mock API responses
const mockAnalyticsData = {
  revenue: {
    daily: [
      { date: '2024-01-01', amount: 1500 },
      { date: '2024-01-02', amount: 1800 },
      { date: '2024-01-03', amount: 2200 },
      { date: '2024-01-04', amount: 1950 },
      { date: '2024-01-05', amount: 2100 },
    ],
    monthly: [
      { month: '2023-11', amount: 45000 },
      { month: '2023-12', amount: 52000 },
      { month: '2024-01', amount: 58000 },
    ],
    yearly: [
      { year: '2022', amount: 480000 },
      { year: '2023', amount: 620000 },
      { year: '2024', amount: 58000 },
    ],
  },
  orders: {
    daily: [
      { date: '2024-01-01', count: 25 },
      { date: '2024-01-02', count: 32 },
      { date: '2024-01-03', count: 28 },
      { date: '2024-01-04', count: 35 },
      { date: '2024-01-05', count: 30 },
    ],
    byStatus: [
      { status: 'completed', count: 850 },
      { status: 'pending', count: 45 },
      { status: 'cancelled', count: 23 },
      { status: 'refunded', count: 12 },
    ],
    byCategory: [
      { category: 'vegetables', count: 320 },
      { category: 'fruits', count: 280 },
      { category: 'spices', count: 180 },
      { category: 'grains', count: 150 },
    ],
  },
  vendors: {
    growth: [
      { date: '2024-01-01', count: 78 },
      { date: '2024-01-02', count: 80 },
      { date: '2024-01-03', count: 82 },
      { date: '2024-01-04', count: 85 },
      { date: '2024-01-05', count: 87 },
    ],
    performance: [
      { vendorId: '1', name: 'Fresh Vegetables Co', orders: 150, revenue: 15000, rating: 4.8 },
      { vendorId: '2', name: 'Organic Fruits Ltd', orders: 120, revenue: 12500, rating: 4.6 },
      { vendorId: '3', name: 'Spice Masters', orders: 95, revenue: 8500, rating: 4.5 },
    ],
    distribution: [
      { location: 'Mumbai', count: 25 },
      { location: 'Delhi', count: 20 },
      { location: 'Bangalore', count: 18 },
      { location: 'Chennai', count: 15 },
      { location: 'Others', count: 7 },
    ],
  },
  trends: {
    seasonality: [
      { month: 'Jan', sales: 52000, orders: 890 },
      { month: 'Feb', sales: 48000, orders: 820 },
      { month: 'Mar', sales: 55000, orders: 920 },
      { month: 'Apr', sales: 58000, orders: 980 },
      { month: 'May', sales: 62000, orders: 1050 },
    ],
    hourlyDistribution: [
      { hour: 6, orders: 12 },
      { hour: 7, orders: 25 },
      { hour: 8, orders: 45 },
      { hour: 9, orders: 68 },
      { hour: 10, orders: 85 },
      { hour: 11, orders: 92 },
      { hour: 12, orders: 78 },
      { hour: 13, orders: 65 },
      { hour: 14, orders: 58 },
      { hour: 15, orders: 72 },
      { hour: 16, orders: 68 },
      { hour: 17, orders: 55 },
      { hour: 18, orders: 42 },
      { hour: 19, orders: 28 },
      { hour: 20, orders: 15 },
    ],
  },
};

// Mock the analytics API
vi.mock('../src/services/adminApi', () => ({
  adminApi: {
    getAnalytics: vi.fn().mockResolvedValue(mockAnalyticsData),
    getRevenueAnalytics: vi.fn().mockResolvedValue(mockAnalyticsData.revenue),
    getOrderAnalytics: vi.fn().mockResolvedValue(mockAnalyticsData.orders),
    getVendorAnalytics: vi.fn().mockResolvedValue(mockAnalyticsData.vendors),
    getTrendAnalytics: vi.fn().mockResolvedValue(mockAnalyticsData.trends),
  },
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Revenue Analytics', () => {
    it('calculates total revenue correctly', async () => {
      const revenueData = await getRevenueAnalytics('daily', '2024-01-01', '2024-01-05');
      
      expect(revenueData).toBeDefined();
      expect(revenueData.total).toBe(9550); // Sum of daily amounts
      expect(revenueData.average).toBe(1910); // Average daily revenue
      expect(revenueData.growth).toBeTypeOf('number');
    });

    it('handles monthly revenue aggregation', async () => {
      const monthlyRevenue = await getRevenueAnalytics('monthly', '2023-11-01', '2024-01-31');
      
      expect(monthlyRevenue).toBeDefined();
      expect(monthlyRevenue.data).toHaveLength(3);
      expect(monthlyRevenue.total).toBe(155000);
    });

    it('calculates revenue growth percentage', async () => {
      const currentRevenue = 58000;
      const previousRevenue = 52000;
      const growth = calculateGrowthRate(currentRevenue, previousRevenue);
      
      expect(growth).toBeCloseTo(11.54, 2);
    });
  });

  describe('Order Analytics', () => {
    it('processes order status distribution', async () => {
      const orderData = await getOrderAnalytics('status');
      
      expect(orderData.byStatus).toBeDefined();
      expect(orderData.byStatus).toHaveLength(4);
      
      const completedOrders = orderData.byStatus.find(item => item.status === 'completed');
      expect(completedOrders?.count).toBe(850);
    });

    it('analyzes order trends over time', async () => {
      const trendData = await getOrderTrends('daily', 7);
      
      expect(trendData).toBeDefined();
      expect(trendData.data).toBeDefined();
      expect(trendData.totalOrders).toBeTypeOf('number');
      expect(trendData.averageOrdersPerDay).toBeTypeOf('number');
    });

    it('calculates order conversion rates', () => {
      const totalVisitors = 1000;
      const totalOrders = 150;
      const conversionRate = calculateConversionRate(totalOrders, totalVisitors);
      
      expect(conversionRate).toBe(15);
    });
  });

  describe('Vendor Analytics', () => {
    it('ranks vendors by performance', async () => {
      const vendorData = await getVendorAnalytics('performance');
      
      expect(vendorData.performance).toBeDefined();
      expect(vendorData.performance).toHaveLength(3);
      
      // Should be sorted by revenue (highest first)
      expect(vendorData.performance[0].revenue).toBeGreaterThanOrEqual(
        vendorData.performance[1].revenue
      );
    });

    it('analyzes vendor distribution by location', async () => {
      const distributionData = await getVendorAnalytics('distribution');
      
      expect(distributionData.distribution).toBeDefined();
      expect(distributionData.distribution).toHaveLength(5);
      
      const totalVendors = distributionData.distribution.reduce(
        (sum, item) => sum + item.count, 0
      );
      expect(totalVendors).toBe(85);
    });

    it('calculates vendor growth rate', async () => {
      const growthData = await getVendorGrowthRate('monthly');
      
      expect(growthData).toBeDefined();
      expect(growthData.currentMonth).toBeTypeOf('number');
      expect(growthData.previousMonth).toBeTypeOf('number');
      expect(growthData.growthRate).toBeTypeOf('number');
    });
  });

  describe('Trend Analysis', () => {
    it('identifies seasonal patterns', async () => {
      const seasonalData = await getSeasonalTrends();
      
      expect(seasonalData).toBeDefined();
      expect(seasonalData.data).toHaveLength(5);
      
      // Check for seasonal insights
      const peakMonth = seasonalData.data.reduce((prev, current) => 
        prev.sales > current.sales ? prev : current
      );
      expect(peakMonth.month).toBe('May');
    });

    it('analyzes hourly distribution patterns', async () => {
      const hourlyData = await getHourlyDistribution();
      
      expect(hourlyData).toBeDefined();
      expect(hourlyData.data).toHaveLength(15); // 6 AM to 8 PM
      
      // Find peak hour
      const peakHour = hourlyData.data.reduce((prev, current) => 
        prev.orders > current.orders ? prev : current
      );
      expect(peakHour.hour).toBe(11); // 11 AM peak
    });

    it('predicts future trends', () => {
      const historicalData = [100, 120, 135, 150, 180, 200];
      const prediction = predictTrend(historicalData, 3);
      
      expect(prediction).toBeDefined();
      expect(prediction).toHaveLength(3);
      expect(prediction[0]).toBeGreaterThan(200); // Should predict growth
    });
  });
});

describe('Chart Helpers', () => {
  describe('Data Formatting', () => {
    it('formats currency values correctly', () => {
      const formatted = formatCurrency(1500.50);
      expect(formatted).toBe('₹1,500.50');
    });

    it('formats large numbers with abbreviations', () => {
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(1500000000)).toBe('1.5B');
    });

    it('formats percentages correctly', () => {
      expect(formatPercentage(0.1554)).toBe('15.54%');
      expect(formatPercentage(0.05)).toBe('5.00%');
    });
  });

  describe('Color Generation', () => {
    it('generates consistent color palettes', () => {
      const colors = generateColorPalette(5);
      
      expect(colors).toHaveLength(5);
      expect(colors[0]).toMatch(/^#[0-9A-Fa-f]{6}$/); // Valid hex color
    });

    it('provides status-based colors', () => {
      expect(getStatusColor('healthy')).toBe('#10b981');
      expect(getStatusColor('warning')).toBe('#f59e0b');
      expect(getStatusColor('critical')).toBe('#ef4444');
    });
  });

  describe('Chart Configuration', () => {
    it('creates proper line chart config', () => {
      const config = createLineChartConfig({
        data: mockAnalyticsData.revenue.daily,
        xKey: 'date',
        yKey: 'amount',
        color: '#3b82f6',
      });

      expect(config).toBeDefined();
      expect(config.data).toEqual(mockAnalyticsData.revenue.daily);
      expect(config.options.responsive).toBe(true);
    });

    it('creates proper bar chart config', () => {
      const config = createBarChartConfig({
        data: mockAnalyticsData.orders.byCategory,
        xKey: 'category',
        yKey: 'count',
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      });

      expect(config).toBeDefined();
      expect(config.data).toEqual(mockAnalyticsData.orders.byCategory);
    });

    it('creates proper pie chart config', () => {
      const config = createPieChartConfig({
        data: mockAnalyticsData.orders.byStatus,
        labelKey: 'status',
        valueKey: 'count',
      });

      expect(config).toBeDefined();
      expect(config.data).toEqual([850, 45, 23, 12]);
    });
  });
});

describe('Data Processing', () => {
  describe('Aggregation Functions', () => {
    it('aggregates data by time period', () => {
      const data = [
        { date: '2024-01-01', amount: 100 },
        { date: '2024-01-01', amount: 150 },
        { date: '2024-01-02', amount: 200 },
      ];

      const aggregated = dataProcessing.aggregateByDate(data, 'date', 'amount');
      
      expect(aggregated).toHaveLength(2);
      expect(aggregated[0].amount).toBe(250); // Sum of same date
      expect(aggregated[1].amount).toBe(200);
    });

    it('groups data by category', () => {
      const data = [
        { category: 'A', value: 100 },
        { category: 'B', value: 200 },
        { category: 'A', value: 150 },
      ];

      const grouped = dataProcessing.groupByCategory(data, 'category');
      
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
    });

    it('calculates moving averages correctly', () => {
      const data = [10, 20, 30, 40, 50, 60, 70];
      const movingAvg = dataProcessing.calculateMovingAverage(data, 3);
      
      expect(movingAvg).toHaveLength(5); // Original length - window + 1
      expect(movingAvg[0]).toBe(20); // (10+20+30)/3
      expect(movingAvg[4]).toBe(60); // (50+60+70)/3
    });
  });

  describe('Statistical Functions', () => {
    it('calculates standard deviation', () => {
      const data = [10, 12, 23, 23, 16, 23, 21, 16];
      const stdDev = dataProcessing.calculateStandardDeviation(data);
      
      expect(stdDev).toBeCloseTo(4.79, 2);
    });

    it('identifies outliers', () => {
      const data = [10, 12, 13, 14, 15, 16, 17, 100]; // 100 is outlier
      const outliers = dataProcessing.findOutliers(data);
      
      expect(outliers).toContain(100);
      expect(outliers).not.toContain(15);
    });

    it('calculates percentiles', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const p50 = dataProcessing.calculatePercentile(data, 50);
      const p90 = dataProcessing.calculatePercentile(data, 90);
      
      expect(p50).toBe(5.5); // Median
      expect(p90).toBe(9.1); // 90th percentile
    });
  });

  describe('Data Transformation', () => {
    it('normalizes data to 0-1 range', () => {
      const data = [10, 20, 30, 40, 50];
      const normalized = dataProcessing.normalizeData(data);
      
      expect(normalized[0]).toBe(0);
      expect(normalized[4]).toBe(1);
      expect(normalized[2]).toBe(0.5);
    });

    it('applies smoothing to time series data', () => {
      const noisyData = [10, 15, 12, 18, 14, 20, 16];
      const smoothed = dataProcessing.applySmoothening(noisyData, 0.3);
      
      expect(smoothed).toHaveLength(noisyData.length);
      expect(smoothed[1]).not.toBe(noisyData[1]); // Should be smoothed
    });

    it('fills missing data points', () => {
      const dataWithGaps = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-03', value: 120 }, // Missing 01-02
        { date: '2024-01-04', value: 130 },
      ];

      const filled = dataProcessing.fillMissingDates(dataWithGaps, 'date', 'value');
      
      expect(filled).toHaveLength(4);
      expect(filled[1].date).toBe('2024-01-02');
      expect(filled[1].value).toBe(110); // Interpolated value
    });
  });
});

describe('Date Utils', () => {
  describe('Date Formatting', () => {
    it('formats dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
      expect(formatDate(date, 'MMM DD, YYYY')).toBe('Jan 15, 2024');
    });

    it('formats relative time correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    });
  });

  describe('Date Range Generation', () => {
    it('generates date ranges correctly', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-05');
      const range = generateDateRange(startDate, endDate, 'day');
      
      expect(range).toHaveLength(5);
      expect(range[0]).toBe('2024-01-01');
      expect(range[4]).toBe('2024-01-05');
    });

    it('generates week ranges', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-21');
      const weekRange = generateDateRange(startDate, endDate, 'week');
      
      expect(weekRange).toHaveLength(3);
    });

    it('generates month ranges', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-06-01');
      const monthRange = generateDateRange(startDate, endDate, 'month');
      
      expect(monthRange).toHaveLength(6);
      expect(monthRange[0]).toBe('2024-01');
      expect(monthRange[5]).toBe('2024-06');
    });
  });

  describe('Date Calculations', () => {
    it('calculates business days correctly', () => {
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-07'); // Sunday
      const businessDays = calculateBusinessDays(startDate, endDate);
      
      expect(businessDays).toBe(5); // Mon-Fri
    });

    it('identifies weekends', () => {
      const saturday = new Date('2024-01-06');
      const sunday = new Date('2024-01-07');
      const monday = new Date('2024-01-08');
      
      expect(isWeekend(saturday)).toBe(true);
      expect(isWeekend(sunday)).toBe(true);
      expect(isWeekend(monday)).toBe(false);
    });

    it('gets fiscal year correctly', () => {
      const aprilDate = new Date('2024-04-01');
      const marchDate = new Date('2024-03-31');
      
      expect(getFiscalYear(aprilDate)).toBe('FY2024-25');
      expect(getFiscalYear(marchDate)).toBe('FY2023-24');
    });
  });

  describe('Timezone Handling', () => {
    it('converts to Indian Standard Time', () => {
      const utcDate = new Date('2024-01-15T10:30:00Z');
      const istDate = convertToIST(utcDate);
      
      expect(istDate.getHours()).toBe(16); // UTC+5:30
      expect(istDate.getMinutes()).toBe(0);
    });

    it('handles daylight saving time', () => {
      const summerDate = new Date('2024-07-15T12:00:00Z');
      const winterDate = new Date('2024-01-15T12:00:00Z');
      
      const summerEST = convertToTimezone(summerDate, 'America/New_York');
      const winterEST = convertToTimezone(winterDate, 'America/New_York');
      
      expect(summerEST.getHours()).toBe(8); // EDT (UTC-4)
      expect(winterEST.getHours()).toBe(7); // EST (UTC-5)
    });
  });
});

describe('Performance Tests', () => {
  describe('Large Dataset Processing', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        date: `2024-01-${(i % 31) + 1}`,
        value: Math.random() * 1000,
        category: `category_${i % 10}`,
      }));

      const startTime = performance.now();
      const processed = dataProcessing.aggregateByDate(largeDataset, 'date', 'value');
      const endTime = performance.now();

      expect(processed).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should process within 100ms
    });

    it('efficiently calculates complex analytics', () => {
      const complexData = Array.from({ length: 5000 }, (_, i) => ({
        timestamp: new Date(2024, 0, 1 + (i % 365)).toISOString(),
        revenue: Math.random() * 1000,
        orders: Math.floor(Math.random() * 50),
        vendorId: `vendor_${i % 100}`,
        category: `category_${i % 20}`,
      }));

      const startTime = performance.now();
      
      // Perform multiple analytics operations
      const revenueByMonth = dataProcessing.aggregateByMonth(complexData, 'revenue');
      const ordersByVendor = dataProcessing.groupByVendor(complexData, 'orders');
      const categoryTrends = dataProcessing.calculateTrends(complexData, 'category');
      
      const endTime = performance.now();

      expect(revenueByMonth).toBeDefined();
      expect(ordersByVendor).toBeDefined();
      expect(categoryTrends).toBeDefined();
      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Memory Usage', () => {
    it('manages memory efficiently with large datasets', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Create and process large dataset
      const largeDataset = Array.from({ length: 50000 }, (_, i) => ({
        id: i,
        data: `data_${i}`,
        value: Math.random(),
      }));

      // Process the data
      const processed = dataProcessing.processLargeDataset(largeDataset);
      
      // Force garbage collection if available
      if (typeof (globalThis as any).gc === 'function') {
        (globalThis as any).gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDiff = finalMemory - initialMemory;

      expect(processed).toBeDefined();
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryDiff).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  describe('Invalid Data Handling', () => {
    it('handles null and undefined values', () => {
      const dataWithNulls = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: null },
        { date: '2024-01-03', value: undefined },
        { date: '2024-01-04', value: 200 },
      ];

      const processed = dataProcessing.cleanData(dataWithNulls);
      
      expect(processed).toHaveLength(4); // All entries, but with null values
      expect(processed.filter(item => item.value !== null && item.value !== undefined)).toHaveLength(2);
    });

    it('handles empty datasets gracefully', () => {
      const emptyData: any[] = [];
      
      expect(() => dataProcessing.aggregateByDate(emptyData, 'date', 'value')).not.toThrow();
      expect(() => createLineChartConfig({ data: emptyData, xKey: 'x', yKey: 'y' })).not.toThrow();
    });

    it('handles malformed date strings', () => {
      const dataWithBadDates = [
        { date: 'invalid-date', value: 100 },
        { date: '2024-01-01', value: 200 },
        { date: '', value: 300 },
      ];

      const cleaned = dataProcessing.validateDates(dataWithBadDates, 'date');
      
      expect(cleaned).toHaveLength(1); // Only valid date entry
      expect(cleaned[0].date).toBe('2024-01-01');
    });
  });

  describe('Boundary Conditions', () => {
    it('handles single data point', () => {
      const singlePoint = [{ date: '2024-01-01', value: 100 }];
      
      const result = dataProcessing.calculateTrend(singlePoint);
      expect(result.slope).toBe(0); // No trend with single point
    });

    it('handles identical values', () => {
      const identicalData = Array.from({ length: 10 }, () => ({ value: 100 }));
      
      const stdDev = dataProcessing.calculateStandardDeviation(identicalData.map(d => d.value));
      expect(stdDev).toBe(0); // No variation
    });

    it('handles extreme values', () => {
      const extremeData = [
        { value: Number.MAX_SAFE_INTEGER },
        { value: Number.MIN_SAFE_INTEGER },
        { value: 0 },
      ];

      expect(() => dataProcessing.normalizeData(extremeData.map(d => d.value))).not.toThrow();
    });
  });
});
import { useState, useEffect, useCallback } from 'react';
import { useAnalyticsStore } from '../store/analyticsStore';
import { analyticsService } from '../services/analytics';
import { exportService } from '../services/exports';
import type { 
  DashboardStats,
  RevenueAnalytics,
  UserAnalytics,
  OrderAnalytics,
  AnalyticsFilters,
  PerformanceMetrics,
  RevenueMetrics,
  UserMetrics,
  OrderMetrics,
  WasteReductionMetrics,
  GeographicData,
  AnalyticsTimeRange,
  DashboardMetrics,
  RevenueData,
  UserGrowthData,
  TopVendor,
  RecentTransaction
} from '../types/analytics';

interface UseAnalyticsReturn {
  // Dashboard data
  dashboardMetrics: DashboardMetrics | null;
  revenueData: RevenueData[];
  userGrowthData: UserGrowthData[];
  topVendors: TopVendor[];
  recentTransactions: RecentTransaction[];
  
  // Extended analytics data
  revenueMetrics: RevenueMetrics | undefined;
  userMetrics: UserMetrics | undefined;
  orderMetrics: OrderMetrics | undefined;
  wasteReductionMetrics: WasteReductionMetrics | undefined;
  geographicData: GeographicData[] | undefined;
  performanceMetrics: PerformanceMetrics | undefined;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchDashboardData: (timeRange: '7d' | '30d' | '90d') => Promise<void>;
  refreshData: () => Promise<void>;
  exportData: (type: string, format: 'csv' | 'excel' | 'pdf') => Promise<void>;
  trackEvent: (event: string, properties?: Record<string, any>) => void;
  
  // Analytics methods
  getDashboardStats: (filters?: AnalyticsFilters) => Promise<DashboardStats>;
  getRevenueAnalytics: (filters?: AnalyticsFilters) => Promise<RevenueAnalytics>;
  getUserAnalytics: (filters?: AnalyticsFilters) => Promise<UserAnalytics>;
  getOrderAnalytics: (filters?: AnalyticsFilters) => Promise<OrderAnalytics>;
  getPerformanceMetrics: (filters?: AnalyticsFilters) => Promise<PerformanceMetrics>;

  // Extended analytics methods
  fetchAnalytics: (timeRange: AnalyticsTimeRange) => Promise<void>;
  fetchRevenueData: (timeRange: AnalyticsTimeRange) => Promise<void>;
  fetchUserGrowthData: (timeRange: AnalyticsTimeRange) => Promise<void>;
  fetchOrderAnalytics: (timeRange: AnalyticsTimeRange) => Promise<void>;
  fetchWasteReductionData: (timeRange: AnalyticsTimeRange) => Promise<void>;
  fetchGeographicData: (timeRange: AnalyticsTimeRange) => Promise<void>;
  fetchPerformanceData: () => Promise<void>;
}

export const useAnalytics = (): UseAnalyticsReturn => {
  const {
    loading: storeLoading,
    error: storeError,
    loadAnalytics,
    refreshData: storeRefreshData
  } = useAnalyticsStore();

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extended analytics state
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics>();
  const [userMetrics, setUserMetrics] = useState<UserMetrics | undefined>();
  const [orderMetrics, setOrderMetrics] = useState<OrderMetrics | undefined>();
  const [wasteReductionMetrics, setWasteReductionMetrics] = useState<WasteReductionMetrics | undefined>();
  const [geographicData, setGeographicData] = useState<GeographicData[] | undefined>();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | undefined>();

  // Convert time range to date range
  const getDateRangeFromTimeRange = (timeRange: '7d' | '30d' | '90d') => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (timeRange: '7d' | '30d' | '90d') => {
    try {
      setLoading(true);
      setError(null);

      const dateRange = getDateRangeFromTimeRange(timeRange);
      const filters: AnalyticsFilters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      // Fetch all required data
      const [
        dashboardStats,
        revenueAnalytics,
        userAnalytics,
        orderAnalytics
      ] = await Promise.all([
        analyticsService.getDashboardStats(filters),
        analyticsService.getRevenueAnalytics(filters),
        analyticsService.getUserAnalytics(filters),
        analyticsService.getOrderAnalytics(filters)
      ]);

      // Transform dashboard stats
      setDashboardMetrics({
        totalRevenue: dashboardStats.totalRevenue,
        previousRevenue: dashboardStats.totalRevenue * 0.85, // Mock previous data
        activeVendors: dashboardStats.activeVendors,
        previousVendors: dashboardStats.activeVendors * 0.9, // Mock previous data
        totalOrders: dashboardStats.totalOrders,
        previousOrders: dashboardStats.totalOrders * 0.8, // Mock previous data
        completedOrders: orderAnalytics.completedOrders,
        pendingOrders: orderAnalytics.pendingOrders,
        cancelledOrders: orderAnalytics.cancelledOrders,
        wasteReduction: dashboardStats.wasteReduction
      });

      // Transform revenue data for chart
      setRevenueData(
        revenueAnalytics.monthlyRevenue.map(item => ({
          date: item.month || item.date || '',
          revenue: item.revenue || item.amount || 0
        }))
      );

      // Transform user growth data
      setUserGrowthData(
        userAnalytics.userActivityTrends.map(item => ({
          month: item.month || item.period || '',
          users: item.users || item.count || 0
        }))
      );

      // Transform top vendors
      setTopVendors(
        userAnalytics.topActiveUsers?.slice(0, 10).map(user => ({
          id: user.id,
          name: user.name,
          location: user.location || 'Unknown',
          revenue: user.totalRevenue || 0,
          orderCount: user.totalOrders || 0
        })) || []
      );

      // Mock recent transactions
      setRecentTransactions([
        {
          id: 'txn_001',
          vendorName: 'Ravi Vegetables',
          amount: 2500,
          status: 'completed',
          createdAt: new Date().toISOString()
        },
        {
          id: 'txn_002',
          vendorName: 'Sharma Fruits',
          amount: 1800,
          status: 'pending',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: 'txn_003',
          vendorName: 'Krishna Spices',
          amount: 3200,
          status: 'completed',
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
        }
      ]);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Extended analytics methods
  const fetchAnalytics = useCallback(async (timeRange: AnalyticsTimeRange) => {
    try {
      setLoading(true);
      setError(null);
      
      const dateRange = getDateRangeFromTimeRange(timeRange as '7d' | '30d' | '90d');
      const filters: AnalyticsFilters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      await loadAnalytics();
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [loadAnalytics]);

  const fetchRevenueData = useCallback(async (timeRange: AnalyticsTimeRange) => {
    try {
      const dateRange = getDateRangeFromTimeRange(timeRange as '7d' | '30d' | '90d');
      const filters: AnalyticsFilters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const revenueAnalytics = await analyticsService.getRevenueAnalytics(filters);
      
      setRevenueMetrics({
        totalRevenue: revenueAnalytics.totalRevenue,
        growth: revenueAnalytics.growth || 5.2, // Default to 5.2 if growth is missing
        chartData: revenueAnalytics.monthlyRevenue.map(item => ({
          date: item.month || item.date || '', // Default to an empty string if no month or date
          revenue: item.revenue || item.amount || 0 // Default to 0 if no revenue or amount
        })),
        transactionFees: revenueAnalytics.transactionFees ?? 0, // Default to 0 if undefined
        subscriptionFees: revenueAnalytics.subscriptionFees ?? 0, // Default to 0 if undefined
        premiumFees: revenueAnalytics.premiumFees ?? 0, // Default to 0 if undefined
        topVendors: revenueAnalytics.topVendors ?? [] // Default to an empty array if undefined
      });

      
    } catch (err) {
      console.error('Failed to fetch revenue data:', err);
    }
  }, []);

  const fetchUserGrowthData = useCallback(async (timeRange: AnalyticsTimeRange) => {
    try {
      const dateRange = getDateRangeFromTimeRange(timeRange as '7d' | '30d' | '90d');
      const filters: AnalyticsFilters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const userAnalytics = await analyticsService.getUserAnalytics(filters);
      
      setUserMetrics({
        activeUsers: userAnalytics.activeUsers,
        growth: userAnalytics.growth,
        chartData: userAnalytics.userActivityTrends.map(item => ({
          date: item.month || item.period || '',
          users: item.users || item.count || 0
        })),
        newRegistrations: userAnalytics.newRegistrations || 0,
        retentionRate: userAnalytics.retentionRate || 0,
        avgSessionDuration: userAnalytics.avgSessionDuration || 0,
        registrationGrowth: userAnalytics.registrationGrowth || 0,
        retentionGrowth: userAnalytics.retentionGrowth || 0,
        sessionDurationGrowth: userAnalytics.sessionDurationGrowth || 0,
      });
      
    } catch (err) {
      console.error('Failed to fetch user growth data:', err);
    }
  }, []);

  const fetchOrderAnalytics = useCallback(async (timeRange: AnalyticsTimeRange) => {
    try {
      const dateRange = getDateRangeFromTimeRange(timeRange as '7d' | '30d' | '90d');
      const filters: AnalyticsFilters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      const orderAnalytics = await analyticsService.getOrderAnalytics(filters);
      
      setOrderMetrics({
        totalOrders: orderAnalytics.totalOrders,
        growth: orderAnalytics.growth,
        chartData: [
          { date: '2024-01', orders: orderAnalytics.totalOrders * 0.2 },
          { date: '2024-02', orders: orderAnalytics.totalOrders * 0.3 },
          { date: '2024-03', orders: orderAnalytics.totalOrders * 0.5 }
        ], // Mock chart data
        avgOrderValue: orderAnalytics.avgOrderValue || 0, // Default value if undefined
        completionRate: orderAnalytics.completionRate || 0, // Default value if undefined
        returnRate: orderAnalytics.returnRate || 0, // Default value if undefined
        avgOrderValueGrowth: orderAnalytics.avgOrderValueGrowth || 0, // Default value if undefined
        completionRateGrowth: orderAnalytics.completionRateGrowth || 0, // Default value if undefined
        returnRateChange: orderAnalytics.returnRateChange || 0 // Default value if undefined
      });
      
    } catch (err) {
      console.error('Failed to fetch order analytics:', err);
    }
  }, []);

  const fetchWasteReductionData = useCallback(async (timeRange: AnalyticsTimeRange) => {
    try {
      // Mock waste reduction data
      setWasteReductionMetrics({
        reductionPercentage: 68.5,
        totalKgSaved: 15000,
        moneySaved: 250000,
        co2Reduced: 5000,
        vendorsHelped: 85,
        chartData: [
          { date: '2024-01', wasteReduced: 45.2 },
          { date: '2024-02', wasteReduced: 52.8 },
          { date: '2024-03', wasteReduced: 68.5 }
        ]
      });
    } catch (err) {
      console.error('Failed to fetch waste reduction data:', err);
    }
  }, []);

  const fetchGeographicData = useCallback(async () => {
    try {
      // Mock geographic data
      setGeographicData([
        { location: 'Mumbai', orders: 450, color: '#3B82F6' },
        { location: 'Delhi', orders: 380, color: '#10B981' },
        { location: 'Bangalore', orders: 320, color: '#F59E0B' },
        { location: 'Chennai', orders: 280, color: '#EF4444' },
        { location: 'Others', orders: 220, color: '#8B5CF6' }
      ]);
    } catch (err) {
      console.error('Failed to fetch geographic data:', err);
    }
  }, []);

  const fetchPerformanceData = useCallback(async () => {
    try {
      const performanceData = await analyticsService.getPerformanceMetrics();
      setPerformanceMetrics(performanceData);
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await storeRefreshData();
      analyticsService.refreshCache();
      
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [storeRefreshData]);

  // Export data
  const exportData = useCallback(async (type: string, format: 'csv' | 'excel' | 'pdf') => {
    try {
      setLoading(true);
      setError(null);
      
      await exportService.exportData({
        type,
        format,
        filters: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      });
      
    } catch (err: any) {
      console.error('Error exporting data:', err);
      setError(err.message || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Track events
  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    try {
      console.log('Tracking event:', event, properties);
      // Integration with analytics services would go here
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, []);

  // Direct analytics service methods
  const getDashboardStats = useCallback(async (filters?: AnalyticsFilters) => {
    return await analyticsService.getDashboardStats(filters);
  }, []);

  const getRevenueAnalytics = useCallback(async (filters?: AnalyticsFilters) => {
    return await analyticsService.getRevenueAnalytics(filters);
  }, []);

  const getUserAnalytics = useCallback(async (filters?: AnalyticsFilters) => {
    return await analyticsService.getUserAnalytics(filters);
  }, []);

  const getOrderAnalytics = useCallback(async (filters?: AnalyticsFilters) => {
    return await analyticsService.getOrderAnalytics(filters);
  }, []);

  const getPerformanceMetrics = useCallback(async (filters?: AnalyticsFilters) => {
    return await analyticsService.getPerformanceMetrics(filters);
  }, []);

  // Update store loading and error states
  useEffect(() => {
    if (storeError && !error) {
      setError(storeError);
    }
  }, [storeError, error]);

  return {
    // Dashboard data
    dashboardMetrics,
    revenueData,
    userGrowthData,
    topVendors,
    recentTransactions,
    
    // Extended analytics data
    revenueMetrics,
    userMetrics,
    orderMetrics,
    wasteReductionMetrics,
    geographicData,
    performanceMetrics,
    
    // Loading states
    loading: loading || storeLoading,
    error: error || storeError,
    
    // Actions
    fetchDashboardData,
    refreshData,
    exportData,
    trackEvent,
    
    // Analytics methods
    getDashboardStats,
    getRevenueAnalytics,
    getUserAnalytics,
    getOrderAnalytics,
    getPerformanceMetrics,

    // Extended analytics methods
    fetchAnalytics,
    fetchRevenueData,
    fetchUserGrowthData,
    fetchOrderAnalytics,
    fetchWasteReductionData,
    fetchGeographicData,
    fetchPerformanceData
  };
};
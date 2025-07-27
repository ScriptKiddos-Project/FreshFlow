// Analytics Type Definitions

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  vendorIds?: string[];
  categoryIds?: string[];
  regions?: string[];
  orderStatuses?: string[];
}

export interface DashboardStats {
  totalRevenue: number;
  activeVendors: number;
  totalOrders: number;
  wasteReduction: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  growth?: number;
  monthlyRevenue: Array<{
    month?: string;
    date?: string;
    revenue?: number;
    amount?: number;
  }>;
  transactionFees?: number;
  subscriptionFees?: number;
  premiumFees?: number;
  topVendors?: Array<{
    id: string;
    name: string;
    location: string;
    revenue: number;
    orders: number;
  }>;
}

export interface UserAnalytics {
  activeUsers: number;
  growth: number;
  newRegistrations?: number;
  retentionRate?: number;
  avgSessionDuration?: number;
  registrationGrowth?: number;
  retentionGrowth?: number;
  sessionDurationGrowth?: number;
  userActivityTrends: Array<{
    month?: string;
    period?: string;
    users?: number;
    count?: number;
  }>;
  topActiveUsers?: Array<{
    id: string;
    name: string;
    location?: string;
    totalRevenue?: number;
    totalOrders?: number;
  }>;
}

export interface OrderAnalytics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  growth: number;
  avgOrderValue?: number;
  completionRate?: number;
  returnRate?: number;
  avgOrderValueGrowth?: number;
  completionRateGrowth?: number;
  returnRateChange?: number;
}

export interface PerformanceMetrics {
  avgResponseTime?: number;
  successRate?: number;
  uptime?: number;
  apiCalls?: number;
}

export interface WasteReductionMetrics {
  reductionPercentage: number;
  totalKgSaved?: number;
  moneySaved?: number;
  co2Reduced?: number;
  vendorsHelped?: number;
  chartData?: Array<{
    date: string;
    wasteReduced: number;
  }>;
}

export interface GeographicData {
  location: string;
  orders: number;
  color?: string;
}

export interface RevenueMetrics {
  totalRevenue: number;
  growth: number;
  chartData: Array<{
    date: string;
    revenue: number;
  }>;
  transactionFees?: number;
  subscriptionFees?: number;
  premiumFees?: number;
  topVendors?: Array<{
    id: string;
    name: string;
    location: string;
    revenue: number;
    orders: number;
  }>;
}

export interface UserMetrics {
  activeUsers: number;
  growth: number;
  newRegistrations?: number;
  retentionRate?: number;
  avgSessionDuration?: number;
  registrationGrowth?: number;
  retentionGrowth?: number;
  sessionDurationGrowth?: number;
  chartData: Array<{
    date: string;
    users: number;
  }>;
}

export interface OrderMetrics {
  totalOrders: number;
  growth: number;
  avgOrderValue?: number;
  completionRate?: number;
  returnRate?: number;
  avgOrderValueGrowth?: number;
  completionRateGrowth?: number;
  returnRateChange?: number;
  chartData: Array<{
    date: string;
    orders: number;
  }>;
}

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y';

export interface DateRange {
  startDate: string;
  endDate: string;
  period?: string;
}

export interface MetricCard {
  id: string;
  title: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface ChartData {
  id: string;
  title: string;
  data: any[];
  type: 'line' | 'bar' | 'pie';
}

export interface AnalyticsFilter {
  id: string;
  key: string;
  value: any;
  label: string;
}

export interface ComparisonData {
  current: any;
  previous: any;
  change: number;
  percentage: number;
}

export interface AnalyticsData {
  revenue: RevenueAnalytics;
  orders: OrderAnalytics;
  users: UserAnalytics;
  performance: PerformanceMetrics;
}

// Dashboard specific interfaces
export interface DashboardMetrics {
  totalRevenue: number;
  previousRevenue: number;
  activeVendors: number;
  previousVendors: number;
  totalOrders: number;
  previousOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  wasteReduction: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  amount?: number;
  month?: string;
}

export interface UserGrowthData {
  month: string;
  users: number;
  count?: number;
  period?: string;
}

export interface TopVendor {
  id: string;
  name: string;
  location: string;
  revenue: number;
  orderCount: number;
  totalRevenue?: number;
  totalOrders?: number;
}

export interface RecentTransaction {
  id: string;
  vendorName: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

// Export interfaces
export interface ExportOptions {
  type: string;
  format: 'csv' | 'excel' | 'pdf';
  filters: AnalyticsFilters;
}

// For backward compatibility
export type MetricType = string;
export type KPIMetric = MetricCard;
export type TrendData = { date: string; value: number };
export type FilterOptions = AnalyticsFilters;
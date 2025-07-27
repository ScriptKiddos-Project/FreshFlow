import type { 
  DashboardStats,
  RevenueAnalytics,
  UserAnalytics,
  OrderAnalytics,
  AnalyticsFilters,
  PerformanceMetrics,
  ExportOptions
} from '../types/analytics';

class AnalyticsService {
  private baseUrl = '/api/admin/analytics';

  async getDashboardStats(filters?: AnalyticsFilters): Promise<DashboardStats> {
    const queryParams = this.buildQueryParams(filters);
    const response = await fetch(`${this.baseUrl}/dashboard?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }

    return response.json();
  }

  async getRevenueAnalytics(
    period: 'daily' | 'monthly' | 'yearly' = 'daily',
    startDate?: string,
    endDate?: string
  ): Promise<RevenueAnalytics> {
    const queryParams = new URLSearchParams({
      period,
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
    
    const response = await fetch(`${this.baseUrl}/revenue?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch revenue analytics');
    }

    const data = await response.json();
    
    // Calculate additional metrics
    const total = data.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;
    const average = data.data?.length ? total / data.data.length : 0;
    const growth = data.previousPeriodTotal ? 
      ((total - data.previousPeriodTotal) / data.previousPeriodTotal) * 100 : 0;

    return {
      ...data,
      total,
      average,
      growth
    };
  }

  async getUserAnalytics(filters?: AnalyticsFilters): Promise<UserAnalytics> {
    const queryParams = this.buildQueryParams(filters);
    const response = await fetch(`${this.baseUrl}/users?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user analytics');
    }

    return response.json();
  }

  async getOrderAnalytics(type?: string): Promise<OrderAnalytics> {
    const queryParams = type ? `?type=${type}` : '';
    const response = await fetch(`${this.baseUrl}/orders${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch order analytics');
    }

    return response.json();
  }

  async getOrderTrends(
    period: 'daily' | 'weekly' | 'monthly',
    days: number
  ): Promise<{
    data: any[];
    totalOrders: number;
    averageOrdersPerDay: number;
  }> {
    const queryParams = new URLSearchParams({
      period,
      days: days.toString()
    });
    
    const response = await fetch(`${this.baseUrl}/orders/trends?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch order trends');
    }

    const data = await response.json();
    const totalOrders = data.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    const averageOrdersPerDay = totalOrders / days;

    return {
      data,
      totalOrders,
      averageOrdersPerDay
    };
  }

  async getVendorAnalytics(type?: string): Promise<any> {
    const queryParams = type ? `?type=${type}` : '';
    const response = await fetch(`${this.baseUrl}/vendors${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch vendor analytics');
    }

    return response.json();
  }

  async getVendorGrowthRate(period: 'monthly' | 'yearly'): Promise<{
    currentMonth: number;
    previousMonth: number;
    growthRate: number;
  }> {
    const response = await fetch(`${this.baseUrl}/vendors/growth?period=${period}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch vendor growth rate');
    }

    const data = await response.json();
    const growthRate = data.previousMonth ? 
      ((data.currentMonth - data.previousMonth) / data.previousMonth) * 100 : 0;

    return {
      ...data,
      growthRate
    };
  }

  async getSeasonalTrends(): Promise<{ data: any[] }> {
    const response = await fetch(`${this.baseUrl}/trends/seasonal`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch seasonal trends');
    }

    return response.json();
  }

  async getHourlyDistribution(): Promise<{ data: any[] }> {
    const response = await fetch(`${this.baseUrl}/trends/hourly`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch hourly distribution');
    }

    return response.json();
  }

  async getPerformanceMetrics(filters?: AnalyticsFilters): Promise<PerformanceMetrics> {
    const queryParams = this.buildQueryParams(filters);
    const response = await fetch(`${this.baseUrl}/performance?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch performance metrics');
    }

    return response.json();
  }

  refreshCache(): void {
    fetch(`${this.baseUrl}/refresh-cache`, {
      method: 'POST',
      headers: this.getHeaders()
    }).catch(console.error);
  }

  private buildQueryParams(filters?: AnalyticsFilters): string {
    if (!filters) return '';
    
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.vendorIds?.length) params.append('vendorIds', filters.vendorIds.join(','));
    if (filters.categoryIds?.length) params.append('categoryIds', filters.categoryIds.join(','));
    if (filters.regions?.length) params.append('regions', filters.regions.join(','));
    if (filters.orderStatuses?.length) params.append('orderStatuses', filters.orderStatuses.join(','));
    
    return params.toString();
  }

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
}

class ExportService {
  private baseUrl = '/api/admin/export';

  async exportData(options: ExportOptions): Promise<void> {
    const queryParams = new URLSearchParams({
      type: options.type,
      format: options.format,
      filters: JSON.stringify(options.filters)
    });

    const response = await fetch(`${this.baseUrl}?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to export data');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.${options.format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
}

// Utility functions
export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const calculateConversionRate = (orders: number, visitors: number): number => {
  if (visitors === 0) return 0;
  return (orders / visitors) * 100;
};

export const predictTrend = (historicalData: number[], periods: number): number[] => {
  if (historicalData.length < 2) return Array(periods).fill(historicalData[0] || 0);
  
  // Simple linear regression for trend prediction
  const n = historicalData.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = historicalData.reduce((sum, val) => sum + val, 0);
  const sumXY = historicalData.reduce((sum, val, index) => sum + index * val, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const predictions = [];
  for (let i = 0; i < periods; i++) {
    const nextValue = slope * (n + i) + intercept;
    predictions.push(Math.max(0, nextValue)); // Ensure non-negative predictions
  }
  
  return predictions;
};

export const analyticsService = new AnalyticsService();
export const exportService = new ExportService();

// Named exports for the functions used in tests
export const getRevenueAnalytics = analyticsService.getRevenueAnalytics.bind(analyticsService);
export const getOrderAnalytics = analyticsService.getOrderAnalytics.bind(analyticsService);
export const getVendorAnalytics = analyticsService.getVendorAnalytics.bind(analyticsService);
export const getOrderTrends = analyticsService.getOrderTrends.bind(analyticsService);
export const getVendorGrowthRate = analyticsService.getVendorGrowthRate.bind(analyticsService);
export const getSeasonalTrends = analyticsService.getSeasonalTrends.bind(analyticsService);
export const getHourlyDistribution = analyticsService.getHourlyDistribution.bind(analyticsService);

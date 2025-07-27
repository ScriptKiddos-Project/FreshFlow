import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
// import DashboardChart from '../components/charts/DashboardChart';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/dataProcessing';
import { exportToExcel, exportToPDF } from '../utils/exportHelpers';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar, 
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Target,
  Zap,
  Globe,
  Clock
} from 'lucide-react';
import type { 
  AnalyticsTimeRange, 
  RevenueMetrics, 
  UserMetrics, 
  OrderMetrics,
  WasteReductionMetrics,
  GeographicData,
  PerformanceMetrics
} from '../types/analytics';

const Analytics: React.FC = () => {
  const { user, hasPermission } = useAdminAuth();
  const {
    revenueMetrics,
    userMetrics,
    orderMetrics,
    wasteReductionMetrics,
    geographicData,
    performanceMetrics,
    loading,
    error,
    fetchAnalytics,
    fetchRevenueData,
    fetchUserGrowthData,
    fetchOrderAnalytics,
    fetchWasteReductionData,
    fetchGeographicData,
    fetchPerformanceData
  } = useAnalytics();

  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'users' | 'orders' | 'waste'>('revenue');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes

  useEffect(() => {
    fetchAnalytics(timeRange);
    fetchRevenueData(timeRange);
    fetchUserGrowthData(timeRange);
    fetchOrderAnalytics(timeRange);
    fetchWasteReductionData(timeRange);
    fetchGeographicData(timeRange);
    fetchPerformanceData();
  }, [timeRange]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAnalytics(timeRange);
        fetchRevenueData(timeRange);
        fetchUserGrowthData(timeRange);
        fetchOrderAnalytics(timeRange);
        fetchWasteReductionData(timeRange);
        fetchGeographicData(timeRange);
        fetchPerformanceData();
      }, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, timeRange]);

  const handleTimeRangeChange = (range: AnalyticsTimeRange) => {
    setTimeRange(range);
  };

  const handleExportData = async (format: 'excel' | 'pdf') => {
    try {
      const analyticsData = [{
        revenueMetrics,
        userMetrics,
        orderMetrics,
        wasteReductionMetrics,
        geographicData,
        performanceMetrics,
        timeRange,
        generatedAt: new Date().toISOString()
      }];

      const config = {
        filename: `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}`,
        format: format === 'excel' ? 'xlsx' as const : 'pdf' as const,
        includeHeaders: true,
        title: 'Analytics Report',
        orientation: 'landscape' as const,
        pageSize: 'A4' as const
      };

      if (format === 'excel') {
        await exportToExcel([analyticsData], config);
      } else {
        await exportToPDF([analyticsData], config);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = (trend: number) => {
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading && !revenueMetrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive business intelligence and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Auto-refresh</span>
            </label>
            <RefreshCw 
              className={`h-4 w-4 ${autoRefresh ? 'animate-spin text-blue-500' : 'text-gray-400'}`} 
            />
          </div>
          
          {hasPermission('export_analytics') && (
            <div className="flex space-x-2">
              <Button
                onClick={() => handleExportData('excel')}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Excel</span>
              </Button>
              <Button
                onClick={() => handleExportData('pdf')}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>PDF</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Time Range Selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Time Period:</span>
          </div>
          <div className="flex space-x-2">
            {(['7d', '30d', '90d', '1y'] as AnalyticsTimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range === '7d' ? 'Last 7 Days' :
                 range === '30d' ? 'Last 30 Days' :
                 range === '90d' ? 'Last 90 Days' :
                 'Last Year'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(revenueMetrics?.totalRevenue || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(revenueMetrics?.growth || 0)}
            <span className={`text-sm font-medium ml-2 ${getTrendColor(revenueMetrics?.growth || 0)}`}>
              {formatPercentage(Math.abs(revenueMetrics?.growth || 0))}%
            </span>
            <span className="text-sm text-gray-600 ml-2">vs previous period</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(userMetrics?.activeUsers || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(userMetrics?.growth || 0)}
            <span className={`text-sm font-medium ml-2 ${getTrendColor(userMetrics?.growth || 0)}`}>
              {formatPercentage(Math.abs(userMetrics?.growth || 0))}%
            </span>
            <span className="text-sm text-gray-600 ml-2">user growth</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(orderMetrics?.totalOrders || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(orderMetrics?.growth || 0)}
            <span className={`text-sm font-medium ml-2 ${getTrendColor(orderMetrics?.growth || 0)}`}>
              {formatPercentage(Math.abs(orderMetrics?.growth || 0))}%
            </span>
            <span className="text-sm text-gray-600 ml-2">order growth</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Waste Reduced</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(wasteReductionMetrics?.reductionPercentage || 0)}%
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              Target: 70%
            </Badge>
          </div>
        </Card>
      </div>

      {/* Chart Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex space-x-2">
              {(['revenue', 'users', 'orders', 'waste'] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    selectedMetric === metric
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Chart Type:</span>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded ${chartType === 'line' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LineChartIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded ${chartType === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded ${chartType === 'pie' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <PieChartIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
          </h3>
          {chartType === 'line' && (
            <LineChart
              data={(selectedMetric === 'revenue' ? revenueMetrics?.chartData || [] :
                    selectedMetric === 'users' ? userMetrics?.chartData || [] :
                    selectedMetric === 'orders' ? orderMetrics?.chartData || [] :
                    wasteReductionMetrics?.chartData || []).map(item => ({
                name: item.date,
                value: selectedMetric === 'revenue' ? (item as any).revenue :
                      selectedMetric === 'users' ? (item as any).users :
                      selectedMetric === 'orders' ? (item as any).orders :
                      (item as any).wasteReduced
              }))}
              lines={[{
                dataKey: 'value',
                color: '#3B82F6',
                name: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
              }]}
              height={350}
            />
          )}
          {chartType === 'bar' && (
            <BarChart
              data={(selectedMetric === 'revenue' ? revenueMetrics?.chartData || [] :
                    selectedMetric === 'users' ? userMetrics?.chartData || [] :
                    selectedMetric === 'orders' ? orderMetrics?.chartData || [] :
                    wasteReductionMetrics?.chartData || []).map(item => ({
                name: item.date,
                value: selectedMetric === 'revenue' ? (item as any).revenue :
                      selectedMetric === 'users' ? (item as any).users :
                      selectedMetric === 'orders' ? (item as any).orders :
                      (item as any).wasteReduced
              }))}
              bars={[{
                dataKey: 'value',
                color: '#10B981',
                name: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
              }]}
              height={350}
            />
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
          <PieChart
            data={geographicData?.map(item => ({
              name: item.location,
              value: item.orders,
              color: item.color || '#3B82F6' // Provide default color when undefined
            })) || []}
            height={350}
          />
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-600">Avg Response Time</span>
              </div>
              <span className="text-sm font-medium">
                {performanceMetrics?.avgResponseTime || 0}ms
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">Success Rate</span>
              </div>
              <span className="text-sm font-medium">
                {formatPercentage(performanceMetrics?.successRate || 0)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">Uptime</span>
              </div>
              <span className="text-sm font-medium">
                {formatPercentage(performanceMetrics?.uptime || 0)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-600">API Calls</span>
              </div>
              <span className="text-sm font-medium">
                {formatNumber(performanceMetrics?.apiCalls || 0)}
              </span>
            </div>
          </div>
        </Card>

        {/* Top Vendors */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h3>
          <div className="space-y-3">
            {revenueMetrics?.topVendors?.slice(0, 5).map((vendor, index) => (
              <div key={vendor.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-xs text-gray-500">{vendor.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(vendor.revenue)}
                  </p>
                  <p className="text-xs text-gray-500">{vendor.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Transaction Fees</span>
                <span className="font-medium">
                  {formatCurrency(revenueMetrics?.transactionFees || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${((revenueMetrics?.transactionFees || 0) / (revenueMetrics?.totalRevenue || 1)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Subscription Fees</span>
                <span className="font-medium">
                  {formatCurrency(revenueMetrics?.subscriptionFees || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${((revenueMetrics?.subscriptionFees || 0) / (revenueMetrics?.totalRevenue || 1)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Premium Features</span>
                <span className="font-medium">
                  {formatCurrency(revenueMetrics?.premiumFees || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ 
                    width: `${((revenueMetrics?.premiumFees || 0) / (revenueMetrics?.totalRevenue || 1)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Analytics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Analytics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Average Order Value
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(orderMetrics?.avgOrderValue || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getTrendColor(orderMetrics?.avgOrderValueGrowth || 0)}>
                      {formatPercentage(Math.abs(orderMetrics?.avgOrderValueGrowth || 0))}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Completion Rate
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatPercentage(orderMetrics?.completionRate || 0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getTrendColor(orderMetrics?.completionRateGrowth || 0)}>
                      {formatPercentage(Math.abs(orderMetrics?.completionRateGrowth || 0))}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Return Rate
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatPercentage(orderMetrics?.returnRate || 0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getTrendColor(-(orderMetrics?.returnRateChange || 0))}>
                      {formatPercentage(Math.abs(orderMetrics?.returnRateChange || 0))}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* User Analytics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Analytics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    New Registrations
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatNumber(userMetrics?.newRegistrations || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getTrendColor(userMetrics?.registrationGrowth || 0)}>
                      {formatPercentage(Math.abs(userMetrics?.registrationGrowth || 0))}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Retention Rate
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatPercentage(userMetrics?.retentionRate || 0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getTrendColor(userMetrics?.retentionGrowth || 0)}>
                      {formatPercentage(Math.abs(userMetrics?.retentionGrowth || 0))}%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Avg Session Duration
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatNumber(userMetrics?.avgSessionDuration || 0)} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={getTrendColor(userMetrics?.sessionDurationGrowth || 0)}>
                      {formatPercentage(Math.abs(userMetrics?.sessionDurationGrowth || 0))}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Waste Reduction Impact */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Food Waste Reduction Impact</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatNumber(wasteReductionMetrics?.totalKgSaved || 0)} kg
            </p>
            <p className="text-sm text-gray-600">Food Saved</p>
          </div>
          
          <div className="text-center">
            <div className="h-16 w-16 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(wasteReductionMetrics?.moneySaved || 0)}
            </p>
            <p className="text-sm text-gray-600">Money Saved</p>
          </div>
          
          <div className="text-center">
            <div className="h-16 w-16 bg-purple-100 rounded-full mx-auto mb-2 flex items-center justify-center">
              <Globe className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {formatNumber(wasteReductionMetrics?.co2Reduced || 0)} kg
            </p>
            <p className="text-sm text-gray-600">CO₂ Reduced</p>
          </div>
          
          <div className="text-center">
            <div className="h-16 w-16 bg-yellow-100 rounded-full mx-auto mb-2 flex items-center justify-center">
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {formatNumber(wasteReductionMetrics?.vendorsHelped || 0)}
            </p>
            <p className="text-sm text-gray-600">Vendors Helped</p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
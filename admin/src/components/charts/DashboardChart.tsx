import React, { useState } from 'react';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import LineChart from './LineChart';
import BarChart from './BarChart';
import PieChart from './PieChart';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Package,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface DashboardChartProps {
  className?: string;
}

const DashboardChart: React.FC<DashboardChartProps> = ({ className = '' }) => {
  const {
    loading,
    lastUpdated 
  } = useAnalyticsStore();
  
  const { metrics, isConnected } = useRealTimeData();
  
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedChart, setSelectedChart] = useState<'revenue' | 'users' | 'orders' | 'categories'>('revenue');

  // Mock data for demonstration (replace with real data from stores)
  const mockRevenueData = [
    { name: 'Week 1', revenue: 12000, orders: 45, users: 23 },
    { name: 'Week 2', revenue: 19000, orders: 67, users: 34 },
    { name: 'Week 3', revenue: 15000, orders: 52, users: 28 },
    { name: 'Week 4', revenue: 22000, orders: 78, users: 42 },
    { name: 'Week 5', revenue: 18000, orders: 61, users: 36 },
    { name: 'Week 6', revenue: 25000, orders: 89, users: 51 },
    { name: 'Week 7', revenue: 21000, orders: 73, users: 44 }
  ];

  const mockCategoryData = [
    { name: 'Vegetables', value: 35, color: '#10b981' },
    { name: 'Fruits', value: 25, color: '#f59e0b' },
    { name: 'Spices', value: 20, color: '#3b82f6' },
    { name: 'Dairy', value: 12, color: '#ef4444' },
    { name: 'Others', value: 8, color: '#8b5cf6' }
  ];

  const mockVendorPerformance = [
    { name: 'Top Vendors', active: 23, inactive: 5 },
    { name: 'Mid Vendors', active: 34, inactive: 12 },
    { name: 'New Vendors', active: 15, inactive: 8 }
  ];

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const chartOptions = [
    { value: 'revenue', label: 'Revenue Trends', icon: DollarSign },
    { value: 'users', label: 'User Growth', icon: Users },
    { value: 'orders', label: 'Order Volume', icon: ShoppingCart },
    { value: 'categories', label: 'Category Distribution', icon: PieChartIcon }
  ];

  const handleExport = () => {
    // Implementation for exporting chart data
    console.log('Exporting chart data...');
  };

  const handleRefresh = () => {
    // Implementation for refreshing data
    console.log('Refreshing data...');
  };

  const renderMetricCard = (title: string, value: number, change: number, icon: React.ComponentType<{ className?: string }>) => {
    const Icon = icon;
    const isPositive = change >= 0;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {title.includes('Revenue') ? `₹${value.toLocaleString()}` : value.toLocaleString()}
            </p>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="mt-2 flex items-center">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{change}%
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">vs last period</span>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (selectedChart) {
      case 'revenue':
        return (
          <LineChart
            data={mockRevenueData}
            lines={[
              { dataKey: 'revenue', color: '#3b82f6', name: 'Revenue (₹)' },
              { dataKey: 'orders', color: '#10b981', name: 'Orders' },
            ]}
            height={350}
            formatTooltip={(value, name) => {
              if (name.includes('Revenue')) {
                return [`₹${value.toLocaleString()}`, name];
              }
              return [value.toString(), name];
            }}
          />
        );
      
      case 'users':
        return (
          <BarChart
            data={mockRevenueData}
            bars={[
              { dataKey: 'users', color: '#8b5cf6', name: 'New Users' }
            ]}
            height={350}
          />
        );
      
      case 'orders':
        return (
          <BarChart
            data={mockVendorPerformance}
            bars={[
              { dataKey: 'active', color: '#10b981', name: 'Active Orders', stackId: 'orders' },
              { dataKey: 'inactive', color: '#ef4444', name: 'Cancelled Orders', stackId: 'orders' }
            ]}
            height={350}
          />
        );
      
      case 'categories':
        return (
          <PieChart
            data={mockCategoryData}
            height={350}
            innerRadius={60}
            centerContent={
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mockCategoryData.reduce((sum, item) => sum + item.value, 0)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Categories
                </div>
              </div>
            }
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCard('Total Revenue', metrics.totalRevenue, 12.5, DollarSign)}
        {renderMetricCard('Active Users', metrics.activeUsers, 8.2, Users)}
        {renderMetricCard('Total Orders', metrics.totalOrders, -2.1, ShoppingCart)}
        {renderMetricCard('Active Listings', metrics.activeListings, 15.7, Package)}
      </div>

      {/* Chart Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Analytics Dashboard
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time insights and trends
                {!isConnected && (
                  <span className="ml-2 text-red-500">(Offline - Data may be outdated)</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={handleExport}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Export data"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Chart Type Selector */}
          <div className="mt-4 flex flex-wrap gap-2">
            {chartOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedChart(option.value as any)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    selectedChart === option.value
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-80">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart data...</p>
              </div>
            </div>
          ) : (
            renderChart()
          )}
        </div>

        {/* Chart Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>
              Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
            </span>
            <span>
              Data range: {timeRangeOptions.find(opt => opt.value === selectedTimeRange)?.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardChart;
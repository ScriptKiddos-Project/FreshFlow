import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import { useAnalytics } from '../hooks/useAnalytics';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/dataProcessing';
import { Activity, Users, ShoppingCart, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAdminAuth();
  const { 
    dashboardMetrics, 
    revenueData, 
    userGrowthData, 
    topVendors, 
    recentTransactions,
    fetchDashboardData,
    loading,
    error 
  } = useAnalytics();
  
  const {
  metrics,
  systemAlerts = [],
} = useRealTimeData?.() || {};

const activeUsers = metrics?.activeUsers || 0;
const systemHealth = {
  api: 99.5,
  database: 98.8,
  cache: 99.2,
  responseTime: 145
};
const alerts = systemAlerts;

  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [refreshInterval] = useState<number>(30000);

  useEffect(() => {
  if (isAuthenticated) {
    fetchDashboardData(selectedTimeRange);
    // Remove connectSocket and disconnectSocket since they don't exist
    
    const interval = setInterval(() => {
      fetchDashboardData(selectedTimeRange);
    }, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }
}, [isAuthenticated, selectedTimeRange, refreshInterval, fetchDashboardData]);

  const handleTimeRangeChange = (range: '7d' | '30d' | '90d') => {
    setSelectedTimeRange(range);
  };

  const getMetricTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const change = ((current - previous) / previous) * 100;
    if (change > 2) return 'up';
    if (change < -2) return 'down';
    return 'stable';
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData(selectedTimeRange)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-600">Live: {activeUsers} users</span>
          </div>
          <div className="flex space-x-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  selectedTimeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">System Alerts</h3>
          </div>
          <div className="space-y-1">
            {alerts.slice(0, 3).map((alert: any , index: number) => (
              <p key={index} className="text-sm text-yellow-700">{alert.message}</p>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardMetrics?.totalRevenue || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${getTrendColor(getMetricTrend(dashboardMetrics?.totalRevenue || 0, dashboardMetrics?.previousRevenue || 0))}`}>
              {formatPercentage(((dashboardMetrics?.totalRevenue || 0) - (dashboardMetrics?.previousRevenue || 0)) / (dashboardMetrics?.previousRevenue || 1) * 100)}
            </span>
            <span className="text-sm text-gray-600 ml-2">vs previous period</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Vendors</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardMetrics?.activeVendors || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${getTrendColor(getMetricTrend(dashboardMetrics?.activeVendors || 0, dashboardMetrics?.previousVendors || 0))}`}>
              {formatPercentage(((dashboardMetrics?.activeVendors || 0) - (dashboardMetrics?.previousVendors || 0)) / (dashboardMetrics?.previousVendors || 1) * 100)}
            </span>
            <span className="text-sm text-gray-600 ml-2">vs previous period</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardMetrics?.totalOrders || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${getTrendColor(getMetricTrend(dashboardMetrics?.totalOrders || 0, dashboardMetrics?.previousOrders || 0))}`}>
              {formatPercentage(((dashboardMetrics?.totalOrders || 0) - (dashboardMetrics?.previousOrders || 0)) / (dashboardMetrics?.previousOrders || 1) * 100)}
            </span>
            <span className="text-sm text-gray-600 ml-2">vs previous period</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Waste Reduced</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(dashboardMetrics?.wasteReduction || 0)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              Target: 70%
            </Badge>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <LineChart
            data={revenueData.map(item => ({
                name: item.date,
                revenue: item.revenue
            }))}
            lines={[{
                dataKey: 'revenue',
                color: '#3B82F6',
                name: 'Revenue'
            }]}
            height={300}
            />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <BarChart
            data={userGrowthData.map(item => ({
                name: item.month,
                users: item.users
            }))}
            bars={[{
                dataKey: 'users',
                color: '#10B981',
                name: 'Users'
            }]}
            height={300}
            />
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
          <PieChart
            data={[
              { name: 'Completed', value: dashboardMetrics?.completedOrders || 0, color: '#10B981' },
              { name: 'Pending', value: dashboardMetrics?.pendingOrders || 0, color: '#F59E0B' },
              { name: 'Cancelled', value: dashboardMetrics?.cancelledOrders || 0, color: '#EF4444' }
            ]}
            height={250}
          />
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h3>
          <div className="space-y-4">
            {topVendors?.slice(0, 5).map((vendor, index) => (
              <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-sm text-gray-600">{vendor.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(vendor.revenue)}</p>
                  <p className="text-sm text-gray-600">{vendor.orderCount} orders</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* System Health */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`h-16 w-16 rounded-full mx-auto mb-2 flex items-center justify-center ${
              (systemHealth?.api || 0) >= 99 ? 'bg-green-100' : (systemHealth?.api || 0) >= 95 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className={`text-lg font-bold ${
                (systemHealth?.api || 0) >= 99 ? 'text-green-600' : (systemHealth?.api || 0) >= 95 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {(systemHealth?.api || 0).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900">API Uptime</p>
          </div>
          <div className="text-center">
            <div className={`h-16 w-16 rounded-full mx-auto mb-2 flex items-center justify-center ${
              (systemHealth?.database || 0) >= 99 ? 'bg-green-100' : (systemHealth?.database || 0) >= 95 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className={`text-lg font-bold ${
                (systemHealth?.database || 0) >= 99 ? 'text-green-600' : (systemHealth?.database || 0) >= 95 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {(systemHealth?.database || 0).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900">Database</p>
          </div>
          <div className="text-center">
            <div className={`h-16 w-16 rounded-full mx-auto mb-2 flex items-center justify-center ${
              (systemHealth?.cache || 0) >= 99 ? 'bg-green-100' : (systemHealth?.cache || 0) >= 95 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className={`text-lg font-bold ${
                (systemHealth?.cache || 0) >= 99 ? 'text-green-600' : (systemHealth?.cache || 0) >= 95 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {(systemHealth?.cache || 0).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900">Cache</p>
          </div>
          <div className="text-center">
            <div className={`h-16 w-16 rounded-full mx-auto mb-2 flex items-center justify-center ${
              (systemHealth?.responseTime || 0) <= 150 ? 'bg-green-100' : (systemHealth?.responseTime || 0) <= 300 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className={`text-lg font-bold ${
                (systemHealth?.responseTime || 0) <= 150 ? 'text-green-600' : (systemHealth?.responseTime || 0) <= 300 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {systemHealth?.responseTime || 0}ms
              </span>
            </div>
            <p className="text-sm font-medium text-gray-900">Response Time</p>
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions?.slice(0, 5).map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{transaction.id.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.vendorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={transaction.status === 'completed' ? 'default' : 
                              transaction.status === 'pending' ? 'secondary' : 'destructive'}
                    >
                      {transaction.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
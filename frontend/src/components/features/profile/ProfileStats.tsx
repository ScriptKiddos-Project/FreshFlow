import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, ShoppingCart, Star, Clock, Target } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatDate } from '@/utils/formatters';

export const ProfileStats: React.FC = () => {
  const { user } = useAuthStore();

  const stats = [
    {
      title: 'Total Revenue',
      value: formatCurrency(user?.totalEarnings || 0),
      change: '+12.5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Active Listings',
      value: user?.activeListings || 0,
      change: '+3 this week',
      trend: 'up',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Orders',
      value: user?.totalOrders || 0,
      change: '+8 this week',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Average Rating',
      value: (user?.averageRating || 0).toFixed(1),
      change: '4.8/5.0',
      trend: 'stable',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  const recentActivity = [
    {
      type: 'order',
      title: 'New order received',
      description: 'Fresh tomatoes - 5kg',
      time: '2 hours ago',
      amount: '₹450'
    },
    {
      type: 'listing',
      title: 'Listing updated',
      description: 'Reduced price on onions',
      time: '4 hours ago',
      amount: null
    },
    {
      type: 'payment',
      title: 'Payment received',
      description: 'Order #FF-1234',
      time: '6 hours ago',
      amount: '₹1,250'
    },
    {
      type: 'review',
      title: 'New review received',
      description: '5 stars for fresh vegetables',
      time: '1 day ago',
      amount: null
    }
  ];

  const monthlyData = [
    { month: 'Jan', revenue: 15000, orders: 45 },
    { month: 'Feb', revenue: 18000, orders: 52 },
    { month: 'Mar', revenue: 22000, orders: 61 },
    { month: 'Apr', revenue: 25000, orders: 68 },
    { month: 'May', revenue: 28000, orders: 75 },
    { month: 'Jun', revenue: 32000, orders: 82 }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case 'listing':
        return <Package className="w-4 h-4 text-green-500" />;
      case 'payment':
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'review':
        return <Star className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs ${stat.color} mt-1`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data) => (
                <div key={data.month} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">{data.month}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(data.revenue)}</p>
                      <p className="text-xs text-gray-500">{data.orders} orders</p>
                    </div>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(data.revenue / 35000) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                  {activity.amount && (
                    <div className="text-sm font-medium text-green-600">
                      {activity.amount}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Response Rate</span>
                <span className="text-sm font-medium">95%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Order Fulfillment</span>
                <span className="text-sm font-medium">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Customer Satisfaction</span>
                <span className="text-sm font-medium">4.8/5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '96%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Account Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since</span>
                  <span>{formatDate(user?.createdAt || new Date())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Type</span>
                  <span className="capitalize">{user?.accountType || 'Standard'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Verification Status</span>
                  <span className={user?.isVerified ? 'text-green-600' : 'text-orange-600'}>
                    {user?.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profile Completion</span>
                  <span>85%</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Business Insights</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Selling Item</span>
                  <span>Fresh Tomatoes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Peak Sales Day</span>
                  <span>Saturday</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Order Value</span>
                  <span>₹850</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Repeat Customers</span>
                  <span>68%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
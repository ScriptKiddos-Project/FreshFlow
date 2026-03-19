import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Plus,
  AlertTriangle,
  Users,
  Eye,
  RefreshCw
} from 'lucide-react'

import { DashboardLayout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle,  } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
// import { useInventory } from '@/store'
import { useSocket } from '@/hooks/useSocket'

// Mock data - replace with real API calls
const mockStats = {
  totalRevenue: 15420,
  revenueChange: 12.5,
  activeListings: 23,
  listingsChange: -2.1,
  pendingOrders: 8,
  ordersChange: 25.0,
  wasteReduced: 45.2,
  wasteChange: 18.3,
}

const mockRecentOrders = [
  {
    id: '1',
    buyer: 'Raj\'s Tiffin Center',
    items: 'Tomatoes, Onions',
    amount: 320,
    status: 'pending',
    time: '2 min ago'
  },
  {
    id: '2',
    buyer: 'Mumbai Street Foods',
    items: 'Potatoes, Carrots',
    amount: 150,
    status: 'confirmed',
    time: '15 min ago'
  },
  {
    id: '3',
    buyer: 'Spice Garden',
    items: 'Green Chilies',
    amount: 80,
    status: 'completed',
    time: '1 hour ago'
  }
]

const mockExpiringItems = [
  {
    id: '1',
    name: 'Fresh Tomatoes',
    quantity: 5,
    unit: 'kg',
    expiryDate: 'Today',
    price: 40,
    image: 'https://images.unsplash.com/photo-1546470427-e2e1ed4a8dce?w=100&h=100&fit=crop&crop=center'
  },
  {
    id: '2',
    name: 'Green Chilies',
    quantity: 2,
    unit: 'kg',
    expiryDate: 'Tomorrow',
    price: 60,
    image: 'https://images.unsplash.com/photo-1583742892800-4eb57e9b8117?w=100&h=100&fit=crop&crop=center'
  },
  {
    id: '3',
    name: 'Coriander Leaves',
    quantity: 1,
    unit: 'kg',
    expiryDate: 'In 2 days',
    price: 80,
    image: 'https://images.unsplash.com/photo-1591181520189-abcb0735c65d?w=100&h=100&fit=crop&crop=center'
  }
]

const mockPriceTrends = [
  { name: 'Tomatoes', current: 40, previous: 45, trend: 'down' },
  { name: 'Onions', current: 35, previous: 30, trend: 'up' },
  { name: 'Potatoes', current: 25, previous: 25, trend: 'stable' },
  { name: 'Carrots', current: 50, previous: 55, trend: 'down' },
]

const VendorDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const {  } = useSocket()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'confirmed': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />
      default: return <div className="h-4 w-4" />
    }
  }

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name?.split(' ')[0] || 'Vendor'}!`}
      subtitle={`${currentTime.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })} • ${currentTime.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`}
      actions={
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/inventory?action=add">
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{mockStats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-full ${mockStats.revenueChange > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <DollarSign className={`h-6 w-6 ${mockStats.revenueChange > 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {mockStats.revenueChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${mockStats.revenueChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(mockStats.revenueChange)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.activeListings}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {mockStats.listingsChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${mockStats.listingsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(mockStats.listingsChange)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.pendingOrders}</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100">
                  <ShoppingCart className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">
                  {mockStats.ordersChange}%
                </span>
                <span className="text-sm text-gray-500 ml-1">from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Waste Reduced</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.wasteReduced}kg</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">
                  {mockStats.wasteChange}%
                </span>
                <span className="text-sm text-gray-500 ml-1">this month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expiring Items Alert */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Items Expiring Soon
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/inventory?filter=expiring">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockExpiringItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.quantity} {item.unit} • Expires {item.expiryDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{item.price}/{item.unit}</p>
                      <Button size="xs" variant="outline" className="mt-1">
                        Quick Sell
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {mockExpiringItems.length === 0 && (
                <p className="text-center text-gray-500 py-4">No items expiring soon! 🎉</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-start" asChild>
                  <Link to="/inventory?action=add">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Ingredient
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/marketplace">
                    <Package className="h-4 w-4 mr-2" />
                    Browse Marketplace
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/orders">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Manage Orders
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/analytics">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders and Price Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/orders">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{order.buyer}</h4>
                        <p className="text-sm text-gray-600">{order.items}</p>
                        <p className="text-xs text-gray-500">{order.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{order.amount}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Price Trends */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Market Price Trends</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/trends">View Details</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPriceTrends.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">₹{item.current}/kg</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(item.trend)}
                      <span className="text-sm font-medium text-gray-600">
                        ₹{item.previous}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">This Week's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₹2,450</div>
                <div className="text-sm text-gray-600">Revenue Generated</div>
                <div className="text-xs text-green-500 mt-1">+15% from last week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">18</div>
                <div className="text-sm text-gray-600">Orders Completed</div>
                <div className="text-xs text-blue-500 mt-1">+22% from last week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">12.5kg</div>
                <div className="text-sm text-gray-600">Waste Prevented</div>
                <div className="text-xs text-purple-500 mt-1">+30% from last week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">4.2</div>
                <div className="text-sm text-gray-600">Avg Rating</div>
                <div className="text-xs text-orange-500 mt-1">+0.3 from last week</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default VendorDashboard
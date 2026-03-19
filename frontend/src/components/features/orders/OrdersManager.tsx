import React, { useState } from 'react';
import { Package, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrdersList } from './OrdersList';
import { OrderDetails } from './OrderDetails';
import { useOrderStore } from '@/store/orderStore';

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export const OrdersManager: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  const { 
    orders, 
    loading, 
    fetchOrders,
    getOrdersByStatus,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders
  } = useOrderStore();

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : getOrdersByStatus(selectedStatus);

  const statusOptions = [
    { value: 'all', label: 'All Orders', count: totalOrders },
    { value: 'pending', label: 'Pending', count: pendingOrders },
    { value: 'confirmed', label: 'Confirmed', count: orders.filter(o => o.status === 'confirmed').length },
    { value: 'delivered', label: 'Delivered', count: completedOrders },
    { value: 'cancelled', label: 'Cancelled', count: cancelledOrders }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600">Track your purchases and sales</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{cancelledOrders}</div>
            <p className="text-xs text-muted-foreground">Cancelled orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filter Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedStatus === option.value ? 'default' : 'outline'}
                onClick={() => setSelectedStatus(option.value as OrderStatus)}
                className="relative"
              >
                {option.label}
                <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {option.count}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OrdersList
            orders={filteredOrders}
            loading={loading}
            onSelectOrder={setSelectedOrderId}
            selectedOrderId={selectedOrderId}
          />
        </div>
        
        <div className="lg:col-span-1">
          {selectedOrderId ? (
            <OrderDetails
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select an order to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
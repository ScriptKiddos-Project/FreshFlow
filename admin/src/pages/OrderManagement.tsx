import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, CheckCircle, XCircle, Clock, Package, RefreshCw } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { useRealTimeData } from '../hooks/useRealTimeData';
import OrderTable from '../components/tables/OrderTable';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialoge';
import { exportToExcel, ExportConfig } from '../utils/exportHelpers';
import { getDateRange, formatDate, formatDateTime, DateRangeType } from '../utils/dateUtils';
import type { Order, OrderStatus } from '../types/admin';

const OrderManagement: React.FC = () => {
  const { 
    orders, 
    totalOrders, 
    isLoading, 
    fetchOrders, 
    updateOrderStatus,
    getOrderDetails,
    filterOrders,
    searchOrders
  } = useOrderStore();

  const { connectToOrderUpdates } = useRealTimeData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Real-time connection for order updates
  useEffect(() => {
    connectToOrderUpdates();
    fetchOrders({ page: currentPage, limit: pageSize });
  }, [currentPage, pageSize, connectToOrderUpdates, fetchOrders]);

  // Handle search and filters
  useEffect(() => {
    const filters: any = {  // Add 'any' type to bypass strict typing
    search: searchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
    dateRange: getDateRange(dateFilter as DateRangeType),
    page: currentPage,
    limit: pageSize
    };
    
    if (searchQuery) {
      searchOrders(searchQuery);
    } else {
      filterOrders(filters);
    }
  }, [searchQuery, statusFilter, dateFilter, currentPage, searchOrders, filterOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleViewDetails = async (orderId: string) => {
    try {
      const orderDetails = await getOrderDetails(orderId);
      setSelectedOrder(orderDetails);
      setShowOrderDetails(true);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    }
  };

  const handleExportOrders = () => {
    const exportData = orders.map((order: Order) => ({
      'Order ID': order.id,
      'Buyer': order.buyerName,
      'Seller': order.sellerName,
      'Ingredient': order.ingredientName,
      'Quantity': `${order.quantity} ${order.unit}`,
      'Total Amount': `₹${order.totalAmount}`,
      'Status': order.status,
      'Order Date': formatDate(order.createdAt),
      'Delivery Date': order.deliveryDate ? formatDate(order.deliveryDate) : 'N/A'
    }));

    const config: ExportConfig = {
        filename: `orders_${formatDate(new Date())}.xlsx`,
        format: 'xlsx',
        includeHeaders: true,  // This includes headers in the export
    };

    exportToExcel(exportData, config);
  };

  const getStatusStats = () => {
  const stats = orders.reduce((acc: Record<OrderStatus, number>, order: Order) => {
    // Initialize count for the status if it does not exist yet
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<OrderStatus, number>);

  return [
    { label: 'Pending', value: stats.pending || 0, color: 'bg-yellow-500', icon: Clock },
    { label: 'Confirmed', value: stats.confirmed || 0, color: 'bg-blue-500', icon: CheckCircle },
    { label: 'In Transit', value: stats.in_transit || 0, color: 'bg-purple-500', icon: Package },
    { label: 'Delivered', value: stats.delivered || 0, color: 'bg-green-500', icon: CheckCircle },
    { label: 'Cancelled', value: stats.cancelled || 0, color: 'bg-red-500', icon: XCircle }
  ];
};

  const statusStats = getStatusStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all platform orders</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => fetchOrders({ page: currentPage, limit: pageSize })}
            variant="outline"
            className="flex items-center space-x-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={handleExportOrders}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            <span>Export Orders</span>
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statusStats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search orders, buyers, sellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">
              {totalOrders} total orders
            </span>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <OrderTable
        //   orders={[orders]}
          loading={isLoading}
          onStatusUpdate={handleStatusUpdate}
          onViewOrder={handleViewDetails}
          currentPage={currentPage}
          pageSize={pageSize}
          totalOrders={totalOrders}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* Order Details Modal */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <p className="text-gray-600">Order ID: {selectedOrder.id}</p>
                </div>
                <Badge 
                  variant={selectedOrder.status === 'delivered' ? 'success' : 
                          selectedOrder.status === 'cancelled' ? 'destructive' : 'default'}
                >
                  {selectedOrder.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Buyer Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedOrder.buyerName}</p>
                      <p><span className="font-medium">Phone:</span> {selectedOrder.buyerPhone}</p>
                      <p><span className="font-medium">Location:</span> {selectedOrder.buyerLocation}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Seller Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedOrder.sellerName}</p>
                      <p><span className="font-medium">Phone:</span> {selectedOrder.sellerPhone}</p>
                      <p><span className="font-medium">Location:</span> {selectedOrder.sellerLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Order Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Ingredient:</span> {selectedOrder.ingredientName}</p>
                      <p><span className="font-medium">Quantity:</span> {selectedOrder.quantity} {selectedOrder.unit}</p>
                      <p><span className="font-medium">Unit Price:</span> ₹{selectedOrder.unitPrice}</p>
                      <p><span className="font-medium">Total Amount:</span> ₹{selectedOrder.totalAmount}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Order Date:</span> {formatDateTime(selectedOrder.createdAt)}</p>
                      {selectedOrder.confirmedAt && (
                        <p><span className="font-medium">Confirmed:</span> {formatDateTime(selectedOrder.confirmedAt)}</p>
                      )}
                      {selectedOrder.deliveryDate && (
                        <p><span className="font-medium">Delivery Date:</span> {formatDate(selectedOrder.deliveryDate)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetails(false)}
                >
                  Close
                </Button>
                {selectedOrder.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedOrder.id, 'cancelled')}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Cancel Order
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(selectedOrder.id, 'confirmed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirm Order
                    </Button>
                  </>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'in_transit')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Mark In Transit
                  </Button>
                )}
                {selectedOrder.status === 'in_transit' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'delivered')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark Delivered
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
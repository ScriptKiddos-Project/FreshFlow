import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  RefreshCw,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Package
} from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatCurrency, formatDate } from '../../utils/dateUtils';
import { OrderStatus } from '@/types/admin';

interface Order {
  id: string;
  orderId: string;
  buyerName: string;
  sellerName: string;
  ingredient: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
  orderDate: string;
  deliveryDate?: string;
  location: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  buyerId: string;
  sellerId: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
}

interface OrderTableProps {
  orders?: Order[];
  loading?: boolean;
  onViewOrder?: (orderId: string) => void;
  onStatusUpdate?: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onExportData?: () => void;
  onRefresh?: () => void;
  currentPage: number; // Expecting currentPage to be of type number
  pageSize: number; // Expecting pageSize to be a number as well
  totalOrders: number; // Expecting totalOrders to be a number
  onPageChange: (page: number) => void; // Expecting onPageChange to receive a number
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders = [],
  loading = false,
  onViewOrder,
  onStatusUpdate,
  onExportData,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Order>('orderDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { trackEvent } = useAnalytics();

  // Status configuration
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    in_transit: { color: 'bg-purple-100 text-purple-800', icon: Package },
    delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
  };

  const paymentStatusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800' },
    paid: { color: 'bg-green-100 text-green-800' },
    failed: { color: 'bg-red-100 text-red-800' },
    refunded: { color: 'bg-gray-100 text-gray-800' }
  };

  const priorityConfig = {
    low: { color: 'bg-gray-100 text-gray-800' },
    medium: { color: 'bg-yellow-100 text-yellow-800' },
    high: { color: 'bg-red-100 text-red-800' }
  };

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const matchesSearch = 
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.ingredient.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort orders
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return -1;
        if (bValue === undefined) return 1;
        return aValue > bValue ? 1 : -1;
      } else {
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredAndSortedOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: keyof Order) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    trackEvent('admin_order_table_sort', { field, direction: sortDirection });
  };

  const handleViewOrder = (orderId: string) => {
    trackEvent('admin_view_order', { orderId });
    onViewOrder?.(orderId);
  };

  const handleStatusUpdate = (orderId: string, newStatus: OrderStatus) => {
    trackEvent('admin_update_order_status', { orderId, newStatus });
    onStatusUpdate?.(orderId, newStatus);
  };

  const handleExport = () => {
    trackEvent('admin_export_orders', { count: filteredAndSortedOrders.length });
    onExportData?.();
  };

  const handleRefresh = () => {
    trackEvent('admin_refresh_orders');
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading orders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Order Management</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search orders, buyers, sellers, or ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {paginatedOrders.length} of {filteredAndSortedOrders.length} orders
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  <button
                    onClick={() => handleSort('orderId')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Order ID</span>
                    {sortField === 'orderId' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  <button
                    onClick={() => handleSort('buyerName')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Buyer</span>
                    {sortField === 'buyerName' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  <button
                    onClick={() => handleSort('sellerName')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Seller</span>
                    {sortField === 'sellerName' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Ingredient</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  <button
                    onClick={() => handleSort('totalAmount')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Amount</span>
                    {sortField === 'totalAmount' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Payment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  <button
                    onClick={() => handleSort('orderDate')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Date</span>
                    {sortField === 'orderDate' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-blue-600">{order.orderId}</span>
                        <Badge className={`mt-1 w-fit ${priorityConfig[order.priority].color}`}>
                          {order.priority}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.buyerName}</span>
                        <span className="text-sm text-gray-500">{order.location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{order.sellerName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.ingredient}</span>
                        <span className="text-sm text-gray-500">
                          {order.quantity} {order.unit} @ {formatCurrency(order.pricePerUnit)}/{order.unit}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`flex items-center space-x-1 ${statusConfig[order.status].color}`}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{order.status.replace('_', ' ')}</span>
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={paymentStatusConfig[order.paymentStatus].color}>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm">{formatDate(order.orderDate)}</span>
                        {order.deliveryDate && (
                          <span className="text-xs text-gray-500">
                            Delivery: {formatDate(order.deliveryDate)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order.id)}
                          className="p-1"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <div className="relative group">
                          <Button variant="ghost" size="sm" className="p-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <div className="py-2 min-w-[150px]">
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                >
                                  Confirm Order
                                </button>
                              )}
                              {order.status === 'confirmed' && (
                                <button
                                  onClick={() => handleStatusUpdate(order.id, 'in_transit')}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                >
                                  Mark In Transit
                                </button>
                              )}
                              {order.status === 'in_transit' && (
                                <button
                                  onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                >
                                  Mark Delivered
                                </button>
                              )}
                              <button
                                onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              >
                                Cancel Order
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAndSortedOrders.length === 0 && (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Orders will appear here once vendors start trading'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderTable;
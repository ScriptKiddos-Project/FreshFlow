import React, { useState, useEffect } from 'react';
import { Search, Eye, Phone, MessageSquare, Truck, Clock, CheckCircle, XCircle, Package, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useAuthStore } from '../../store/authStore';

interface OrderItem {
 id: string;
 name: string;
 quantity: number;
 unit: string;
 price: number;
 image: string;
}

interface Order {
 id: string;
 orderNumber: string;
 buyerName: string;
 buyerPhone: string;
 buyerLocation: string;
 items: OrderItem[];
 totalAmount: number;
 status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
 orderDate: string;
 requestedDeliveryDate?: string;
 actualDeliveryDate?: string;
 notes?: string;
 paymentStatus: 'pending' | 'paid' | 'failed';
 paymentMethod?: 'cash' | 'upi' | 'card';
 rating?: number;
 review?: string;
}

interface OrderStats {
 totalOrders: number;
 pendingOrders: number;
 completedToday: number;
 totalRevenue: number;
 averageOrderValue: number;
 cancelledOrders: number;
}

export const Orders: React.FC = () => {
 const [orders, setOrders] = useState<Order[]>([]);
 const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [filterStatus, setFilterStatus] = useState<'all' | Order['status']>('all');
 const [filterPayment, setFilterPayment] = useState<'all' | Order['paymentStatus']>('all');
 const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState<OrderStats>({
   totalOrders: 0,
   pendingOrders: 0,
   completedToday: 0,
   totalRevenue: 0,
   averageOrderValue: 0,
   cancelledOrders: 0
 });

 const {  } = useAuthStore();

 useEffect(() => {
   loadOrders();
   loadStats();
 }, []);

 const loadOrders = async () => {
   setLoading(true);
   try {
     // Mock data - replace with actual API call
     const mockOrders: Order[] = [
       {
         id: '1',
         orderNumber: 'ORD-001',
         buyerName: 'Priya Sharma',
         buyerPhone: '+91 98765 43210',
         buyerLocation: 'Bandra West, Mumbai',
         items: [
           {
             id: '1',
             name: 'Fresh Tomatoes',
             quantity: 2,
             unit: 'kg',
             price: 35,
             image: '/api/placeholder/60/60'
           },
           {
             id: '2',
             name: 'Green Chillies',
             quantity: 0.5,
             unit: 'kg',
             price: 50,
             image: '/api/placeholder/60/60'
           }
         ],
         totalAmount: 95,
         status: 'pending',
         orderDate: '2024-07-26T10:30:00Z',
         requestedDeliveryDate: '2024-07-26T16:00:00Z',
         notes: 'Please select fresh pieces',
         paymentStatus: 'pending',
         paymentMethod: 'upi'
       },
       {
         id: '2',
         orderNumber: 'ORD-002',
         buyerName: 'Rahul Mehta',
         buyerPhone: '+91 87654 32109',
         buyerLocation: 'Andheri East, Mumbai',
         items: [
           {
             id: '3',
             name: 'Basmati Rice',
             quantity: 5,
             unit: 'kg',
             price: 95,
             image: '/api/placeholder/60/60'
           }
         ],
         totalAmount: 475,
         status: 'confirmed',
         orderDate: '2024-07-26T09:15:00Z',
         requestedDeliveryDate: '2024-07-26T18:00:00Z',
         paymentStatus: 'paid',
         paymentMethod: 'upi'
       },
       {
         id: '3',
         orderNumber: 'ORD-003',
         buyerName: 'Sneha Patel',
         buyerPhone: '+91 76543 21098',
         buyerLocation: 'Juhu, Mumbai',
         items: [
           {
             id: '4',
             name: 'Paneer',
             quantity: 1,
             unit: 'kg',
             price: 320,
             image: '/api/placeholder/60/60'
           }
         ],
         totalAmount: 320,
         status: 'delivered',
         orderDate: '2024-07-25T14:20:00Z',
         actualDeliveryDate: '2024-07-25T17:30:00Z',
         paymentStatus: 'paid',
         paymentMethod: 'cash',
         rating: 5,
         review: 'Excellent quality paneer!'
       }
     ];
     
     setOrders(mockOrders);
   } catch (error) {
     console.error('Failed to load orders:', error);
   } finally {
     setLoading(false);
   }
 };

 const loadStats = async () => {
   // Mock stats - replace with actual API call
   const mockStats: OrderStats = {
     totalOrders: 25,
     pendingOrders: 3,
     completedToday: 8,
     totalRevenue: 12500,
     averageOrderValue: 285,
     cancelledOrders: 2
   };
   setStats(mockStats);
 };

 const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
   try {
     setOrders(prev => prev.map(order => 
       order.id === orderId 
         ? { ...order, status: newStatus, actualDeliveryDate: newStatus === 'delivered' ? new Date().toISOString() : order.actualDeliveryDate }
         : order
     ));
     
     // In production, make API call
     console.log(`Updated order ${orderId} to ${newStatus}`);
   } catch (error) {
     console.error('Failed to update order status:', error);
   }
 };

 const filteredOrders = orders.filter(order => {
   const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        order.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
   
   const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
   const matchesPayment = filterPayment === 'all' || order.paymentStatus === filterPayment;
   
   return matchesSearch && matchesStatus && matchesPayment;
 }).sort((a, b) => {
   switch (sortBy) {
     case 'amount':
       return b.totalAmount - a.totalAmount;
     case 'status':
       return a.status.localeCompare(b.status);
     default:
       return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
   }
 });

 const getStatusColor = (status: Order['status']) => {
   switch (status) {
     case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
     case 'confirmed': return 'text-blue-600 bg-blue-50 border-blue-200';
     case 'preparing': return 'text-purple-600 bg-purple-50 border-purple-200';
     case 'ready': return 'text-orange-600 bg-orange-50 border-orange-200';
     case 'delivered': return 'text-green-600 bg-green-50 border-green-200';
     case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
     default: return 'text-gray-600 bg-gray-50 border-gray-200';
   }
 };

 const getStatusIcon = (status: Order['status']) => {
   switch (status) {
     case 'pending': return <Clock className="w-4 h-4" />;
     case 'confirmed': return <CheckCircle className="w-4 h-4" />;
     case 'preparing': return <Package className="w-4 h-4" />;
     case 'ready': return <Truck className="w-4 h-4" />;
     case 'delivered': return <CheckCircle className="w-4 h-4" />;
     case 'cancelled': return <XCircle className="w-4 h-4" />;
     default: return <Clock className="w-4 h-4" />;
   }
 };

 const renderStatsCards = () => (
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
     <Card className="p-4">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-gray-600">Total Orders</p>
           <p className="text-2xl font-bold">{stats.totalOrders}</p>
         </div>
         <Package className="w-8 h-8 text-blue-500" />
       </div>
     </Card>
     
     <Card className="p-4">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-gray-600">Pending</p>
           <p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p>
         </div>
         <Clock className="w-8 h-8 text-yellow-500" />
       </div>
     </Card>
     
     <Card className="p-4">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-gray-600">Completed Today</p>
           <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
         </div>
         <CheckCircle className="w-8 h-8 text-green-500" />
       </div>
     </Card>
     
     <Card className="p-4">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-gray-600">Total Revenue</p>
           <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
         </div>
         <DollarSign className="w-8 h-8 text-green-500" />
       </div>
     </Card>
     
     <Card className="p-4">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-gray-600">Avg Order Value</p>
           <p className="text-2xl font-bold">₹{stats.averageOrderValue}</p>
         </div>
         <DollarSign className="w-8 h-8 text-purple-500" />
       </div>
     </Card>
     
     <Card className="p-4">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-sm text-gray-600">Cancelled</p>
           <p className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</p>
         </div>
         <XCircle className="w-8 h-8 text-red-500" />
       </div>
     </Card>
   </div>
 );

 const renderOrderCard = (order: Order) => (
   <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
     <div className="flex items-start justify-between mb-4">
       <div>
         <div className="flex items-center gap-3 mb-2">
           <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
           <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
             {getStatusIcon(order.status)}
             <span className="ml-1 capitalize">{order.status}</span>
           </span>
         </div>
         
         <div className="space-y-1 text-sm text-gray-600">
           <div className="flex items-center">
             <span className="font-medium">{order.buyerName}</span>
             <span className="mx-2">•</span>
             <span>{order.buyerPhone}</span>
           </div>
           <div className="flex items-center">
             <MapPin className="w-4 h-4 mr-1" />
             <span>{order.buyerLocation}</span>
           </div>
           <div className="flex items-center">
             <Calendar className="w-4 h-4 mr-1" />
             <span>{new Date(order.orderDate).toLocaleString()}</span>
           </div>
         </div>
       </div>
       
       <div className="text-right">
         <p className="text-2xl font-bold text-green-600">₹{order.totalAmount}</p>
         <div className="flex items-center text-sm mt-1">
           <span className={`px-2 py-1 rounded-full text-xs ${
             order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
             order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
             'bg-red-100 text-red-800'
           }`}>
             {order.paymentStatus}
           </span>
           {order.paymentMethod && (
             <span className="ml-2 text-gray-500">({order.paymentMethod.toUpperCase()})</span>
           )}
         </div>
       </div>
     </div>
     
     {/* Order Items */}
     <div className="mb-4">
       <h4 className="font-medium text-sm text-gray-700 mb-2">Items:</h4>
       <div className="space-y-2">
         {order.items.map(item => (
           <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
             <img
               src={item.image}
               alt={item.name}
               className="w-10 h-10 object-cover rounded"
             />
             <div className="flex-1">
               <p className="font-medium text-sm">{item.name}</p>
               <p className="text-xs text-gray-600">
                 {item.quantity} {item.unit} × ₹{item.price} = ₹{item.quantity * item.price}
               </p>
             </div>
           </div>
         ))}
       </div>
     </div>
     
     {/* Notes */}
     {order.notes && (
       <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
         <p className="text-sm font-medium text-blue-800 mb-1">Customer Notes:</p>
         <p className="text-sm text-blue-700">{order.notes}</p>
       </div>
     )}
     
     {/* Delivery Info */}
     {order.requestedDeliveryDate && (
       <div className="mb-4 p-3 bg-gray-50 rounded">
         <p className="text-sm font-medium text-gray-700 mb-1">Delivery Info:</p>
         <div className="text-sm text-gray-600">
           <p>Requested: {new Date(order.requestedDeliveryDate).toLocaleString()}</p>
           {order.actualDeliveryDate && (
             <p>Delivered: {new Date(order.actualDeliveryDate).toLocaleString()}</p>
           )}
         </div>
       </div>
     )}
     
     {/* Review */}
     {order.rating && order.review && (
       <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
         <div className="flex items-center mb-1">
           <span className="text-sm font-medium text-green-800 mr-2">Customer Review:</span>
           <div className="flex">
             {[...Array(5)].map((_, i) => (
               <span key={i} className={`text-sm ${i < order.rating! ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
             ))}
           </div>
         </div>
         <p className="text-sm text-green-700">{order.review}</p>
       </div>
     )}
     
     {/* Action Buttons */}
     <div className="flex flex-wrap gap-2">
       <Button
         variant="outline"
         size="sm"
         onClick={() => setSelectedOrder(order)}
       >
         <Eye className="w-4 h-4 mr-1" />
         View Details
       </Button>
       
       <Button
         variant="outline"
         size="sm"
         onClick={() => window.open(`tel:${order.buyerPhone}`)}
       >
         <Phone className="w-4 h-4 mr-1" />
         Call
       </Button>
       
       <Button
         variant="outline"
         size="sm"
         onClick={() => window.open(`sms:${order.buyerPhone}`)}
       >
         <MessageSquare className="w-4 h-4 mr-1" />
         SMS
       </Button>
       
       {order.status === 'pending' && (
         <Button
           size="sm"
           onClick={() => updateOrderStatus(order.id, 'confirmed')}
         >
           Confirm Order
         </Button>
       )}
       
       {order.status === 'confirmed' && (
         <Button
           size="sm"
           onClick={() => updateOrderStatus(order.id, 'preparing')}
         >
           Start Preparing
         </Button>
       )}
       
       {order.status === 'preparing' && (
         <Button
           size="sm"
           onClick={() => updateOrderStatus(order.id, 'ready')}
         >
           Mark Ready
         </Button>
       )}
       
       {order.status === 'ready' && (
         <Button
           size="sm"
           onClick={() => updateOrderStatus(order.id, 'delivered')}
         >
           Mark Delivered
         </Button>
       )}
       
       {['pending', 'confirmed'].includes(order.status) && (
         <Button
           variant="outline"
           size="sm"
           onClick={() => updateOrderStatus(order.id, 'cancelled')}
           className="text-red-600 border-red-300 hover:bg-red-50"
         >
           Cancel
         </Button>
       )}
     </div>
   </Card>
 );

 const renderOrderDetail = () => {
   if (!selectedOrder) return null;
   
   return (
     <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
       <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Order Details - {selectedOrder.orderNumber}</DialogTitle>
         </DialogHeader>
         <div className="space-y-6">
           {/* Order Status Timeline */}
           <div className="bg-gray-50 p-4 rounded-lg">
             <h4 className="font-semibold mb-3">Order Timeline</h4>
             <div className="space-y-3">
               {[
                 { status: 'pending', label: 'Order Placed', time: selectedOrder.orderDate },
                 { status: 'confirmed', label: 'Order Confirmed', time: selectedOrder.status !== 'pending' ? selectedOrder.orderDate : null },
                 { status: 'preparing', label: 'Preparation Started', time: ['preparing', 'ready', 'delivered'].includes(selectedOrder.status) ? selectedOrder.orderDate : null },
                 { status: 'ready', label: 'Ready for Pickup/Delivery', time: ['ready', 'delivered'].includes(selectedOrder.status) ? selectedOrder.orderDate : null },
                 { status: 'delivered', label: 'Delivered', time: selectedOrder.actualDeliveryDate }
               ].map((step) => (
                 <div key={step.status} className="flex items-center">
                   <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                     step.time ? 'bg-green-500 border-green-500' :
                     selectedOrder.status === step.status ? 'bg-blue-500 border-blue-500' :
                     'border-gray-300'
                   }`}>
                     {step.time && <div className="w-2 h-2 bg-white rounded-full"></div>}
                   </div>
                   <div className="ml-3 flex-1">
                     <p className={`text-sm font-medium ${step.time ? 'text-gray-900' : 'text-gray-500'}`}>
                       {step.label}
                     </p>
                     {step.time && (
                       <p className="text-xs text-gray-500">
                         {new Date(step.time).toLocaleString()}
                       </p>
                     )}
                   </div>
                 </div>
               ))}
             </div>
           </div>
           
           {/* Customer Information */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <h4 className="font-semibold mb-3">Customer Information</h4>
               <div className="space-y-2 text-sm">
                 <p><span className="font-medium">Name:</span> {selectedOrder.buyerName}</p>
                 <p><span className="font-medium">Phone:</span> {selectedOrder.buyerPhone}</p>
                 <p><span className="font-medium">Location:</span> {selectedOrder.buyerLocation}</p>
               </div>
             </div>
             
             <div>
               <h4 className="font-semibold mb-3">Order Information</h4>
               <div className="space-y-2 text-sm">
                 <p><span className="font-medium">Order Date:</span> {new Date(selectedOrder.orderDate).toLocaleString()}</p>
                 {selectedOrder.requestedDeliveryDate && (
                   <p><span className="font-medium">Requested Delivery:</span> {new Date(selectedOrder.requestedDeliveryDate).toLocaleString()}</p>
                 )}
                 <p><span className="font-medium">Payment:</span> {selectedOrder.paymentStatus} ({selectedOrder.paymentMethod?.toUpperCase()})</p>
               </div>
             </div>
           </div>
           
           {/* Order Items Detail */}
           <div>
             <h4 className="font-semibold mb-3">Order Items</h4>
             <div className="space-y-3">
               {selectedOrder.items.map(item => (
                 <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                   <img
                     src={item.image}
                     alt={item.name}
                     className="w-16 h-16 object-cover rounded"
                   />
                   <div className="flex-1">
                     <h5 className="font-medium">{item.name}</h5>
                     <p className="text-sm text-gray-600">
                       Quantity: {item.quantity} {item.unit}
                     </p>
                     <p className="text-sm text-gray-600">
                       Price: ₹{item.price} per {item.unit}
                     </p>
                   </div>
                   <div className="text-right">
                     <p className="font-semibold">₹{item.quantity * item.price}</p>
                   </div>
                 </div>
               ))}
             </div>
             
             <div className="border-t pt-3 mt-3">
               <div className="flex justify-between items-center">
                 <span className="text-lg font-semibold">Total Amount:</span>
                 <span className="text-xl font-bold text-green-600">₹{selectedOrder.totalAmount}</span>
               </div>
             </div>
           </div>
           
           {/* Action Buttons */}
           <div className="flex gap-3 pt-4 border-t">
             <Button
               onClick={() => window.open(`tel:${selectedOrder.buyerPhone}`)}
               variant="outline"
             >
               <Phone className="w-4 h-4 mr-2" />
               Call Customer
             </Button>
             <Button
               onClick={() => window.open(`sms:${selectedOrder.buyerPhone}`)}
               variant="outline"
             >
               <MessageSquare className="w-4 h-4 mr-2" />
               Send SMS
             </Button>
             
             {selectedOrder.status === 'pending' && (
               <Button
                 onClick={() => {
                   updateOrderStatus(selectedOrder.id, 'confirmed');
                   setSelectedOrder(null);
                 }}
               >
                 Confirm Order
               </Button>
             )}
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 };

 if (loading) {
   return (
     <div className="flex items-center justify-center h-64">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
     </div>
   );
 }

 return (
   <div className="space-y-6">
     {/* Header */}
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
       <div>
         <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
         <p className="text-gray-600">Manage your customer orders</p>
       </div>
     </div>

     {/* Stats Cards */}
     {renderStatsCards()}

     {/* Filters */}
     <div className="flex flex-col sm:flex-row gap-4">
       <div className="flex-1">
         <Input
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           placeholder="Search by order number or customer name..."
           icon={<Search className="w-4 h-4" />}
         />
       </div>
       
       <select
         value={filterStatus}
         onChange={(e) => setFilterStatus(e.target.value as any)}
         className="border rounded-lg px-3 py-2 text-sm"
       >
         <option value="all">All Status</option>
         <option value="pending">Pending</option>
         <option value="confirmed">Confirmed</option>
         <option value="preparing">Preparing</option>
         <option value="ready">Ready</option>
         <option value="delivered">Delivered</option>
         <option value="cancelled">Cancelled</option>
       </select>
       
       <select
         value={filterPayment}
         onChange={(e) => setFilterPayment(e.target.value as any)}
         className="border rounded-lg px-3 py-2 text-sm"
       >
         <option value="all">All Payments</option>
         <option value="pending">Payment Pending</option>
         <option value="paid">Paid</option>
         <option value="failed">Failed</option>
       </select>
       
       <select
         value={sortBy}
         onChange={(e) => setSortBy(e.target.value as any)}
         className="border rounded-lg px-3 py-2 text-sm"
       >
         <option value="date">Sort by Date</option>
         <option value="amount">Sort by Amount</option>
         <option value="status">Sort by Status</option>
       </select>
     </div>

     {/* Empty State */}
     {filteredOrders.length === 0 && (
       <Card className="p-12 text-center">
         <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
         <h3 className="text-xl font-semibold text-gray-700 mb-2">
           {searchQuery || filterStatus !== 'all' || filterPayment !== 'all' 
             ? 'No orders found' 
             : 'No orders yet'
           }
         </h3>
         <p className="text-gray-500">
           {searchQuery || filterStatus !== 'all' || filterPayment !== 'all'
             ? 'Try adjusting your search or filters'
             : 'Orders will appear here when customers place them'
           }
         </p>
       </Card>
     )}

     {/* Orders List */}
     <div className="space-y-4">
       {filteredOrders.map(renderOrderCard)}
     </div>

     {/* Order Detail Modal */}
     {renderOrderDetail()}
   </div>
 );
};

export default Orders;
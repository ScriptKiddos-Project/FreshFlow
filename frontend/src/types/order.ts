
export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  sellerId: string;
  sellerName: string;
  sellerBusinessName: string;
  sellerPhone: string;
  sellerAddress: string;
  items: OrderItem[];
  pricing: {
    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    taxes: number;
    discount: number;
    total: number;
  };
  delivery: {
    type: DeliveryType;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    scheduledTime?: string;
    estimatedTime?: string;
    actualTime?: string;
    instructions?: string;
    deliveryPersonId?: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    trackingId?: string;
  };
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    paidAt?: string;
    refundId?: string;
    refundedAt?: string;
    refundAmount?: number;
  };
  status: OrderStatus;
  timeline: OrderTimeline[];
  communication: OrderMessage[];
  rating?: {
    buyerRating?: number;
    sellerRating?: number;
    buyerReview?: string;
    sellerReview?: string;
    ratedAt?: string;
  };
  metadata: {
    isUrgent: boolean;
    isBulkOrder: boolean;
    isRepeatOrder: boolean;
    source: 'web' | 'mobile' | 'api';
    userAgent?: string;
    referrer?: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface OrderItem {
  _id: string;
  ingredientId: string;
  ingredientName: string;
  ingredientImage: string;
  quantity: {
    ordered: number;
    unit: string;
    received?: number;
    rejected?: number;
  };
  pricing: {
    basePrice: number;
    negotiatedPrice: number;
    discountPercentage: number;
    totalPrice: number;
  };
  quality: {
    grade: string;
    freshness: string;
    expectedExpiry: string;
    actualExpiry?: string;
  };
  status: OrderItemStatus;
  notes?: string;
  rejectionReason?: string;
}

export type DeliveryType = 'pickup' | 'delivery' | 'express_delivery';

export type PaymentMethod = 
  | 'razorpay'
  | 'upi'
  | 'card'
  | 'netbanking'
  | 'wallet'
  | 'cod'
  | 'bank_transfer';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export type OrderItemStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'rejected'
  | 'returned';

export interface OrderTimeline {
  _id: string;
  status: OrderStatus;
  message: string;
  timestamp: string;
  updatedBy: string;
  updatedByName: string;
  metadata?: any;
}

export interface OrderMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'seller' | 'admin' | 'system';
  message: string;
  messageType: 'text' | 'image' | 'location' | 'system';
  attachments?: string[];
  isRead: boolean;
  timestamp: string;
}

export interface CreateOrderData {
  sellerId: string;
  items: CreateOrderItem[];
  delivery: {
    type: DeliveryType;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    scheduledTime?: string;
    instructions?: string;
  };
  payment: {
    method: PaymentMethod;
  };
  notes?: string;
  isUrgent?: boolean;
}

export interface CreateOrderItem {
  ingredientId: string;
  quantity: {
    ordered: number;
    unit: string;
  };
  negotiatedPrice?: number;
  notes?: string;
}

export interface UpdateOrderData {
  status?: OrderStatus;
  delivery?: {
    estimatedTime?: string;
    actualTime?: string;
    deliveryPersonId?: string;
    trackingId?: string;
  };
  items?: {
    itemId: string;
    status?: OrderItemStatus;
    quantity?: {
      received?: number;
      rejected?: number;
    };
    rejectionReason?: string;
  }[];
  notes?: string;
}

export interface OrderFilters {
  status?: OrderStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  deliveryType?: DeliveryType[];
  paymentMethod?: PaymentMethod[];
  paymentStatus?: PaymentStatus[];
  isUrgent?: boolean;
  isBulkOrder?: boolean;
  sellerId?: string;
  buyerId?: string;
  ingredientCategory?: string[];
  sortBy?: OrderSortOption;
  sortOrder?: 'asc' | 'desc';
}

export type OrderSortOption = 
  | 'createdAt'
  | 'updatedAt'
  | 'total'
  | 'status'
  | 'deliveryTime'
  | 'urgency';

export interface OrderSearchParams {
  query?: string;
  filters?: OrderFilters;
  page?: number;
  limit?: number;
}

export interface OrderSearchResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    aggregations: {
      statusCount: Record<OrderStatus, number>;
      totalRevenue: number;
      averageOrderValue: number;
      urgentOrders: number;
    };
  };
  message: string;
}

export interface OrderResponse {
  success: boolean;
  data: Order;
  message: string;
}

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  message: string;
}

export interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageRating: number;
  repeatCustomers: number;
  statusBreakdown: Record<OrderStatus, number>;
  monthlyStats: {
    month: string;
    orders: number;
    revenue: number;
    averageValue: number;
  }[];
  topBuyers: {
    buyerId: string;
    buyerName: string;
    totalOrders: number;
    totalSpent: number;
  }[];
  topIngredients: {
    ingredientId: string;
    ingredientName: string;
    totalOrders: number;
    totalQuantity: number;
    totalRevenue: number;
  }[];
}

export interface OrderNegotiation {
  _id: string;
  orderId: string;
  ingredientId: string;
  originalPrice: number;
  proposedPrice: number;
  currentPrice: number;
  initiatedBy: 'buyer' | 'seller';
  status: 'pending' | 'accepted' | 'rejected' | 'counter_offered';
  messages: {
    senderId: string;
    senderName: string;
    message: string;
    price?: number;
    timestamp: string;
  }[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNegotiationData {
  orderId: string;
  ingredientId: string;
  proposedPrice: number;
  message?: string;
}

export interface NegotiationResponse {
  success: boolean;
  data: OrderNegotiation;
  message: string;
}

export interface OrderTracking {
  orderId: string;
  trackingId: string;
  status: OrderStatus;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  estimatedArrival: string;
  deliveryPerson?: {
    name: string;
    phone: string;
    rating: number;
  };
  timeline: {
    status: string;
    message: string;
    location?: string;
    timestamp: string;
  }[];
  route?: {
    lat: number;
    lng: number;
  }[];
}

export interface OrderInvoice {
  orderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  buyerDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    gstNumber?: string;
  };
  sellerDetails: {
    name: string;
    businessName: string;
    email: string;
    phone: string;
    address: string;
    gstNumber?: string;
  };
  items: {
    name: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    gstRate?: number;
    gstAmount?: number;
  }[];
  subtotal: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalTax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
}

export interface OrderDispute {
  _id: string;
  orderId: string;
  raisedBy: 'buyer' | 'seller';
  type: 'quality_issue' | 'quantity_mismatch' | 'late_delivery' | 'wrong_item' | 'payment_issue' | 'other';
  subject: string;
  description: string;
  evidence: string[];
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  compensationAmount?: number;
  assignedTo?: string;
  messages: {
    senderId: string;
    senderName: string;
    senderRole: 'buyer' | 'seller' | 'admin';
    message: string;
    attachments?: string[];
    timestamp: string;
  }[];
  createdAt: string;
  resolvedAt?: string;
}

export interface CreateDisputeData {
  orderId: string;
  type: string;
  subject: string;
  description: string;
  evidence?: File[];
}

export interface QuickOrderTemplate {
  _id: string;
  name: string;
  items: {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
  }[];
  totalItems: number;
  estimatedTotal: number;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}
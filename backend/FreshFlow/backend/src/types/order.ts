export interface IOrder {
  _id: string;
  buyerId: string;
  sellerId: string;
  ingredientId: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'in-transit' | 'delivered' | 'cancelled';
  paymentMethod?: 'cash' | 'upi' | 'card' | 'wallet';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  notes?: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  deliveryDate?: Date;
  deliveryTime?: string;
  trackingInfo?: string;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    updatedBy: string;
    notes?: string;
  }>;
  rating?: {
    buyerRating: number;
    sellerRating: number;
    buyerReview?: string;
    sellerReview?: string;
  };
  orderDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderData {
  buyerId: string;
  ingredientId: string;
  quantity: number;
  requestedPrice?: number;
  notes?: string;
  paymentMethod?: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  deliveryDate?: Date;
  deliveryTime?: string;
}

export interface UpdateOrderData {
  status?: 'pending' | 'accepted' | 'rejected' | 'in-transit' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  trackingInfo?: string;
  notes?: string;
  deliveryDate?: Date;
  deliveryTime?: string;
}

export interface OrderFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  sortBy?: 'orderDate' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface OrderStatusHistory {
  status: string;
  timestamp: Date;
  updatedBy: string;
  notes?: string;
}

export interface OrderRating {
  buyerRating: number;
  sellerRating: number;
  buyerReview?: string;
  sellerReview?: string;
}

export interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  statusBreakdown: {
    [key: string]: number;
  };
  paymentBreakdown: {
    [key: string]: number;
  };
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
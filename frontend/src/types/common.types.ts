// shared/types/common.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  errors?: Record<string, string[]>;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  businessName?: string;
  businessAddress?: string;
  gstNumber?: string;
  isVerified: boolean;
  lastLoginAt?: string;
}

export enum UserRole {
  VENDOR = 'vendor',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_APPROVAL = 'pending_approval'
}

export interface Ingredient extends BaseEntity {
  name: string;
  category: IngredientCategory;
  unit: MeasurementUnit;
  description?: string;
  images: string[];
  vendorId: string;
  vendor?: User;
  currentPrice: number;
  originalPrice: number;
  quantity: number;
  minQuantity: number;
  expiryDate: string;
  status: IngredientStatus;
  location: Location;
  tags: string[];
  qualityGrade: QualityGrade;
  isOrganic: boolean;
}

export enum IngredientCategory {
  VEGETABLES = 'vegetables',
  FRUITS = 'fruits',
  GRAINS = 'grains',
  SPICES = 'spices',
  DAIRY = 'dairy',
  MEAT = 'meat',
  SEAFOOD = 'seafood',
  OILS = 'oils',
  CONDIMENTS = 'condiments',
  BEVERAGES = 'beverages',
  OTHER = 'other'
}

export enum MeasurementUnit {
  KG = 'kg',
  GRAM = 'gram',
  LITER = 'liter',
  ML = 'ml',
  PIECE = 'piece',
  DOZEN = 'dozen',
  BUNDLE = 'bundle',
  PACKET = 'packet'
}

export enum IngredientStatus {
  AVAILABLE = 'available',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  EXPIRED = 'expired',
  RESERVED = 'reserved'
}

export enum QualityGrade {
  PREMIUM = 'premium',
  GOOD = 'good',
  AVERAGE = 'average',
  ECONOMY = 'economy'
}

export interface Location {
  address: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Order extends BaseEntity {
  orderNumber: string;
  buyerId: string;
  buyer?: User;
  sellerId: string;
  seller?: User;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  deliveryAddress: Location;
  deliveryDate?: string;
  notes?: string;
  cancelReason?: string;
  rating?: number;
  review?: string;
}

export interface OrderItem {
  ingredientId: string;
  ingredient?: Ingredient;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CASH = 'cash',
  UPI = 'upi',
  CARD = 'card',
  NET_BANKING = 'net_banking',
  WALLET = 'wallet'
}

export interface Transaction extends BaseEntity {
  transactionId: string;
  orderId: string;
  order?: Order;
  amount: number;
  type: TransactionType;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentGatewayResponse?: any;
  refundAmount?: number;
  refundReason?: string;
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  COMMISSION = 'commission',
  SETTLEMENT = 'settlement'
}

export interface Notification extends BaseEntity {
  userId: string;
  user?: User;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
}

export enum NotificationType {
  ORDER_PLACED = 'order_placed',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PRICE_ALERT = 'price_alert',
  EXPIRY_ALERT = 'expiry_alert',
  LOW_STOCK = 'low_stock',
  SYSTEM = 'system'
}

// Form interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  businessAddress: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  businessName?: string;
  businessAddress?: string;
  gstNumber?: string;
}

export interface CreateIngredientRequest {
  name: string;
  category: IngredientCategory;
  unit: MeasurementUnit;
  description?: string;
  currentPrice: number;
  quantity: number;
  minQuantity: number;
  expiryDate: string;
  location: Location;
  tags?: string[];
  qualityGrade: QualityGrade;
  isOrganic: boolean;
}

export interface UpdateIngredientRequest extends Partial<CreateIngredientRequest> {
  status?: IngredientStatus;
}

export interface CreateOrderRequest {
  sellerId: string;
  items: {
    ingredientId: string;
    quantity: number;
  }[];
  deliveryAddress: Location;
  notes?: string;
}

// Search and filter interfaces
export interface SearchFilters {
  query?: string;
  category?: IngredientCategory;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  qualityGrade?: QualityGrade;
  isOrganic?: boolean;
  sortBy?: SortOption;
  sortOrder?: 'asc' | 'desc';
}

export enum SortOption {
  PRICE = 'price',
  EXPIRY_DATE = 'expiryDate',
  CREATED_AT = 'createdAt',
  NAME = 'name',
  DISTANCE = 'distance'
}

// Analytics interfaces
export interface AnalyticsData {
  totalVendors: number;
  activeVendors: number;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalIngredients: number;
  wasteReduction: number;
  costSavings: number;
}

export interface ChartData {
  label: string;
  value: number;
  date?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Socket.IO event interfaces
export interface SocketEvents {
  // Server to client events
  'price_update': (data: { ingredientId: string; newPrice: number }) => void;
  'order_status_update': (data: { orderId: string; status: OrderStatus }) => void;
  'new_notification': (notification: Notification) => void;
  'ingredient_low_stock': (data: { ingredientId: string; currentStock: number }) => void;
  'ingredient_expired': (data: { ingredientId: string }) => void;
  
  // Client to server events
  'join_room': (room: string) => void;
  'leave_room': (room: string) => void;
  'subscribe_price_updates': (ingredientIds: string[]) => void;
  'unsubscribe_price_updates': (ingredientIds: string[]) => void;
}

// Error interfaces
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  errors?: ValidationError[];
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ID = string;
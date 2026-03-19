// Base API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  errors?: ApiError[];
  meta?: ApiMeta;
}

// API Error Interface
export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

// API Meta Information
export interface ApiMeta {
  timestamp: string;
  requestId: string;
  version: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// Pagination Interface
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  offset: number;
}

// Paginated Response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

// API Request Configuration
export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

// File Upload Response
export interface FileUploadResponse {
  success: boolean;
  data: {
    url: string;
    publicId: string;
    originalName: string;
    size: number;
    format: string;
    width?: number;
    height?: number;
  };
  message: string;
}

// Bulk Operation Response
export interface BulkOperationResponse {
  success: boolean;
  data: {
    processed: number;
    successful: number;
    failed: number;
    errors: {
      id: string;
      error: string;
    }[];
  };
  message: string;
}

// Search Suggestion Response
export interface SearchSuggestionResponse {
  success: boolean;
  data: {
    ingredients: string[];
    vendors: string[];
    categories: string[];
    locations: string[];
  };
  message: string;
}

// Health Check Response
export interface HealthCheckResponse {
  success: boolean;
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    services: {
      database: 'connected' | 'disconnected';
      redis: 'connected' | 'disconnected';
      storage: 'connected' | 'disconnected';
      socket: 'connected' | 'disconnected';
    };
    version: string;
    environment: string;
  };
  message: string;
}

// Analytics Response Interfaces
export interface AnalyticsResponse {
  success: boolean;
  data: {
    metrics: Record<string, number>;
    trends: {
      period: string;
      value: number;
      change: number;
      changePercent: number;
    }[];
    topItems: {
      name: string;
      value: number;
      percentage: number;
    }[];
    summary: {
      total: number;
      average: number;
      growth: number;
      period: string;
    };
  };
  message: string;
}

// Notification Response
export interface NotificationResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
    hasMore: boolean;
  };
  message: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'order' | 'ingredient' | 'payment' | 'system' | 'marketing';
}

export type NotificationType = 
  | 'order_placed'
  | 'order_confirmed'
  | 'order_cancelled'
  | 'order_delivered'
  | 'payment_received'
  | 'payment_failed'
  | 'ingredient_expired'
  | 'ingredient_low_stock'
  | 'price_alert'
  | 'new_review'
  | 'profile_updated'
  | 'system_maintenance'
  | 'promotional';

// WebSocket Event Types
export interface SocketEvent<T = any> {
  type: SocketEventType;
  data: T;
  timestamp: string;
  userId?: string;
  roomId?: string;
}

export type SocketEventType = 
  | 'connect'
  | 'disconnect'
  | 'join_room'
  | 'leave_room'
  | 'price_update'
  | 'order_update'
  | 'inventory_update'
  | 'chat_message'
  | 'notification'
  | 'user_online'
  | 'user_offline'
  | 'typing_start'
  | 'typing_stop'
  | 'error';

// Real-time Data Interfaces
export interface PriceUpdateEvent {
  ingredientId: string;
  ingredientName: string;
  oldPrice: number;
  newPrice: number;
  discountPercentage: number;
  reason: string;
  vendorId: string;
  vendorName: string;
  timestamp: string;
}

export interface OrderUpdateEvent {
  orderId: string;
  orderNumber: string;
  status: string;
  message: string;
  timestamp: string;
  buyerId: string;
  sellerId: string;
}

export interface InventoryUpdateEvent {
  ingredientId: string;
  ingredientName: string;
  quantityChange: number;
  newQuantity: number;
  vendorId: string;
  timestamp: string;
}

// API Endpoints Configuration
export interface ApiEndpoints {
  auth: {
    login: string;
    register: string;
    logout: string;
    refresh: string;
    forgotPassword: string;
    resetPassword: string;
    verifyEmail: string;
    profile: string;
  };
  ingredients: {
    list: string;
    search: string;
    create: string;
    get: string;
    update: string;
    delete: string;
    upload: string;
    reviews: string;
    favorites: string;
  };
  orders: {
    list: string;
    create: string;
    get: string;
    update: string;
    cancel: string;
    track: string;
    invoice: string;
    dispute: string;
  };
  users: {
    profile: string;
    update: string;
    preferences: string;
    stats: string;
    addresses: string;
  };
  notifications: {
    list: string;
    markRead: string;
    markAllRead: string;
    preferences: string;
  };
  analytics: {
    dashboard: string;
    ingredients: string;
    orders: string;
    revenue: string;
    trends: string;
  };
  misc: {
    health: string;
    suggestions: string;
    upload: string;
    categories: string;
    locations: string;
  };
}

// HTTP Status Codes
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// API Error Codes
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVENTORY_UNAVAILABLE = 'INVENTORY_UNAVAILABLE',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
}

// Request/Response Interceptor Types
export interface RequestInterceptor {
  onRequest?: (config: any) => any;
  onRequestError?: (error: any) => Promise<any>;
}

export interface ResponseInterceptor {
  onResponse?: (response: any) => any;
  onResponseError?: (error: any) => Promise<any>;
}

// Cache Configuration
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  prefix: string;
  exclude?: string[]; // Endpoints to exclude from caching
}

// API Client Configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
  interceptors: {
    request: RequestInterceptor[];
    response: ResponseInterceptor[];
  };
  cache: CacheConfig;
}

// Retry Configuration
export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
  shouldResetTimeout?: boolean;
}

// Location Data Types
export interface LocationData {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface GeolocationResponse {
  success: boolean;
  data: {
    coordinates: {
      lat: number;
      lng: number;
    };
    address: string;
    accuracy: number;
  };
  message: string;
}

// Upload Progress Event
export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
  timeRemaining?: number;
  speed?: number;
}

// Batch Request Interface
export interface BatchRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  params?: any;
}

export interface BatchResponse {
  success: boolean;
  data: {
    responses: {
      id: string;
      status: number;
      data: any;
      error?: string;
    }[];
    processed: number;
    successful: number;
    failed: number;
  };
  message: string;
}

// Export Statistics
export interface ExportRequest {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  fields?: string[];
  includeHeaders?: boolean;
}

export interface ExportResponse {
  success: boolean;
  data: {
    downloadUrl: string;
    filename: string;
    size: number;
    expiresAt: string;
  };
  message: string;
}

// System Configuration
export interface SystemConfig {
  app: {
    name: string;
    version: string;
    environment: string;
    maintenance: boolean;
  };
  features: {
    realTimeUpdates: boolean;
    notifications: boolean;
    analytics: boolean;
    fileUpload: boolean;
    geolocation: boolean;
  };
  limits: {
    maxFileSize: number;
    maxFilesPerUpload: number;
    maxOrderItems: number;
    maxBulkOperations: number;
    rateLimit: number;
  };
  payment: {
    enabled: boolean;
    methods: string[];
    currency: string;
    minAmount: number;
    maxAmount: number;
  };
}

// Webhook Event Types
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  signature: string;
  retryCount: number;
}

// Feature Flag Response
export interface FeatureFlagResponse {
  success: boolean;
  data: {
    flags: Record<string, boolean>;
    experiments: Record<string, string>;
  };
  message: string;
}

// Performance Metrics
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  timestamp: string;
}

// Database Query Options
export interface QueryOptions {
  select?: string[];
  populate?: string[];
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  lean?: boolean;
  projection?: Record<string, 1 | 0>;
}
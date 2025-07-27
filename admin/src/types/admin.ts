// Admin Panel Type Definitions

export interface Transaction {
  id: string;
  orderId: string;
  vendorId: string;
  buyerId: string;
  amount: number;
  platformFee: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  paymentId: string;
  buyerName: string;
  buyerLocation: string;
  vendorName: string;
  vendorLocation: string;
  transactionDate: Date;
  createdAt: Date;
  processedBy?: string;
  notes?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'viewer';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface AdminSession {
  user: AdminUser;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

// Vendor Management Types
export interface VendorDetails {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  documents: {
    gst?: string;
    fssai?: string;
    businessLicense?: string;
    bankDetails: {
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      accountHolderName: string;
    };
  };
  status: VendorStatus;
  approvalDate?: Date;
  rejectionReason?: string;
  ratings: {
    average: number;
    count: number;
    breakdown: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  statistics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    cancelledOrders: number;
    completionRate: number;
  };
  isVerified: boolean;
  verificationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

export type VendorStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'inactive';

export interface VendorApprovalRequest {
  vendorId: string;
  action: 'approve' | 'reject' | 'suspend';
  reason?: string;
  adminId: string;
  notes?: string;
}

// Order Management Types


export interface Order {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerLocation: string;
  sellerName: string;
  sellerPhone: string;
  sellerLocation: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string; // ISO 8601 format string (e.g., '2023-07-27T10:00:00Z')
  confirmedAt?: string; // Optional: Date of confirmation in ISO 8601 format
  deliveryDate?: string; // Optional: Delivery date in ISO 8601 format
  notes?: string; // Optional: Any additional notes on the order
}


export interface OrderDetails {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  buyerInfo: {
    name: string;
    businessName: string;
    phone: string;
    email: string;
  };
  sellerInfo: {
    name: string;
    businessName: string;
    phone: string;
    email: string;
  };
  items: OrderItem[];
  pricing: {
    subtotal: number;
    tax: number;
    platformFee: number;
    deliveryFee: number;
    discount: number;
    total: number;
  };
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  deliveryInfo: {
    type: 'pickup' | 'delivery';
    scheduledTime: Date;
    actualTime?: Date;
    address?: string;
    instructions?: string;
  };
  timeline: OrderTimeline[];
  disputeInfo?: {
    id: string;
    reason: string;
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    createdAt: Date;
    resolvedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  expiryDate: Date;
  qualityGrade: string;
  images?: string[];
}

export type OrderStatus = 'in_transit' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled' | 'disputed';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy: 'system' | 'vendor' | 'admin';
  updatedById?: string;
}

// System Configuration Types
export interface SystemConfig {
  id: string;
  category: ConfigCategory;
  key: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  isEditable: boolean;
  requiresRestart: boolean;
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  lastModifiedBy: string;
  lastModifiedAt: Date;
}

export type ConfigCategory = 'general' | 'pricing' | 'notifications' | 'security' | 'features' | 'integrations';

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  targetUsers?: string[];
  conditions?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  recipient: string;
  sender?: string;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export type NotificationType = 
  | 'vendor_registration'
  | 'order_dispute'
  | 'payment_issue'
  | 'system_alert'
  | 'security_warning'
  | 'performance_issue'
  | 'new_feature'
  | 'maintenance';

// Audit Log Types
export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Filter and Pagination Types
export interface AdminTableFilters {
  search?: string;
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface AdminTablePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdminTableResponse<T> {
  data: T[];
  pagination: AdminTablePagination;
  filters: AdminTableFilters;
}

// Dashboard Widget Types
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: {
    x: number;
    y: number;
  };
  config: Record<string, any>;
  isVisible: boolean;
  refreshInterval?: number;
  lastUpdated?: Date;
}

export type WidgetType = 
  | 'metric_card'
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'data_table'
  | 'recent_activity'
  | 'system_health'
  | 'quick_actions';

export type WidgetSize = 'small' | 'medium' | 'large' | 'extra_large';

// System Health Types - UPDATED AND EXPANDED
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: ServiceHealth[];
  lastChecked: Date;
  uptime: number;
  alerts: SystemAlert[];
}

export interface ServiceHealth {
  name: string;
  description: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  responseTime?: number;
  errorRate?: number;
  lastChecked: Date;
  url?: string;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  service: string;
  message: string;
  timestamp: Date;
  isResolved: boolean;
  resolvedAt?: Date;
}

// MISSING TYPES ADDED FOR SYSTEM HEALTH
export interface SystemHealthMetrics {
  overallStatus: 'healthy' | 'warning' | 'critical';
  apiResponseTime: number;
  apiResponseTimeTrend: 'up' | 'down' | 'stable';
  activeUsers: number;
  activeUsersTrend: 'up' | 'down' | 'stable';
  errorRate: number;
  errorRateTrend: 'up' | 'down' | 'stable';
  systemLoad: number;
  systemLoadTrend: 'up' | 'down' | 'stable';
  services: ServiceHealth[];
  databases: DatabaseHealth[];
  serverMetrics: ServerMetrics;
  networkStats: NetworkStats;
  storageInfo: StorageInfo;
  recentEvents: SystemEvent[];
  lastUpdated: String;
}

export interface DatabaseHealth {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  connections: number;
  maxConnections: number;
  storageUsed: number;
  avgResponseTime: number;
  replicationLag: number;
}

export interface ServerMetrics {
  currentCpuUsage: number;
  avgCpuUsage: number;
  currentMemoryUsage: number;
  availableMemory: number;
  cpuHistory: number[];
  memoryHistory: number[];
}

export interface NetworkStats {
  bandwidthUsage: number;
  requestsPerMinute: number;
  dataTransfer: number;
  activeConnections: number;
}

export interface StorageInfo {
  totalStorage: number;
  usedStorage: number;
  availableStorage: number;
  storageUsagePercent: number;
}

export interface SystemEvent {
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  service: string;
}

// Export Types - UPDATED AND EXPANDED
export interface ExportRequest {
  type: ExportType;
  format: ExportFormat;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  columns?: string[];
  requestedBy: string;
  requestedAt: Date;
}

export type ExportType = 'vendors' | 'orders' | 'transactions' | 'analytics' | 'audit_logs' | 'ingredients' | 'users' | 'reports';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json' | 'excel';

export interface ExportJob {
  id: string;
  type: ExportType | string;
  format: ExportFormat;
  filters?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// MISSING EXPORT TYPES ADDED
export interface ExportOptions {
  type: ExportType | string;
  format: ExportFormat;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  columns?: string[];
}

export interface ExportData {
  headers: string[];
  rows: any[][];
  metadata: {
    exportedAt: Date;
    totalRecords: number;
    exportType: string;
    reportName?: string;
    reportPeriod?: string;
  };
}

export interface ExportProgress {
  jobId: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ExportType;
  format: ExportFormat;
  columns: string[];
  filters: Record<string, any>;
  schedule?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    timestamp: Date;
    requestId: string;
    pagination?: AdminTablePagination;
  };
}

export interface AdminError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

// Search and Filter Types
export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  filters: Record<string, any>;
  suggestions?: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  url?: string;
  requiresConfirmation?: boolean;
  permissions?: string[];
}

// Bulk Operation Types
export interface BulkOperation {
  action: string;
  selectedIds: string[];
  parameters?: Record<string, any>;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// ADDITIONAL MISSING TYPES FOR ADMIN PERMISSIONS
// export interface AdminPermission {
//   canViewSystemHealth: boolean;
//   canManageVendors: boolean;
//   canManageOrders: boolean;
//   canViewAnalytics: boolean;
//   canExportData: boolean;
//   canManageUsers: boolean;
//   canAccessAuditLogs: boolean;
//   canManageSettings: boolean;
//   canManageReports: boolean;
// }

// Additional type definitions to add to your admin.ts file

// AdminPermission as a string union type for specific permissions
export type AdminPermission = 
  | 'view_dashboard'
  | 'create:reports'
  | 'delete:reports'
  | 'export_analytics'
  | 'export_vendors'
  | 'manage_vendors'
  | 'approve_vendors'
  | 'suspend_vendors'
  | 'view_orders'
  | 'manage_orders'
  | 'cancel_orders'
  | 'refund_orders'
  | 'view_transactions'
  | 'manage_transactions'
  | 'view_analytics'
  | 'export_data'
  | 'manage_users'
  | 'manage_admin_users'
  | 'view_audit_logs'
  | 'manage_system_config'
  | 'manage_feature_flags'
  | 'view_system_health'
  | 'send_notifications'
  | 'generate_reports'
  | 'manage_reports'
  | 'view_export_jobs'
  | 'manage_export_jobs';

// Updated AdminRole type to match the usage in the code
// export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'viewer';

// Updated Permission interface to be more specific
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Updated AdminUser interface to ensure compatibility
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

// Make sure these exports are added to your existing admin.ts file
// The rest of your existing types should remain unchanged


// types/admin.ts

// export type VendorStatus = 'active' | 'pending' | 'suspended' | 'rejected';

export interface Vendor {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  status: VendorStatus;
  joinDate: string; // ISO date string
  totalRevenue?: number;
  totalOrders?: number;
  successRate?: number; // in percentage
  averageRating?: number; // e.g., 4.5
  averageResponseTime?: number; // in minutes

  documents?: Array<{
    type: string;
    url: string;
  }>;
}

export interface VendorFilters {
  status: VendorStatus | 'all';
  location: string;
  businessType: string;
  revenueRange: {
    min: number;
    max: number;
  };
  joinDateRange: {
    start: string; // ISO date string
    end: string;   // ISO date string
  };
}

export interface SystemConfig {
  appName: string;
  version: string;
  maintenanceMode: boolean;
  maxVendorsPerDay: number;
  maxOrdersPerVendor: number;
  sessionTimeout: number;
  apiRateLimit: number;
  enableRegistration: boolean;
  requireEmailVerification: boolean;
  autoApproveVendors: boolean;
}

export interface PricingConfig {
  dynamicPricingEnabled: boolean;
  priceUpdateInterval: number;
  maxPriceFluctuation: number;
  minimumProfitMargin: number;
  expiryDiscountRate: number;
  bulkDiscountThreshold: number;
  bulkDiscountRate: number;
  platformCommission: number;
  paymentGatewayFee: number;
}

export interface NotificationConfig {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  orderNotifications: boolean;
  priceAlerts: boolean;
  expiryAlerts: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

export interface SystemSettingsConfig {
  appName: string;
  version: string;
  maintenanceMode: boolean;
  maxVendorsPerDay: number;
  maxOrdersPerVendor: number;
  sessionTimeout: number;
  apiRateLimit: number;
  enableRegistration: boolean;
  requireEmailVerification: boolean;
  autoApproveVendors: boolean;
}
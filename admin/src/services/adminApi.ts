import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API Configuration
// const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_TIMEOUT = 30000;

// Request/Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string | undefined;
  details?: any;
}

// Define proper error response interface
interface ErrorResponse {
  message?: string;
  code?: string;
  details?: any;
  error?: string;
  errors?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

// Admin authentication interfaces
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  token: string;
  refreshToken: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: 'super_admin' | 'admin' | 'moderator';
    permissions: string[];
  };
}

// Vendor management interfaces
export interface VendorListParams extends PaginationParams {
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  search?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  location: {
    address: string;
    coordinates: [number, number];
    city: string;
    state: string;
    pincode: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  documents: {
    businessLicense?: string;
    panCard?: string;
    gstCertificate?: string;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    rating: number;
    completionRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VendorApprovalRequest {
  vendorId: string;
  status: 'approved' | 'rejected';
  notes?: string;
}

// Analytics interfaces
export interface AnalyticsParams {
  dateFrom: string;
  dateTo: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  metrics?: string[];
}

export interface DashboardMetrics {
  totalVendors: {
    current: number;
    previousPeriod: number;
    growthRate: number;
  };
  totalOrders: {
    current: number;
    previousPeriod: number;
    growthRate: number;
  };
  totalRevenue: {
    current: number;
    previousPeriod: number;
    growthRate: number;
  };
  activeUsers: {
    current: number;
    previousPeriod: number;
    growthRate: number;
  };
  wasteReduction: {
    current: number;
    previousPeriod: number;
    growthRate: number;
  };
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface CategoryData {
  category: string;
  value: number;
  percentage: number;
}

// Helper function to safely extract error information
const extractErrorInfo = (errorData: any): ErrorResponse => {
  if (!errorData || typeof errorData !== 'object') {
    return {};
  }

  return {
    message: errorData.message || errorData.error || undefined,
    code: errorData.code || errorData.errorCode || undefined,
    details: errorData.details || errorData.errors || undefined
  };
};

// Create axios instance
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add request timestamp for debugging
      (config as any).metadata = { startTime: new Date() };
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Calculate request duration
      const endTime = new Date();
      const duration = endTime.getTime() - (response.config as any).metadata?.startTime?.getTime();
      
      console.log(`API Request: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
      
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      // Handle 401 errors (unauthorized)
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshToken = localStorage.getItem('admin_refresh_token');
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/admin/auth/refresh`, {
              refreshToken
            });
            
            const { token } = response.data.data;
            localStorage.setItem('admin_token', token);
            
            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_refresh_token');
          window.location.href = '/admin/login';
          return Promise.reject(refreshError);
        }
      }

      // Safely extract error information
      const errorInfo = extractErrorInfo(error.response?.data);

      // Transform error response with safe property access
      const apiError: ApiError = {
        message: errorInfo.message || error.message || 'An error occurred',
        ...(errorInfo.code && { code: errorInfo.code }),
        ...(errorInfo.details && { details: errorInfo.details })
      };

      return Promise.reject(apiError);
    }
  );

  return instance;
};

// API instance
const api = createApiInstance();

// Authentication API
export const authApi = {
  login: async (credentials: AdminLoginRequest): Promise<AdminAuthResponse> => {
    const response = await api.post<ApiResponse<AdminAuthResponse>>('/admin/auth/login', credentials);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/admin/auth/logout');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await api.post<ApiResponse<{ token: string }>>('/admin/auth/refresh', {
      refreshToken
    });
    return response.data.data;
  },

  getProfile: async (): Promise<AdminAuthResponse['admin']> => {
    const response = await api.get<ApiResponse<AdminAuthResponse['admin']>>('/admin/auth/profile');
    return response.data.data;
  }
};

// Vendor management API
export const vendorApi = {
  getVendors: async (params?: VendorListParams): Promise<ApiResponse<Vendor[]>> => {
    const response = await api.get<ApiResponse<Vendor[]>>('/admin/vendors', { params });
    return response.data;
  },

  getVendor: async (vendorId: string): Promise<Vendor> => {
    const response = await api.get<ApiResponse<Vendor>>(`/admin/vendors/${vendorId}`);
    return response.data.data;
  },

  approveVendor: async (request: VendorApprovalRequest): Promise<void> => {
    await api.patch(`/admin/vendors/${request.vendorId}/status`, {
      status: request.status,
      notes: request.notes
    });
  },

  suspendVendor: async (vendorId: string, reason: string): Promise<void> => {
    await api.patch(`/admin/vendors/${vendorId}/suspend`, { reason });
  },

  reactivateVendor: async (vendorId: string): Promise<void> => {
    await api.patch(`/admin/vendors/${vendorId}/reactivate`);
  },

  getVendorStats: async (vendorId: string, params?: AnalyticsParams): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/admin/vendors/${vendorId}/stats`, { params });
    return response.data.data;
  }
};

// Analytics API
export const analyticsApi = {
  getDashboardMetrics: async (params?: AnalyticsParams): Promise<DashboardMetrics> => {
    const response = await api.get<ApiResponse<DashboardMetrics>>('/admin/analytics/dashboard', { params });
    return response.data.data;
  },

  getTimeSeriesData: async (metric: string, params?: AnalyticsParams): Promise<TimeSeriesData[]> => {
    const response = await api.get<ApiResponse<TimeSeriesData[]>>(`/admin/analytics/timeseries/${metric}`, { params });
    return response.data.data;
  },

  getCategoryData: async (metric: string, params?: AnalyticsParams): Promise<CategoryData[]> => {
    const response = await api.get<ApiResponse<CategoryData[]>>(`/admin/analytics/categories/${metric}`, { params });
    return response.data.data;
  },

  getRevenueAnalytics: async (params?: AnalyticsParams): Promise<{
    total: number;
    byPeriod: TimeSeriesData[];
    byCategory: CategoryData[];
    topVendors: { vendorId: string; vendorName: string; revenue: number }[];
  }> => {
    const response = await api.get<ApiResponse<any>>('/admin/analytics/revenue', { params });
    return response.data.data;
  },

  getOrderAnalytics: async (params?: AnalyticsParams): Promise<{
    total: number;
    byPeriod: TimeSeriesData[];
    byStatus: CategoryData[];
    averageOrderValue: number;
  }> => {
    const response = await api.get<ApiResponse<any>>('/admin/analytics/orders', { params });
    return response.data.data;
  },

  getWasteReductionMetrics: async (params?: AnalyticsParams): Promise<{
    totalWastePrevented: number;
    wastePreventedByPeriod: TimeSeriesData[];
    topWasteCategories: CategoryData[];
    environmentalImpact: {
      co2Saved: number;
      waterSaved: number;
      energySaved: number;
    };
  }> => {
    const response = await api.get<ApiResponse<any>>('/admin/analytics/waste-reduction', { params });
    return response.data.data;
  }
};

// Order management API
export const orderApi = {
  getOrders: async (params?: PaginationParams & FilterParams): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>('/admin/orders', { params });
    return response.data;
  },

  getOrder: async (orderId: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/admin/orders/${orderId}`);
    return response.data.data;
  },

  updateOrderStatus: async (orderId: string, status: string, notes?: string): Promise<void> => {
    await api.patch(`/admin/orders/${orderId}/status`, { status, notes });
  },

  refundOrder: async (orderId: string, amount: number, reason: string): Promise<void> => {
    await api.post(`/admin/orders/${orderId}/refund`, { amount, reason });
  }
};

// Transaction management API
export const transactionApi = {
  getTransactions: async (params?: PaginationParams & FilterParams): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>('/admin/transactions', { params });
    return response.data;
  },

  getTransaction: async (transactionId: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/admin/transactions/${transactionId}`);
    return response.data.data;
  },

  processRefund: async (transactionId: string, amount: number, reason: string): Promise<void> => {
    await api.post(`/admin/transactions/${transactionId}/refund`, { amount, reason });
  }
};

// System configuration API
export const configApi = {
  getConfig: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/admin/config');
    return response.data.data;
  },

  updateConfig: async (config: any): Promise<void> => {
    await api.patch('/admin/config', config);
  },

  getFeatureFlags: async (): Promise<{ [key: string]: boolean }> => {
    const response = await api.get<ApiResponse<any>>('/admin/config/features');
    return response.data.data;
  },

  updateFeatureFlag: async (flag: string, enabled: boolean): Promise<void> => {
    await api.patch(`/admin/config/features/${flag}`, { enabled });
  },

    updateSystemConfig: async (config: any): Promise<void> => {
    await api.patch('/admin/config/system', config);
  },

  updatePricingConfig: async (config: any): Promise<void> => {
    await api.patch('/admin/config/pricing', config);
  },

  updateNotificationConfig: async (config: any): Promise<void> => {
    await api.patch('/admin/config/notifications', config);
  }
};

// Report generation API
export const reportApi = {
  generateReport: async (reportType: string, params: any): Promise<{ reportId: string }> => {
    const response = await api.post<ApiResponse<{ reportId: string }>>(`/admin/reports/${reportType}`, params);
    return response.data.data;
  },

  getReportStatus: async (reportId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    downloadUrl?: string;
  }> => {
    const response = await api.get<ApiResponse<any>>(`/admin/reports/${reportId}/status`);
    return response.data.data;
  },

  downloadReport: async (reportId: string): Promise<Blob> => {
    const response = await api.get(`/admin/reports/${reportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getReportHistory: async (params?: PaginationParams): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>('/admin/reports/history', { params });
    return response.data;
  }
};

// System health API
export const systemApi = {
  getHealthCheck: async (): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: { [service: string]: { status: string; latency?: number } };
    uptime: number;
    version: string;
  }> => {
    const response = await api.get<ApiResponse<any>>('/admin/system/health');
    return response.data.data;
  },

  getSystemMetrics: async (): Promise<{
    cpu: number;
    memory: number;
    disk: number;
    activeConnections: number;
    requestsPerMinute: number;
  }> => {
    const response = await api.get<ApiResponse<any>>('/admin/system/metrics');
    return response.data.data;
  },

  getLogs: async (params?: {
    level?: 'error' | 'warn' | 'info' | 'debug';
    service?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: Array<{
      timestamp: string;
      level: string;
      service: string;
      message: string;
      metadata?: any;
    }>;
    total: number;
  }> => {
    const response = await api.get<ApiResponse<any>>('/admin/system/logs', { params });
    return response.data.data;
  }
};

// Notification API
export const notificationApi = {
  sendNotification: async (notification: {
    type: 'email' | 'sms' | 'push';
    recipients: string[];
    template: string;
    data: any;
  }): Promise<{ notificationId: string }> => {
    const response = await api.post<ApiResponse<any>>('/admin/notifications/send', notification);
    return response.data.data;
  },

  getNotificationHistory: async (params?: PaginationParams): Promise<ApiResponse<any[]>> => {
    const response = await api.get<ApiResponse<any[]>>('/admin/notifications/history', { params });
    return response.data;
  },

  getNotificationTemplates: async (): Promise<any[]> => {
    const response = await api.get<ApiResponse<any[]>>('/admin/notifications/templates');
    return response.data.data;
  }
};

// Audit log API
export const auditApi = {
  getAuditLogs: async (params?: PaginationParams & {
    action?: string;
    userId?: string;
    resource?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<Array<{
    id: string;
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    changes: any;
    ipAddress: string;
    userAgent: string;
    timestamp: string;
  }>>> => {
    const response = await api.get<ApiResponse<any[]>>('/admin/audit', { params });
    return response.data;
  },

  getAuditLog: async (logId: string): Promise<any> => {
    const response = await api.get<ApiResponse<any>>(`/admin/audit/${logId}`);
    return response.data.data;
  }
};



// Export the API instance for custom requests
export { api as adminApiInstance };

// Export default
const adminApi = {
  auth: authApi,
  vendors: vendorApi,
  analytics: analyticsApi,
  orders: orderApi,
  transactions: transactionApi,
  config: configApi,
  reports: reportApi,
  system: systemApi,
  notifications: notificationApi,
  audit: auditApi
};

export default adminApi;
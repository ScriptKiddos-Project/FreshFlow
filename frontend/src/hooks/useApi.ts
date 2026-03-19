import { useState , useCallback } from 'react';
import { useQuery, useMutation, useQueryClient,  } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const useApi = () => {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  // Generic API hook
  const useApiState = <T>(initialData: T | null = null): [ApiState<T>, (promise: Promise<T>, options?: UseApiOptions<T>) => Promise<T | null>] => {
    const [state, setState] = useState<ApiState<T>>({
      data: initialData,
      loading: false,
      error: null,
      success: false
    });

    const execute = useCallback(async (
      promise: Promise<T>,
      options: UseApiOptions<T> = {}
    ): Promise<T | null> => {
      const { onSuccess, onError, showToast = true, successMessage, errorMessage } = options;

      setState(prev => ({ ...prev, loading: true, error: null, success: false }));

      try {
        const result = await promise;
        setState(prev => ({ ...prev, data: result, loading: false, success: true }));

        if (showToast && successMessage) {
          toast.success(successMessage);
        }

        onSuccess?.(result);
        return result;
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message || 'An error occurred';
        setState(prev => ({ ...prev, error: errorMsg, loading: false, success: false }));

        if (showToast) {
          toast.error(errorMessage || errorMsg);
        }

        onError?.(error);
        return null;
      }
    }, []);

    return [state, execute];
  };

  // Ingredients API
  const useIngredients = (params: PaginationParams = {}) => {
    return useQuery({
      queryKey: ['ingredients', params],
      queryFn: () => api.get<PaginatedResponse<any>>('/ingredients', { params }),
      enabled: !!token,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10 // 10 minutes
    });
  };

  const useIngredient = (id: string) => {
    return useQuery({
      queryKey: ['ingredient', id],
      queryFn: () => api.get(`/ingredients/${id}`),
      enabled: !!token && !!id,
      staleTime: 1000 * 60 * 5
    });
  };

  const useCreateIngredient = (options: UseApiOptions<any> = {}) => {
    return useMutation({
      mutationFn: (data: any) => api.post('/ingredients', data),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        queryClient.invalidateQueries({ queryKey: ['my-ingredients'] });
        toast.success('Ingredient listed successfully');
        options.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create ingredient');
        options.onError?.(error);
      }
    });
  };

  const useUpdateIngredient = (options: UseApiOptions<any> = {}) => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/ingredients/${id}`, data),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        queryClient.invalidateQueries({ queryKey: ['ingredient', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['my-ingredients'] });
        toast.success('Ingredient updated successfully');
        options.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update ingredient');
        options.onError?.(error);
      }
    });
  };

  const useDeleteIngredient = (options: UseApiOptions<any> = {}) => {
    return useMutation({
      mutationFn: (id: string) => api.delete(`/ingredients/${id}`),
      onSuccess: (data, id) => {
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        queryClient.removeQueries({ queryKey: ['ingredient', id] });
        queryClient.invalidateQueries({ queryKey: ['my-ingredients'] });
        toast.success('Ingredient deleted successfully');
        options.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete ingredient');
        options.onError?.(error);
      }
    });
  };

  // My Ingredients
  const useMyIngredients = (params: PaginationParams = {}) => {
    return useQuery({
      queryKey: ['my-ingredients', params],
      queryFn: () => api.get<PaginatedResponse<any>>('/ingredients/my', { params }),
      enabled: !!token,
      staleTime: 1000 * 60 * 2 // 2 minutes
    });
  };

  // Orders API
  const useOrders = (params: PaginationParams = {}) => {
    return useQuery({
      queryKey: ['orders', params],
      queryFn: () => api.get<PaginatedResponse<any>>('/orders', { params }),
      enabled: !!token,
      staleTime: 1000 * 60 * 2
    });
  };

  const useOrder = (id: string) => {
    return useQuery({
      queryKey: ['order', id],
      queryFn: () => api.get(`/orders/${id}`),
      enabled: !!token && !!id,
      staleTime: 1000 * 60 * 1
    });
  };

  const useCreateOrder = (options: UseApiOptions<any> = {}) => {
    return useMutation({
      mutationFn: (data: any) => api.post('/orders', data),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
        toast.success('Order placed successfully');
        options.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to place order');
        options.onError?.(error);
      }
    });
  };

  const useUpdateOrderStatus = (options: UseApiOptions<any> = {}) => {
    return useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) => 
        api.patch(`/orders/${id}/status`, { status }),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
        toast.success('Order status updated');
        options.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update order status');
        options.onError?.(error);
      }
    });
  };

  // Search API
  const useSearch = (query: string, filters: Record<string, any> = {}) => {
    return useQuery({
      queryKey: ['search', query, filters],
      queryFn: () => api.get('/search', { 
        params: { q: query, ...filters } 
      }),
      enabled: !!token && query.length > 2,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10
    });
  };

  // Analytics API
  const useDashboardStats = () => {
    return useQuery({
      queryKey: ['dashboard-stats'],
      queryFn: () => api.get('/analytics/dashboard'),
      enabled: !!token,
      staleTime: 1000 * 60 * 5,
      refetchInterval: 1000 * 60 * 5 // Refetch every 5 minutes
    });
  };

  const useSalesAnalytics = (period: string = '7d') => {
    return useQuery({
      queryKey: ['sales-analytics', period],
      queryFn: () => api.get(`/analytics/sales?period=${period}`),
      enabled: !!token,
      staleTime: 1000 * 60 * 10
    });
  };

  // Profile API
  const useProfile = () => {
    return useQuery({
      queryKey: ['profile'],
      queryFn: () => api.get('/users/profile'),
      enabled: !!token,
      staleTime: 1000 * 60 * 10
    });
  };

  const useUpdateProfile = (options: UseApiOptions<any> = {}) => {
    return useMutation({
      mutationFn: (data: any) => api.put('/users/profile', data),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        toast.success('Profile updated successfully');
        options.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
        options.onError?.(error);
      }
    });
  };

  // Notifications API
  const useNotifications = (params: PaginationParams = {}) => {
    return useQuery({
      queryKey: ['notifications', params],
      queryFn: () => api.get<PaginatedResponse<any>>('/notifications', { params }),
      enabled: !!token,
      staleTime: 1000 * 60 * 2
    });
  };

  const useMarkNotificationRead = () => {
    return useMutation({
      mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
  };

  const useMarkAllNotificationsRead = () => {
    return useMutation({
      mutationFn: () => api.patch('/notifications/read-all'),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        toast.success('All notifications marked as read');
      }
    });
  };

  // Upload API
  const useUploadImage = (options: UseApiOptions<any> = {}) => {
    return useMutation({
      mutationFn: (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        return api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      },
      onSuccess: (data) => {
        options.onSuccess?.(data);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to upload image');
        options.onError?.(error);
      }
    });
  };

  // Cache management utilities
  const invalidateQueries = useCallback((queryKey: string[]) => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient]);

  const removeQueries = useCallback((queryKey: string[]) => {
    queryClient.removeQueries({ queryKey });
  }, [queryClient]);

  const setQueryData = useCallback(<T>(queryKey: string[], data: T) => {
    queryClient.setQueryData(queryKey, data);
  }, [queryClient]);

  const getQueryData = useCallback(<T>(queryKey: string[]): T | undefined => {
    return queryClient.getQueryData(queryKey);
  }, [queryClient]);

  // Prefetch utilities
  const prefetchIngredients = useCallback((params: PaginationParams = {}) => {
    return queryClient.prefetchQuery({
      queryKey: ['ingredients', params],
      queryFn: () => api.get<PaginatedResponse<any>>('/ingredients', { params }),
      staleTime: 1000 * 60 * 5
    });
  }, [queryClient]);

  const prefetchIngredient = useCallback((id: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['ingredient', id],
      queryFn: () => api.get(`/ingredients/${id}`),
      staleTime: 1000 * 60 * 5
    });
  }, [queryClient]);

  return {
    // Core utilities
    useApiState,
    invalidateQueries,
    removeQueries,
    setQueryData,
    getQueryData,
    prefetchIngredients,
    prefetchIngredient,

    // Ingredients
    useIngredients,
    useIngredient,
    useMyIngredients,
    useCreateIngredient,
    useUpdateIngredient,
    useDeleteIngredient,

    // Orders
    useOrders,
    useOrder,
    useCreateOrder,
    useUpdateOrderStatus,

    // Search
    useSearch,

    // Analytics
    useDashboardStats,
    useSalesAnalytics,

    // Profile
    useProfile,
    useUpdateProfile,

    // Notifications
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,

    // Upload
    useUploadImage
  };
};
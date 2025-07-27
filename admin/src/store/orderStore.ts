// Define additional interfaces for order operations
export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface OrderSearchParams {
  page?: number;
  limit?: number;
  query?: string;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import adminApi from '../services/adminApi';
import type { Order, OrderStatus } from '../types/admin';

interface OrderState {
  orders: Order[];
  totalOrders: number;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
}

interface OrderActions {
  fetchOrders: (params?: OrderSearchParams) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrderDetails: (orderId: string) => Promise<Order>;
  filterOrders: (filters: OrderFilters) => Promise<void>;
  searchOrders: (query: string) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
  reset: () => void;
}

type OrderStore = OrderState & OrderActions;

const initialState: OrderState = {
  orders: [],
  totalOrders: 0,
  isLoading: false,
  error: null,
  currentPage: 1,
  pageSize: 20,
};

export const useOrderStore = create<OrderStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchOrders: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const { page = 1, limit = 20, ...filters } = params || {};
          
          const response = await adminApi.orders.getOrders({
            page,
            limit,
            ...filters
          });

          // Handle different response structures
          const ordersData = Array.isArray(response.data) ? response.data : response.data || [];
          const totalCount = response.pagination?.total || ordersData.length;

          set({
            orders: ordersData,
            totalOrders: totalCount,
            currentPage: page,
            pageSize: limit,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Failed to fetch orders:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch orders',
            isLoading: false
          });
        }
      },

      updateOrderStatus: async (orderId, status) => {
        set({ isLoading: true, error: null });
        try {
          await adminApi.orders.updateOrderStatus(orderId, status);
          
          // Update the order status in the local state
          const { orders } = get();
          const updatedOrders = orders.map(order =>
            order.id === orderId 
              ? { ...order, status, updatedAt: new Date().toISOString() }
              : order
          );

          set({
            orders: updatedOrders,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Failed to update order status:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to update order status',
            isLoading: false
          });
          throw error; // Re-throw to allow component to handle the error
        }
      },

      getOrderDetails: async (orderId) => {
        set({ isLoading: true, error: null });
        try {
          const orderData = await adminApi.orders.getOrder(orderId);
          set({ isLoading: false, error: null });
          return orderData;
        } catch (error) {
          console.error('Failed to fetch order details:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch order details',
            isLoading: false
          });
          throw error;
        }
      },

      filterOrders: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const response = await adminApi.orders.getOrders(filters);
          
          // Handle different response structures
          const ordersData = Array.isArray(response.data) ? response.data : response.data || [];
          const totalCount = response.pagination?.total || ordersData.length;

          set({
            orders: ordersData,
            totalOrders: totalCount,
            currentPage: filters.page || 1,
            pageSize: filters.limit || 20,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Failed to filter orders:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to filter orders',
            isLoading: false
          });
        }
      },

      searchOrders: async (query) => {
        set({ isLoading: true, error: null });
        try {
          const { currentPage, pageSize } = get();
          const response = await adminApi.orders.getOrders({
            query,
            page: currentPage,
            limit: pageSize
          });

          // Handle different response structures
          const ordersData = Array.isArray(response.data) ? response.data : response.data || [];
          const totalCount = response.pagination?.total || ordersData.length;

          set({
            orders: ordersData,
            totalOrders: totalCount,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Failed to search orders:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to search orders',
            isLoading: false
          });
        }
      },

      setPage: (page) => {
        set({ currentPage: page });
      },

      setPageSize: (size) => {
        set({ pageSize: size, currentPage: 1 });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'order-store',
      partialize: (state: any) => ({
        currentPage: state.currentPage,
        pageSize: state.pageSize,
      }),
    }
  )
);

// Selectors for computed values
export const useOrderStats = () => {
  return useOrderStore((state: OrderStore) => {
    const orders = state.orders;
    const stats = orders.reduce((acc: Record<OrderStatus, number>, order: Order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<OrderStatus, number>);

    return {
      pending: stats.pending || 0,
      confirmed: stats.confirmed || 0,
      in_transit: stats.in_transit || 0,
      delivered: stats.delivered || 0,
      cancelled: stats.cancelled || 0,
      total: orders.length
    };
  });
};

export const useOrdersByStatus = (status?: OrderStatus) => {
  return useOrderStore((state: OrderStore) => 
    status ? state.orders.filter(order => order.status === status) : state.orders
  );
};

export const useOrdersLoading = () => {
  return useOrderStore((state: OrderStore) => state.isLoading);
};

export const useOrdersError = () => {
  return useOrderStore((state: OrderStore) => state.error);
};
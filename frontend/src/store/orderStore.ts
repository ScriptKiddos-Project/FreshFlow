import { create } from "zustand";
import type { Order } from "../types/order"; // adjust path if needed

interface OrderState {
  orders: Order[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
  getOrdersByStatus: (status: string) => Order[];
  getOrderById: (id: string) => Order | undefined; // ✅ added
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async () => {
    set({ loading: true });
    const mockOrders: Order[] = [
      // Your mock data here...
    ];
    await new Promise((res) => setTimeout(res, 500));
    set({ orders: mockOrders, loading: false });
  },

  getOrdersByStatus: (status) =>
    get().orders.filter((o) => o.status === status),

  getOrderById: (id) => get().orders.find((o) => o.id === id), // ✅ added

  get totalOrders() {
    return get().orders.length;
  },
  get pendingOrders() {
    return get().orders.filter((o) => o.status === "pending").length;
  },
  get completedOrders() {
    return get().orders.filter((o) => o.status === "delivered").length;
  },
  get cancelledOrders() {
    return get().orders.filter((o) => o.status === "cancelled").length;
  },
}));

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useMarketplaceStore } from '../store/marketplaceStore';

// Socket event types - using string literal types instead of interface
export type SocketEventMap = {
  // Authentication events
  'user:authenticated': (data: { userId: string; sessionId: string }) => void;
  'user:disconnected': (data: { userId: string }) => void;

  // Price update events
  'price:updated': (data: {
    ingredientId: string;
    newPrice: number;
    oldPrice: number;
    discount: number;
    timestamp: string;
  }) => void;
  'price:urgent': (data: {
    ingredientId: string;
    discount: number;
    timeLeft: number;
  }) => void;

  // Order events
  'order:created': (data: any) => void;
  'order:updated': (data: any) => void;
  'order:cancelled': (data: any) => void;
  'order:completed': (data: any) => void;

  // Inventory events
  'ingredient:listed': (data: any) => void;
  'ingredient:updated': (data: any) => void;
  'ingredient:sold': (data: { ingredientId: string }) => void;
  'ingredient:expired': (data: { ingredientId: string }) => void;

  // Notification events
  'notification:new': (data: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
    userId: string;
  }) => void;

  // Market events
  'market:activity': (data: {
    type: 'new_listing' | 'price_drop' | 'sale' | 'urgent';
    message: string;
    ingredientId?: string;
    vendorName?: string;
    timestamp: string;
  }) => void;
};

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    this.socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events - using any type to avoid Socket.IO conflicts
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.authenticateUser();
    });

    this.socket.on('disconnect', (...args: any[]) => {
      const reason = args[0];
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (...args: any[]) => {
      const error = args[0];
      console.error('🔥 Socket connection error:', error);
      this.handleReconnect();
    });

    // Authentication events
    this.socket.on('user:authenticated', (...args: any[]) => {
      const data = args[0] as { userId: string; sessionId: string };
      console.log('✅ User authenticated via socket:', data);
    });

    // Price update events
    this.socket.on('price:updated', (...args: any[]) => {
      const data = args[0] as {
        ingredientId: string;
        newPrice: number;
        oldPrice: number;
        discount: number;
        timestamp: string;
      };
      console.log('💰 Price updated:', data);
      
      try {
        const inventoryStore = useInventoryStore.getState();
        if (inventoryStore.updatePriceRealtime) {
          inventoryStore.updatePriceRealtime(
            data.ingredientId,
            data.newPrice,
            data.discount
          );
        }
      } catch (error) {
        console.error('Error updating price in inventory store:', error);
      }
      
      // Show notification for significant price drops
      if (data.discount > 20) {
        this.showNotification('success', 'Price Drop Alert!', 
          `${data.discount}% off on ingredient - Limited time!`);
      }
    });

    this.socket.on('price:urgent', (...args: any[]) => {
      const data = args[0] as {
        ingredientId: string;
        discount: number;
        timeLeft: number;
      };
      console.log('🚨 Urgent price alert:', data);
      
      try {
        const inventoryStore = useInventoryStore.getState();
        if (inventoryStore.markAsUrgent) {
          inventoryStore.markAsUrgent(data.ingredientId);
        }
      } catch (error) {
        console.error('Error marking ingredient as urgent:', error);
      }
      
      this.showNotification('warning', 'Urgent Sale!', 
        `${data.discount}% off - Only ${data.timeLeft} minutes left!`);
    });

    // Order events
    this.socket.on('order:created', (...args: any[]) => {
      const data = args[0];
      console.log('📋 New order created:', data);
      this.showNotification('info', 'New Order', 
        `Order #${data.orderNumber || 'N/A'} has been created`);
    });

    this.socket.on('order:updated', (...args: any[]) => {
      const data = args[0];
      console.log('📋 Order updated:', data);
      
      try {
        const marketplaceStore = useMarketplaceStore.getState();
        if (marketplaceStore.updateOrderStatus && data.orderId && data.status) {
          marketplaceStore.updateOrderStatus(data.orderId, data.status);
        }
      } catch (error) {
        console.error('Error updating order status:', error);
      }
    });

    this.socket.on('order:completed', (...args: any[]) => {
      const data = args[0];
      console.log('✅ Order completed:', data);
      this.showNotification('success', 'Order Completed', 
        `Order #${data.orderNumber || 'N/A'} has been completed successfully!`);
    });

    this.socket.on('order:cancelled', (...args: any[]) => {
      const data = args[0];
      console.log('❌ Order cancelled:', data);
      this.showNotification('warning', 'Order Cancelled', 
        `Order #${data.orderNumber || 'N/A'} has been cancelled`);
    });

    // Inventory events
    this.socket.on('ingredient:listed', (...args: any[]) => {
      const data = args[0];
      console.log('🥕 New ingredient listed:', data);
      
      try {
        const inventoryStore = useInventoryStore.getState();
        if (inventoryStore.addIngredient && data) {
          inventoryStore.addIngredient(data);
        }
      } catch (error) {
        console.error('Error adding ingredient to inventory:', error);
      }
    });

    this.socket.on('ingredient:updated', (...args: any[]) => {
      const data = args[0];
      console.log('🔄 Ingredient updated:', data);
      
      try {
        const inventoryStore = useInventoryStore.getState();
        if (inventoryStore.updateIngredient && data.ingredientId) {
          inventoryStore.updateIngredient(data.ingredientId, data);
        }
      } catch (error) {
        console.error('Error updating ingredient:', error);
      }
    });

    this.socket.on('ingredient:sold', (...args: any[]) => {
      const data = args[0] as { ingredientId: string };
      console.log('💸 Ingredient sold:', data);
      
      try {
        const inventoryStore = useInventoryStore.getState();
        if (inventoryStore.updateIngredient && data.ingredientId) {
          inventoryStore.updateIngredient(data.ingredientId, { 
            status: 'sold' 
          });
        }
      } catch (error) {
        console.error('Error marking ingredient as sold:', error);
      }
    });

    this.socket.on('ingredient:expired', (...args: any[]) => {
      const data = args[0] as { ingredientId: string };
      console.log('⏰ Ingredient expired:', data);
      
      try {
        const inventoryStore = useInventoryStore.getState();
        if (inventoryStore.updateIngredient && data.ingredientId) {
          inventoryStore.updateIngredient(data.ingredientId, { 
            status: 'expired' 
          });
        }
      } catch (error) {
        console.error('Error marking ingredient as expired:', error);
      }
    });

    // Notification events
    this.socket.on('notification:new', (...args: any[]) => {
      const data = args[0] as {
        id: string;
        type: 'info' | 'success' | 'warning' | 'error';
        title: string;
        message: string;
        timestamp: string;
        userId: string;
      };
      console.log('🔔 New notification:', data);
      
      if (data.type && data.title && data.message) {
        this.showNotification(data.type, data.title, data.message);
      }
    });

    // Market activity events
    this.socket.on('market:activity', (...args: any[]) => {
      const data = args[0] as {
        type: 'new_listing' | 'price_drop' | 'sale' | 'urgent';
        message: string;
        ingredientId?: string;
        vendorName?: string;
        timestamp: string;
      };
      console.log('📈 Market activity:', data);
      
      // Handle market activity updates
      if (data.type === 'urgent' && data.message) {
        this.showNotification('warning', 'Market Alert', data.message);
      }
    });
  }

  private authenticateUser() {
    try {
      const authStore = useAuthStore.getState();
      const { user, token } = authStore;
      
      if (user && token && this.socket) {
        this.socket.emit('authenticate', {
          userId: (user as any).id,
          token: token,
          userType: (user as any).userType || 'vendor',
        });
      }
    } catch (error) {
      console.error('Error authenticating user:', error);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.showNotification('error', 'Connection Lost', 
        'Unable to connect to server. Please refresh the page.');
    }
  }

  private reconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.initializeSocket();
  }

  private showNotification(type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) {
    // Create a custom notification event that components can listen to
    const notificationEvent = new CustomEvent('freshflow:notification', {
      detail: { type, title, message, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(notificationEvent);
  }

  // Public methods
  public connect() {
    if (!this.socket || !this.isConnected) {
      this.initializeSocket();
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  public emit(event: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit event:', event);
    }
  }

  // Fixed the on method to handle TypeScript properly
  public on(event: string, callback: (...args: any[]) => void): () => void {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Store listener for cleanup
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event)?.push(callback);

      // Return cleanup function
      return () => {
        this.off(event, callback);
      };
    }
    return () => {};
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
        
        // Remove from stored listeners
        const listeners = this.eventListeners.get(event);
        if (listeners) {
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
      } else {
        this.socket.off(event);
        this.eventListeners.delete(event);
      }
    }
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Specific business logic methods
  public joinVendorRoom(vendorId: string) {
    this.emit('vendor:join', { vendorId });
  }

  public leaveVendorRoom(vendorId: string) {
    this.emit('vendor:leave', { vendorId });
  }

  public subscribeToIngredient(ingredientId: string) {
    this.emit('ingredient:subscribe', { ingredientId });
  }

  public unsubscribeFromIngredient(ingredientId: string) {
    this.emit('ingredient:unsubscribe', { ingredientId });
  }

  public updateLocation(latitude: number, longitude: number, address: string) {
    this.emit('location:update', { latitude, longitude, address });
  }

  public sendTyping(recipientId: string, isTyping: boolean) {
    this.emit('chat:typing', { recipientId, isTyping });
  }

  public sendMessage(recipientId: string, message: string, type: 'text' | 'image' = 'text') {
    this.emit('chat:message', { recipientId, message, type, timestamp: new Date().toISOString() });
  }

  // Cleanup method
  public cleanup() {
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach((callback) => {
        this.socket?.off(event, callback);
      });
    });
    this.eventListeners.clear();
    
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
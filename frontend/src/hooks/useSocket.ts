import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useMarketplaceStore } from '../store/marketplaceStore';
import { toast } from 'sonner';

interface SocketEvents {
  
  // Price Updates
  'price:updated': (data: { ingredientId: string; newPrice: number; oldPrice: number; timestamp: string }) => void;
  'price:bulk-update': (data: { updates: Array<{ ingredientId: string; price: number }> }) => void;
  'subscribe:prices': (data: { ingredientIds: string[] }) => void;
   'unsubscribe:prices': (data: { ingredientIds: string[] }) => void;
   // ✅ Room management
  'join:room': (data: { room: string }) => void;
  'leave:room': (data: { room: string }) => void;

  // ✅ Chat typing indicator
  'chat:typing': (data: { chatId: string; isTyping: boolean }) => void;

  // ✅ User status updates
  'user:status': (data: { status: 'online' | 'busy' | 'away' }) => void;

  
  // Order Events
  'order:created': (data: any) => void;
  'order:updated': (data: any) => void;
  'order:cancelled': (data: any) => void;
  'order:completed': (data: any) => void;
  
  // Inventory Events
  'inventory:low-stock': (data: { ingredientId: string; currentStock: number; threshold: number }) => void;
  'inventory:expiry-warning': (data: { ingredientId: string; expiryDate: string; daysLeft: number }) => void;
  'inventory:updated': (data: any) => void;
  
  // Marketplace Events
  'marketplace:new-listing': (data: any) => void;
  'marketplace:listing-updated': (data: any) => void;
  'marketplace:listing-sold': (data: { listingId: string; buyerId: string }) => void;
  
  // Notifications
  'notification:new': (data: any) => void;
  'notification:read': (data: { notificationId: string }) => void;
  
  // System Events
  'system:maintenance': (data: { message: string; scheduledTime: string }) => void;
  'system:update': (data: { version: string; features: string[] }) => void;
  
  // User Events
  'user:online': (data: { userId: string; timestamp: string }) => void;
  'user:offline': (data: { userId: string; timestamp: string }) => void;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { token, user } = useAuthStore();
  const inventoryStore = useInventoryStore();
  const marketplaceStore = useMarketplaceStore();

  // Initialize socket connection
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.freshflow.in' 
      : 'http://localhost:5000';

    socketRef.current = io(socketUrl, {
      auth: {
        token: token,
        userId: (user as any).id,
        businessType: (user as any).businessType
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      
      // Join user-specific room
      socket.emit('join:user-room', { userId: (user as any).id });
      
      // Join business-type room for relevant updates
      socket.emit('join:business-room', { businessType: (user as any).businessType });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      toast.success('Connection restored');
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      toast.error('Unable to connect to server. Please refresh the page.');
    });

    // Business event handlers
    setupEventHandlers(socket);

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, user]);

  const setupEventHandlers = (socket: Socket) => {
    // Price update events
    socket.on('price:updated', (data) => {
      if (inventoryStore.updateIngredient) {
        // ✅ FIXED: Pass price as part of an object with the correct structure
        inventoryStore.updateIngredient(data.ingredientId, { price: data.newPrice });
      }
      
      const priceChange = ((data.newPrice - data.oldPrice) / data.oldPrice) * 100;
      const changeText = priceChange > 0 ? 'increased' : 'decreased';
      
      toast.info(
        `Price ${changeText} by ${Math.abs(priceChange).toFixed(1)}%`,
        {
          description: `New price: ₹${data.newPrice.toFixed(2)}`,
        }
      );
    });

    socket.on('price:bulk-update', (data) => {
      // ✅ FIXED: Pass price as part of an object, not just the number
      data.updates.forEach((update: { ingredientId: string; price: number }) => {
        if (inventoryStore.updateIngredient) {
          inventoryStore.updateIngredient(update.ingredientId, { price: update.price });
        }
      });
      
      toast.info(`${data.updates.length} prices updated`);
    });

    // Inventory alerts
    socket.on('inventory:low-stock', (data) => {
      toast.warning(
        'Low stock alert',
        {
          description: `Only ${data.currentStock} units left`,
        }
      );
    });

    socket.on('inventory:expiry-warning', (data) => {
      toast.warning(
        'Expiry warning',
        {
          description: `Expires in ${data.daysLeft} days`,
        }
      );
    });

    // Marketplace events
    socket.on('marketplace:new-listing', (data) => {
      // Type-safe check for addNewListing method
      if ('addNewListing' in marketplaceStore && typeof marketplaceStore.addNewListing === 'function') {
        (marketplaceStore as any).addNewListing(data);
      } else {
        console.warn('addNewListing method not available in marketplace store');
      }
      
      if (data.sellerId !== (user as any)?.id) {
        toast.info(
          'New ingredient available',
          {
            description: `${data.name} - ₹${data.price}/kg`,
          }
        );
      }
    });

    socket.on('marketplace:listing-sold', (data) => {
      if (data.buyerId === (user as any)?.id) {
        toast.success('Order confirmed!');
      }
    });

    // Order events
    socket.on('order:created', (data) => {
      if (data.sellerId === (user as any)?.id) {
        toast.info(
          'New order received',
          {
            description: `Order #${data.orderNumber}`,
          }
        );
      }
    });

    socket.on('order:updated', (data) => {
      const statusMessages: { [key: string]: string } = {
        confirmed: 'Order confirmed',
        preparing: 'Order is being prepared',
        ready: 'Order is ready for pickup',
        completed: 'Order completed',
        cancelled: 'Order cancelled'
      };
      
      toast.info(statusMessages[data.status] || 'Order updated');
    });

    // System notifications
    socket.on('system:maintenance', (data) => {
      toast.warning(
        'Scheduled maintenance',
        {
          description: data.message,
        }
      );
    });

    socket.on('notification:new', (data) => {
      // Handle based on notification type
      switch (data.type) {
        case 'price_alert':
          toast.info(data.title, { description: data.message });
          break;
        case 'order_update':
          toast.success(data.title, { description: data.message });
          break;
        case 'system':
          toast.warning(data.title, { description: data.message });
          break;
        default:
          toast(data.title, { description: data.message });
      }
    });
  };

  // Socket utility functions
  const emit = useCallback(<T extends keyof SocketEvents>(
    event: T, 
    data?: Parameters<SocketEvents[T]>[0]
  ) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn('Socket not connected, cannot emit:', event);
    return false;
  }, []);

  const on = useCallback(<T extends keyof SocketEvents>(
    event: T,
    handler: SocketEvents[T]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler as any);
      
      return () => {
        socketRef.current?.off(event, handler as any);
      };
    }
    return () => {};
  }, []);

  const off = useCallback(<T extends keyof SocketEvents>(
    event: T,
    handler?: SocketEvents[T]
  ) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler as any);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  // Specific business functions
  const joinRoom = useCallback((room: string) => {
    return emit('join:room', { room });
  }, [emit]);

  const leaveRoom = useCallback((room: string) => {
    return emit('leave:room', { room });
  }, [emit]);

  const subscribeToPriceUpdates = useCallback((ingredientIds: string[]) => {
    return emit('subscribe:prices', { ingredientIds });
  }, [emit]);

  const unsubscribeFromPriceUpdates = useCallback((ingredientIds: string[]) => {
    return emit('unsubscribe:prices', { ingredientIds });
  }, [emit]);

  const sendTypingIndicator = useCallback((chatId: string, isTyping: boolean) => {
    return emit('chat:typing', { chatId, isTyping });
  }, [emit]);

  const updateUserStatus = useCallback((status: 'online' | 'busy' | 'away') => {
    return emit('user:status', { status });
  }, [emit]);

  return {
    // Connection state
    isConnected,
    connectionError,
    socket: socketRef.current,
    
    // Core functions
    emit,
    on,
    off,
    
    // Convenience functions
    joinRoom,
    leaveRoom,
    subscribeToPriceUpdates,
    unsubscribeFromPriceUpdates,
    sendTypingIndicator,
    updateUserStatus
  };
};
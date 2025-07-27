import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAdminStore } from '../store/adminStore';
import { useAnalyticsStore } from '../store/analyticsStore';
import { useVendorStore } from '../store/vendorStore';

interface RealTimeMetrics {
  activeUsers: number;
  totalOrders: number;
  totalRevenue: number;
  activeListings: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
}

interface VendorActivity {
  vendorId: string;
  vendorName: string;
  action: 'login' | 'logout' | 'order_placed' | 'listing_created' | 'listing_updated';
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface OrderUpdate {
  orderId: string;
  buyerId: string;
  sellerId: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  timestamp: Date;
}

interface RealTimeData {
  metrics: RealTimeMetrics;
  vendorActivities: VendorActivity[];
  systemAlerts: SystemAlert[];
  recentOrders: OrderUpdate[];
}

export const useRealTimeData = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  const { user } = useAdminStore();
  const { updateMetrics } = useAnalyticsStore();
  const { updateVendorActivity } = useVendorStore();
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const maxReconnectAttempts = 5;

  const connectToOrderUpdates = useCallback(() => {
  if (socket && isConnected) {
    socket.emit('subscribe_order_updates');
    console.log('Subscribed to order updates.');
  }
}, [socket, isConnected]);
  
  const [realTimeData, setRealTimeData] = useState<RealTimeData>({
    metrics: {
      activeUsers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      activeListings: 0,
      systemHealth: 'healthy',
      lastUpdated: new Date()
    },
    vendorActivities: [],
    systemAlerts: [],
    recentOrders: []
  });

  // Helper function to convert RealTimeMetrics to MetricCard array format
  const convertMetricsToCards = useCallback((metrics: RealTimeMetrics) => {
    return [
      {
        id: 'active-users',
        title: 'Active Users',
        value: metrics.activeUsers,
        change: 0, // You might want to calculate this based on previous values
        trend: 'up' as const
      },
      {
        id: 'total-orders',
        title: 'Total Orders',
        value: metrics.totalOrders,
        change: 0,
        trend: 'up' as const
      },
      {
        id: 'total-revenue',
        title: 'Total Revenue',
        value: metrics.totalRevenue,
        change: 0,
        trend: 'up' as const
      },
      {
        id: 'active-listings',
        title: 'Active Listings',
        value: metrics.activeListings,
        change: 0,
        trend: 'up' as const
      }
    ];
  }, []);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!user) return;

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://freshflow-backend.railway.app'
      : 'ws://localhost:8000';

    const newSocket = io(socketUrl, {
      auth: {
        token: user,
        role: 'admin'
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempt(0);
      console.log('✅ Admin socket connected:', newSocket.id);
      
      // Join admin room for admin-specific events
      newSocket.emit('join_admin_room', { adminId: user.id });
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('❌ Admin socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server-initiated disconnect, attempt reconnection
        handleReconnection();
      }
    });

    newSocket.on('connect_error', (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
      console.error('🔴 Socket connection error:', error);
      handleReconnection();
    });

    // Real-time metrics updates
    newSocket.on('metrics_update', (metrics: RealTimeMetrics) => {
      setRealTimeData(prev => ({
        ...prev,
        metrics: {
          ...metrics,
          lastUpdated: new Date()
        }
      }));
      
      // Update analytics store with converted metrics
      const metricCards = convertMetricsToCards(metrics);
      updateMetrics(metricCards);
    });

    // Vendor activity updates
    newSocket.on('vendor_activity', (activity: VendorActivity) => {
      setRealTimeData(prev => ({
        ...prev,
        vendorActivities: [activity, ...prev.vendorActivities.slice(0, 49)] // Keep last 50
      }));
      
      updateVendorActivity(activity);
    });

    // System alerts
    newSocket.on('system_alert', (alert: SystemAlert) => {
      setRealTimeData(prev => ({
        ...prev,
        systemAlerts: [alert, ...prev.systemAlerts.slice(0, 19)] // Keep last 20
      }));
    });

    // Order updates
    newSocket.on('order_update', (order: OrderUpdate) => {
      setRealTimeData(prev => ({
        ...prev,
        recentOrders: [order, ...prev.recentOrders.slice(0, 29)] // Keep last 30
      }));
    });

    // Price updates for marketplace monitoring
    newSocket.on('price_update', (data: { ingredientId: string; newPrice: number; oldPrice: number }) => {
      console.log('💰 Price update:', data);
    });

    // New vendor registrations
    newSocket.on('new_vendor_registration', (vendor: any) => {
      setRealTimeData(prev => ({
        ...prev,
        systemAlerts: [{
          id: `vendor_reg_${Date.now()}`,
          type: 'info',
          title: 'New Vendor Registration',
          message: `${vendor.businessName} has registered and needs approval`,
          timestamp: new Date(),
          acknowledged: false
        }, ...prev.systemAlerts.slice(0, 19)]
      }));
    });

    setSocket(newSocket);
  }, [user, user?.id, updateMetrics, updateVendorActivity, convertMetricsToCards]);

  // Handle reconnection logic
  const handleReconnection = useCallback(() => {
    if (reconnectAttempt >= maxReconnectAttempts) {
      setConnectionError('Maximum reconnection attempts reached');
      return;
    }

    setReconnectAttempt(prev => prev + 1);
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000); // Exponential backoff max 30s
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`🔄 Attempting reconnection (${reconnectAttempt + 1}/${maxReconnectAttempts})`);
      initializeSocket();
    }, delay);
  }, [reconnectAttempt, initializeSocket]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    setReconnectAttempt(0);
    setConnectionError(null);
    initializeSocket();
  }, [socket, initializeSocket]);

  // Acknowledge system alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    if (socket && isConnected) {
      socket.emit('acknowledge_alert', { alertId });
      
      setRealTimeData(prev => ({
        ...prev,
        systemAlerts: prev.systemAlerts.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      }));
    }
  }, [socket, isConnected]);

  // Request metrics refresh
  const refreshMetrics = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('request_metrics_refresh');
    }
  }, [socket, isConnected]);

  // Subscribe to specific vendor activities
  const subscribeToVendor = useCallback((vendorId: string) => {
    if (socket && isConnected) {
      socket.emit('subscribe_vendor_activity', { vendorId });
    }
  }, [socket, isConnected]);

  // Unsubscribe from vendor activities
  const unsubscribeFromVendor = useCallback((vendorId: string) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe_vendor_activity', { vendorId });
    }
  }, [socket, isConnected]);

  // Set system alert filters
  const setAlertFilters = useCallback((filters: { types?: string[]; severity?: string[] }) => {
    if (socket && isConnected) {
      socket.emit('set_alert_filters', filters);
    }
  }, [socket, isConnected]);

  // Initialize socket on mount and user change
  useEffect(() => {
    if (user) {
      initializeSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, initializeSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return {
    // Connection state
    isConnected,
    connectionError,
    reconnectAttempt,
    
    // Real-time data
    metrics: realTimeData.metrics,
    vendorActivities: realTimeData.vendorActivities,
    systemAlerts: realTimeData.systemAlerts,
    recentOrders: realTimeData.recentOrders,
    
    // Actions
    reconnect,
    acknowledgeAlert,
    refreshMetrics,
    subscribeToVendor,
    unsubscribeFromVendor,
    setAlertFilters,
    
    // Derived state
    unacknowledgedAlerts: realTimeData.systemAlerts.filter(alert => !alert.acknowledged),
    criticalAlerts: realTimeData.systemAlerts.filter(alert => alert.type === 'critical'),
    recentActivity: realTimeData.vendorActivities.slice(0, 10),

    connectToOrderUpdates,
    
    // Helper functions
    getVendorActivityCount: (vendorId: string, timeRange: number = 3600000) => {
      const since = new Date(Date.now() - timeRange);
      return realTimeData.vendorActivities.filter(
        activity => activity.vendorId === vendorId && activity.timestamp >= since
      ).length;
    },
    
    getOrdersInTimeRange: (timeRange: number = 3600000) => {
      const since = new Date(Date.now() - timeRange);
      return realTimeData.recentOrders.filter(order => order.timestamp >= since);
    }
  };
};
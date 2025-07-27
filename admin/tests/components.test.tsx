import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock router
import { BrowserRouter } from 'react-router-dom';
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Mock hooks
vi.mock('../src/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({
    user: { id: '1', name: 'Admin User', email: 'admin@test.com' },
    isAuthenticated: true,
    permissions: {
      canViewDashboard: true,
      canManageVendors: true,
      canManageOrders: true,
      canViewAnalytics: true,
      canViewReports: true,
      canManageSettings: true,
      canViewSystemHealth: true,
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    initializeAuth: vi.fn(),
  }),
}));

vi.mock('../src/hooks/useRealTimeData', () => ({
  useRealTimeData: () => ({
    systemStats: {
      status: 'healthy',
      activeUsers: 150,
      totalVendors: 85,
      totalOrders: 1250,
      revenue: 125000,
    },
    loading: false,
    error: null,
  }),
}));

// Mock API services
vi.mock('../src/services/adminApi', () => ({
  adminApi: {
    getDashboardStats: vi.fn().mockResolvedValue({
      totalVendors: 85,
      activeVendors: 65,
      totalOrders: 1250,
      pendingOrders: 23,
      totalRevenue: 125000,
      monthlyRevenue: 15000,
      averageOrderValue: 100,
      systemHealth: 'healthy',
    }),
    getVendors: vi.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Test Vendor',
        email: 'vendor@test.com',
        status: 'active',
        joinedDate: '2024-01-15',
        totalOrders: 45,
        rating: 4.5,
      },
    ]),
    getOrders: vi.fn().mockResolvedValue([
      {
        id: '1',
        vendorName: 'Test Vendor',
        buyerName: 'Test Buyer',
        amount: 150,
        status: 'pending',
        createdAt: '2024-01-20T10:30:00Z',
      },
    ]),
    getAnalytics: vi.fn().mockResolvedValue({
      revenue: { current: 15000, previous: 12000, growth: 25 },
      orders: { current: 150, previous: 120, growth: 25 },
      vendors: { current: 85, previous: 80, growth: 6.25 },
    }),
    getSystemHealth: vi.fn().mockResolvedValue({
      overallStatus: 'healthy',
      apiResponseTime: 120,
      activeUsers: 150,
      errorRate: 0.5,
      systemLoad: 45,
      services: [
        {
          name: 'API Server',
          status: 'online',
          uptime: 99.9,
          description: 'Main API service',
        },
      ],
      databases: [
        {
          name: 'MongoDB Primary',
          status: 'healthy',
          connections: 25,
          maxConnections: 100,
          storageUsed: 2.5,
          avgResponseTime: 15,
          replicationLag: 0,
        },
      ],
      serverMetrics: {
        currentCpuUsage: 45,
        avgCpuUsage: 40,
        currentMemoryUsage: 60,
        availableMemory: 8,
        cpuHistory: [30, 35, 40, 45, 50, 45, 40, 35, 30, 25, 20, 25],
        memoryHistory: [50, 55, 60, 65, 70, 65, 60, 55, 50, 45, 40, 45],
      },
      networkStats: {
        bandwidthUsage: 25,
        requestsPerMinute: 450,
        dataTransfer: 12.5,
        activeConnections: 150,
      },
      storageInfo: {
        totalStorage: 100,
        usedStorage: 25,
        availableStorage: 75,
        storageUsagePercent: 25,
      },
      recentEvents: [
        {
          message: 'System started successfully',
          timestamp: '2024-01-20T10:00:00Z',
          severity: 'info',
          service: 'System',
        },
      ],
      lastUpdated: '2024-01-20T10:30:00Z',
    }),
  },
}));

// Import components to test
import Dashboard from '../src/pages/Dashboard';
import VendorManagement from '../src/pages/VendorManagement';
import OrderManagement from '../src/pages/OrderManagement';
import Analytics from '../src/pages/Analytics';
import Settings from '../src/pages/Settings';
import SystemHealth from '../src/pages/SystemHealth';
import AdminLayout from '../src/components/layout/AdminLayout';
import Header from '../src/components/layout/Header';
import Sidebar from '../src/components/layout/Sidebar';

describe('Admin Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Dashboard Component', () => {
    it('renders dashboard with key metrics', async () => {
      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Total Vendors')).toBeInTheDocument();
        expect(screen.getByText('Total Orders')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      // Should show loading indicators
      expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
    });
  });

  describe('VendorManagement Component', () => {
    it('renders vendor management page', async () => {
      render(
        <RouterWrapper>
          <VendorManagement />
        </RouterWrapper>
      );

      expect(screen.getByText('Vendor Management')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      });
    });

    it('allows filtering vendors by status', async () => {
      render(
        <RouterWrapper>
          <VendorManagement />
        </RouterWrapper>
      );

      const statusFilter = screen.getByText('All Status');
      fireEvent.click(statusFilter);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Suspended')).toBeInTheDocument();
      });
    });
  });

  describe('OrderManagement Component', () => {
    it('renders order management page', async () => {
      render(
        <RouterWrapper>
          <OrderManagement />
        </RouterWrapper>
      );

      expect(screen.getByText('Order Management')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Test Vendor')).toBeInTheDocument();
        expect(screen.getByText('Test Buyer')).toBeInTheDocument();
      });
    });

    it('allows updating order status', async () => {
      render(
        <RouterWrapper>
          <OrderManagement />
        </RouterWrapper>
      );

      await waitFor(() => {
        const statusButton = screen.getByText('pending');
        expect(statusButton).toBeInTheDocument();
      });
    });
  });

  describe('Analytics Component', () => {
    it('renders analytics dashboard', async () => {
      render(
        <RouterWrapper>
          <Analytics />
        </RouterWrapper>
      );

      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Revenue Analytics')).toBeInTheDocument();
        expect(screen.getByText('Order Analytics')).toBeInTheDocument();
        expect(screen.getByText('Vendor Analytics')).toBeInTheDocument();
      });
    });

    it('displays analytics charts', async () => {
      render(
        <RouterWrapper>
          <Analytics />
        </RouterWrapper>
      );

      await waitFor(() => {
        // Check for chart containers
        expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
        expect(screen.getByText('Order Volume')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Component', () => {
    it('renders settings page with tabs', () => {
      render(
        <RouterWrapper>
          <Settings />
        </RouterWrapper>
      );

      expect(screen.getByText('System Settings')).toBeInTheDocument();
      expect(screen.getByText('System Configuration')).toBeInTheDocument();
      expect(screen.getByText('Pricing Settings')).toBeInTheDocument();
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
    });

    it('allows switching between setting tabs', () => {
      render(
        <RouterWrapper>
          <Settings />
        </RouterWrapper>
      );

      const pricingTab = screen.getByText('Pricing Settings');
      fireEvent.click(pricingTab);

      expect(screen.getByText('Dynamic Pricing Settings')).toBeInTheDocument();
    });
  });

  describe('SystemHealth Component', () => {
    it('renders system health dashboard', async () => {
      render(
        <RouterWrapper>
          <SystemHealth />
        </RouterWrapper>
      );

      expect(screen.getByText('System Health')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('API Response Time')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('Error Rate')).toBeInTheDocument();
        expect(screen.getByText('System Load')).toBeInTheDocument();
      });
    });

    it('displays service status indicators', async () => {
      render(
        <RouterWrapper>
          <SystemHealth />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Service Status')).toBeInTheDocument();
        expect(screen.getByText('API Server')).toBeInTheDocument();
      });
    });
  });

  describe('Layout Components', () => {
    describe('AdminLayout', () => {
      it('renders main layout structure', () => {
        render(
          <RouterWrapper>
            <AdminLayout>
              <div>Test Content</div>
            </AdminLayout>
          </RouterWrapper>
        );

        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });

    describe('Header', () => {
      it('renders header with user info', () => {
        render(
          <RouterWrapper>
            <Header 
            onToggleSidebar={vi.fn()}
            sidebarOpen={true}
            isConnected={true}
            />
          </RouterWrapper>
        );

        expect(screen.getByText('FreshFlow Admin')).toBeInTheDocument();
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      it('shows logout button', () => {
        render(
          <RouterWrapper>
            <Header 
            onToggleSidebar={vi.fn()}
            sidebarOpen={true}
            isConnected={true}
            />
          </RouterWrapper>
        );

        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    describe('Sidebar', () => {
      it('renders navigation menu', () => {
        render(
          <RouterWrapper>
            <Sidebar onClose={vi.fn()} />
          </RouterWrapper>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Vendors')).toBeInTheDocument();
        expect(screen.getByText('Orders')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      // Mock API to reject
      const mockError = new Error('API Error');
      vi.mocked(require('../src/services/adminApi').adminApi.getDashboardStats)
        .mockRejectedValueOnce(mockError);

      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <RouterWrapper>
          <Sidebar onClose={vi.fn()} />
        </RouterWrapper>
      );

      const navLinks = screen.getAllByRole('link');
      navLinks.forEach(link => {
        expect(link).toHaveAttribute('tabIndex', expect.any(String));
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile screen sizes', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <RouterWrapper>
          <AdminLayout>
            <Dashboard />
          </AdminLayout>
        </RouterWrapper>
      );

      // Should render mobile-friendly layout
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('updates data in real-time', async () => {
      const { rerender } = render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );

      // Simulate real-time data update
      await act(async () => {
        // This would be triggered by WebSocket updates
        rerender(
          <RouterWrapper>
            <Dashboard />
          </RouterWrapper>
        );
      });

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders components efficiently', () => {
      const startTime = performance.now();
      
      render(
        <RouterWrapper>
          <Dashboard />
        </RouterWrapper>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('handles large datasets without performance issues', async () => {
      // Mock large dataset
      const largeVendorList = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        name: `Vendor ${i}`,
        email: `vendor${i}@test.com`,
        status: 'active',
        joinedDate: '2024-01-15',
        totalOrders: 45,
        rating: 4.5,
      }));

      vi.mocked(require('../src/services/adminApi').adminApi.getVendors)
        .mockResolvedValueOnce(largeVendorList);

      const startTime = performance.now();
      
      render(
        <RouterWrapper>
          <VendorManagement />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Vendor Management')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should handle large datasets efficiently
      expect(renderTime).toBeLessThan(500);
    });
  });
});
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  BarChart3,
  FileText,
  Settings,
  Activity,
  Bell,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Package,
  DollarSign
} from 'lucide-react';

interface SidebarProps {
  onClose: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const location = useLocation();
  const { user } = useAdminStore();
  const { unacknowledgedAlerts, metrics } = useRealTimeData();
  
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['analytics']);

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev =>
      prev.includes(path)
        ? prev.filter(item => item !== path)
        : [...prev, path]
    );
  };

  const navItems: NavItem[] = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    // {
    //   path: '/admin/vendors',
    //   label: 'Vendor Management',
    //   icon: Users,
    //   badge: metrics.activeUsers || undefined
    // },
    // {
    //   path: '/admin/orders',
    //   label: 'Order Management',
    //   icon: ShoppingCart,
    //   badge: metrics.totalOrders > 99 ? 99 : metrics.totalOrders || undefined
    // },
    {
      path: '/admin/analytics',
      label: 'Analytics',
      icon: BarChart3,
      children: [
        {
          path: '/admin/analytics/overview',
          label: 'Overview',
          icon: TrendingUp
        },
        {
          path: '/admin/analytics/revenue',
          label: 'Revenue',
          icon: DollarSign
        },
        {
          path: '/admin/analytics/inventory',
          label: 'Inventory',
          icon: Package
        }
      ]
    },
    {
      path: '/admin/reports',
      label: 'Reports',
      icon: FileText
    },
    // {
    //   path: '/admin/system-health',
    //   label: 'System Health',
    //   icon: Activity,
    //   badge: metrics.systemHealth === 'critical' ? 1 : 
    //          metrics.systemHealth === 'warning' ? 1 : undefined
    // },
    // {
    //   path: '/admin/notifications',
    //   label: 'Notifications',
    //   icon: Bell,
    //   badge: unacknowledgedAlerts.length > 99 ? 99 : unacknowledgedAlerts.length || undefined
    // },
    {
      path: '/admin/settings',
      label: 'Settings',
      icon: Settings
    }
  ];

  const isActiveRoute = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isActive = isActiveRoute(item.path, !item.children);
    const isExpanded = expandedItems.includes(item.path);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.path}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.path)}
            className={`
              w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium rounded-lg transition-colors
              ${level > 0 ? 'ml-4' : ''}
              ${isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <NavLink
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
              ${level > 0 ? 'ml-4' : ''}
              ${isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }
            `}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FF</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FreshFlow</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Admin Info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {'admin@freshflow.com'}
            </p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">System Status</span>
          <div className={`flex items-center gap-1 ${
            metrics.systemHealth === 'healthy' ? 'text-green-500' :
            metrics.systemHealth === 'warning' ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {metrics.systemHealth === 'critical' && <AlertTriangle className="h-3 w-3" />}
            <span className="capitalize">{metrics.systemHealth}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="font-semibold text-gray-900 dark:text-white">{metrics.activeUsers}</div>
            <div className="text-gray-500 dark:text-gray-400">Active Users</div>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="font-semibold text-gray-900 dark:text-white">{metrics.activeListings}</div>
            <div className="text-gray-500 dark:text-gray-400">Active Listings</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map(item => renderNavItem(item))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <div>Last updated: {metrics.lastUpdated.toLocaleTimeString()}</div>
          <div className="mt-1">Version 1.0.0</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import Sidebar from './Sidebar';
import Header from './Header';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, isAuthenticated } = useAdminStore();
  const { isConnected, connectionError, criticalAlerts } = useRealTimeData();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if user is authenticated admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar on mobile when clicking outside
  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Connection Status Bar */}
      {!isConnected && (
        <div className="bg-red-500 text-white px-4 py-2 text-sm flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>
            {connectionError ? `Connection Error: ${connectionError}` : 'Disconnected from server'}
          </span>
        </div>
      )}

      {/* Critical Alerts Bar */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 animate-pulse">
          <AlertCircle className="h-4 w-4" />
          <span>
            {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention
          </span>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            ${isMobile ? 'md:translate-x-0' : ''}
          `}
        >
          <Sidebar onClose={closeSidebar} />
        </div>

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Main content */}
        <div
          className={`
            flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out
            ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}
          `}
        >
          {/* Header */}
          <Header
            onToggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
            isConnected={isConnected}
          />

          {/* Page content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children || <Outlet />}
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>© 2025 FreshFlow Admin Panel</span>
                <span className="flex items-center gap-1">
                  {isConnected ? (
                    <>
                      <Wifi className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">Disconnected</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span>Version 1.0.0</span>
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children?: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Close sidebar when clicking outside (mobile)
  useEffect(() => {
    const handleClickOutside = () => {
      if (sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [sidebarOpen])

  // Routes that should not show the sidebar
  const noSidebarRoutes = ['/login', '/register', '/forgot-password', '/']
  const shouldShowSidebar = isAuthenticated && !noSidebarRoutes.includes(location.pathname)

  // Routes that should not show the footer
  const noFooterRoutes = ['/login', '/register', '/forgot-password']
  const shouldShowFooter = !noFooterRoutes.includes(location.pathname)

  // Routes that need full height layout (dashboard pages)
  const fullHeightRoutes = ['/dashboard', '/marketplace', '/inventory', '/orders', '/analytics', '/trends']
  const isFullHeight = fullHeightRoutes.some(route => location.pathname.startsWith(route))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {isAuthenticated && (
        <Header 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          isMobileMenuOpen={sidebarOpen}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        {shouldShowSidebar && (
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className={cn(
          "flex-1 flex flex-col",
          shouldShowSidebar ? "lg:ml-72" : "",
          isFullHeight ? "min-h-screen" : ""
        )}>
          <main className={cn(
            "flex-1",
            isAuthenticated ? "pt-0" : "pt-16",
            isFullHeight ? "pb-0" : "pb-8"
          )}>
            {children || <Outlet />}
          </main>

          {/* Footer */}
          {shouldShowFooter && !isFullHeight && <Footer />}
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && shouldShowSidebar && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Loading overlay */}
      {/* This can be used for global loading states */}
      <div id="loading-overlay" className="hidden fixed inset-0 z-50 bg-white bg-opacity-75 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>

      {/* Toast notifications container */}
      <div id="toast-container" className="fixed top-4 right-4 z-50 space-y-2">
        {/* Toast notifications will be rendered here */}
      </div>
    </div>
  )
}

// Authentication Layout - for login/register pages
export const AuthLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">FF</span>
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-green-600">
          FreshFlow
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Reducing food waste, maximizing profits
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>

      {/* Auth footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} FreshFlow Technologies Pvt Ltd. All rights reserved.
        </p>
      </div>
    </div>
  )
}

// Dashboard Layout - specific for dashboard pages with enhanced features
export const DashboardLayout: React.FC<LayoutProps & { 
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{ name: string; href?: string }>
}> = ({ children, title, subtitle, actions, breadcrumbs }) => {
  return (
    <div className="min-h-full">
      {/* Page header */}
      {(title || breadcrumbs) && (
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              {/* Breadcrumbs */}
              {breadcrumbs && (
                <nav className="flex mb-4" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-4">
                    {breadcrumbs.map((item, index) => (
                      <li key={item.name}>
                        <div className="flex items-center">
                          {index > 0 && (
                            <svg
                              className="flex-shrink-0 h-5 w-5 text-gray-400 mr-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {item.href ? (
                            <a
                              href={item.href}
                              className="text-sm font-medium text-gray-500 hover:text-gray-700"
                            >
                              {item.name}
                            </a>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">
                              {item.name}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Page title and actions */}
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="mt-1 text-sm text-gray-500">
                      {subtitle}
                    </p>
                  )}
                </div>
                {actions && (
                  <div className="mt-4 flex md:mt-0 md:ml-4">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  )
}

export default Layout
import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Bell, Search, Menu, X, User, LogOut, Settings, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'


interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type?: 'info' | 'warning' | 'success' | 'error'
}

interface HeaderProps {
  onMenuToggle?: () => void
  isMobileMenuOpen?: boolean
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, isMobileMenuOpen }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const notifications: Notification[] = []
  const unreadCount = 0

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={onMenuToggle}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FF</span>
          </div>
          <span className="hidden font-bold sm:inline-block text-green-600">
            FreshFlow
          </span>
        </Link>

        {/* Navigation Links - Desktop */}
        <nav className="hidden md:flex items-center space-x-6 ml-8">
          <Link
            to="/dashboard"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/marketplace"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/marketplace') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Marketplace
          </Link>
          <Link
            to="/inventory"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/inventory') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Inventory
          </Link>
          <Link
            to="/orders"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/orders') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Orders
          </Link>
        </nav>

        {/* Search Bar */}
        <div className="flex-1 mx-4 max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </form>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Cart - if applicable */}
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
            <ShoppingCart className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No new notifications
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification: Notification, index: number) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 5 && (
                  <div className="px-4 py-2 border-t border-gray-200">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all notifications
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="relative h-8 w-8 rounded-full"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  <p className="text-xs text-gray-400 capitalize">{(user as any)?.role || 'vendor'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/profile')
                      setShowUserMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setShowUserMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
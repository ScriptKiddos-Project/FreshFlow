import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Types for the store
interface User {
  id: string
  name: string
  email: string
  role: 'vendor' | 'admin'
  phone?: string
  address?: string
}

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  pricePerUnit: number
  expiryDate: string
  description?: string
  imageUrl?: string
  vendorId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface MarketplaceItem extends InventoryItem {
  vendor: {
    id: string
    name: string
    rating: number
    distance?: number
  }
}

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

interface Order {
  id: string
  vendorId: string
  buyerId: string
  items: Array<{
    itemId: string
    quantity: number
    pricePerUnit: number
    total: number
  }>
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  totalAmount: number
  deliveryAddress: string
  createdAt: string
  updatedAt: string
}

interface CartItem {
  itemId: string
  quantity: number
  pricePerUnit: number
  name: string
  unit: string
}

interface Filters {
  category?: string
  priceRange?: { min: number; max: number }
  location?: string
  expiryDays?: number
}

// Main store interface
interface AppStore {
  // Auth state
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null

  // Inventory state
  inventoryItems: InventoryItem[]
  isInventoryLoading: boolean
  inventoryError: string | null
  inventoryFilters: Filters

  // Marketplace state
  marketplaceItems: MarketplaceItem[]
  isMarketplaceLoading: boolean
  marketplaceError: string | null
  searchQuery: string
  marketplaceFilters: Filters
  pagination: { page: number; limit: number; total: number }
  cart: CartItem[]

  // Orders state
  orders: Order[]
  activeOrder: Order | null
  isOrdersLoading: boolean
  ordersError: string | null

  // Notifications state
  notifications: Notification[]
  unreadCount: number

  // App preferences
  theme: 'light' | 'dark'
  language: string

  // Auth actions
  login: (email: string, password: string) => Promise<void>
  register: (userData: Partial<User> & { password: string }) => Promise<void>
  logout: () => void
  updateProfile: (userData: Partial<User>) => Promise<void>
  setAuthError: (error: string | null) => void

  // Inventory actions
  fetchInventoryItems: () => Promise<void>
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>
  deleteInventoryItem: (id: string) => Promise<void>
  setInventoryFilters: (filters: Partial<Filters>) => void

  // Marketplace actions
  fetchMarketplaceItems: () => Promise<void>
  searchMarketplaceItems: (query: string) => Promise<void>
  setMarketplaceFilters: (filters: Partial<Filters>) => void
  addToCart: (item: CartItem) => void
  removeFromCart: (itemId: string) => void
  updateCartQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void

  // Order actions
  fetchOrders: () => Promise<void>
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  // App actions
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (language: string) => void
  resetStore: () => void
}

// Create the store
export const useAppStore = create<AppStore>()(
  devtools(
    immer(
      persist(
        (set) => ({
          // Initial auth state
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null,

          // Initial inventory state
          inventoryItems: [],
          isInventoryLoading: false,
          inventoryError: null,
          inventoryFilters: {},

          // Initial marketplace state
          marketplaceItems: [],
          isMarketplaceLoading: false,
          marketplaceError: null,
          searchQuery: '',
          marketplaceFilters: {},
          pagination: { page: 1, limit: 10, total: 0 },
          cart: [],

          // Initial orders state
          orders: [],
          activeOrder: null,
          isOrdersLoading: false,
          ordersError: null,

          // Initial notifications state
          notifications: [],
          unreadCount: 0,

          // Initial app preferences
          theme: 'light',
          language: 'en',

          // Auth actions
          login: async (email: string, password: string) => {
            set((state) => {
              state.isLoading = true
              state.authError = null
            })

            try {
              // TODO: Replace with actual API call
              console.log('Login attempt:', { email, password })
              
              // Mock successful login
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              const mockUser: User = {
                id: '1',
                name: 'Test Vendor',
                email,
                role: 'vendor'
              }
              
              const mockToken = 'mock-jwt-token'

              set((state) => {
                state.user = mockUser
                state.token = mockToken
                state.isAuthenticated = true
                state.isLoading = false
              })
            } catch (error) {
              set((state) => {
                state.authError = error instanceof Error ? error.message : 'Login failed'
                state.isLoading = false
              })
            }
          },

          register: async (userData) => {
            set((state) => {
              state.isLoading = true
              state.authError = null
            })

            try {
              // TODO: Replace with actual API call
              console.log('Register attempt:', userData)
              
              // Mock successful registration
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              const mockUser: User = {
                id: '2',
                name: userData.name || 'New Vendor',
                email: userData.email || '',
                role: 'vendor'
              }
              
              const mockToken = 'mock-jwt-token'

              set((state) => {
                state.user = mockUser
                state.token = mockToken
                state.isAuthenticated = true
                state.isLoading = false
              })
            } catch (error) {
              set((state) => {
                state.authError = error instanceof Error ? error.message : 'Registration failed'
                state.isLoading = false
              })
            }
          },

          logout: () => {
            set((state) => {
              state.user = null
              state.token = null
              state.isAuthenticated = false
              state.authError = null
              state.cart = []
              state.notifications = []
              state.unreadCount = 0
            })
          },

          updateProfile: async (userData) => {
            try {
              // TODO: Replace with actual API call
              console.log('Update profile:', userData)
              
              await new Promise(resolve => setTimeout(resolve, 500))

              set((state) => {
                if (state.user) {
                  state.user = { ...state.user, ...userData }
                }
              })
            } catch (error) {
              set((state) => {
                state.authError = error instanceof Error ? error.message : 'Profile update failed'
              })
            }
          },

          setAuthError: (error) => {
            set((state) => {
              state.authError = error
            })
          },

          // Inventory actions
          fetchInventoryItems: async () => {
            set((state) => {
              state.isInventoryLoading = true
              state.inventoryError = null
            })

            try {
              // TODO: Replace with actual API call
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              // Mock inventory items
              const mockItems: InventoryItem[] = [
                {
                  id: '1',
                  name: 'Fresh Tomatoes',
                  category: 'Vegetables',
                  quantity: 50,
                  unit: 'kg',
                  pricePerUnit: 25,
                  expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                  vendorId: '1',
                  isActive: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              ]

              set((state) => {
                state.inventoryItems = mockItems
                state.isInventoryLoading = false
              })
            } catch (error) {
              set((state) => {
                state.inventoryError = error instanceof Error ? error.message : 'Failed to fetch inventory'
                state.isInventoryLoading = false
              })
            }
          },

          addInventoryItem: async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
            try {
              // TODO: Replace with actual API call
              const newItem: InventoryItem = {
                ...item,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }

              set((state) => {
                state.inventoryItems.push(newItem)
              })
            } catch (error) {
              set((state) => {
                state.inventoryError = error instanceof Error ? error.message : 'Failed to add item'
              })
            }
          },

          updateInventoryItem: async (id: string, updates: Partial<InventoryItem>) => {
            try {
              // TODO: Replace with actual API call
              set((state) => {
                const index = state.inventoryItems.findIndex((item: InventoryItem) => item.id === id)
                if (index !== -1) {
                  state.inventoryItems[index] = {
                    ...state.inventoryItems[index],
                    ...updates,
                    updatedAt: new Date().toISOString()
                  }
                }
              })
            } catch (error) {
              set((state) => {
                state.inventoryError = error instanceof Error ? error.message : 'Failed to update item'
              })
            }
          },

          deleteInventoryItem: async (id: string) => {
            try {
              // TODO: Replace with actual API call
              set((state) => {
                state.inventoryItems = state.inventoryItems.filter((item: InventoryItem) => item.id !== id)
              })
            } catch (error) {
              set((state) => {
                state.inventoryError = error instanceof Error ? error.message : 'Failed to delete item'
              })
            }
          },

          setInventoryFilters: (filters) => {
            set((state) => {
              state.inventoryFilters = { ...state.inventoryFilters, ...filters }
            })
          },

          // Marketplace actions
          fetchMarketplaceItems: async () => {
            set((state) => {
              state.isMarketplaceLoading = true
              state.marketplaceError = null
            })

            try {
              // TODO: Replace with actual API call
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              const mockMarketplaceItems: MarketplaceItem[] = []

              set((state) => {
                state.marketplaceItems = mockMarketplaceItems
                state.isMarketplaceLoading = false
              })
            } catch (error) {
              set((state) => {
                state.marketplaceError = error instanceof Error ? error.message : 'Failed to fetch marketplace items'
                state.isMarketplaceLoading = false
              })
            }
          },

          searchMarketplaceItems: async (query) => {
            set((state) => {
              state.searchQuery = query
              state.isMarketplaceLoading = true
            })

            try {
              // TODO: Replace with actual API call
              await new Promise(resolve => setTimeout(resolve, 500))
              
              set((state) => {
                state.isMarketplaceLoading = false
              })
            } catch (error) {
              set((state) => {
                state.marketplaceError = error instanceof Error ? error.message : 'Search failed'
                state.isMarketplaceLoading = false
              })
            }
          },

          setMarketplaceFilters: (filters) => {
            set((state) => {
              state.marketplaceFilters = { ...state.marketplaceFilters, ...filters }
            })
          },

          addToCart: (item: CartItem) => {
            set((state) => {
              const existingIndex = state.cart.findIndex((cartItem: CartItem) => cartItem.itemId === item.itemId)
              if (existingIndex !== -1) {
                state.cart[existingIndex].quantity += item.quantity
              } else {
                state.cart.push(item)
              }
            })
          },

          removeFromCart: (itemId: string) => {
            set((state) => {
              state.cart = state.cart.filter((item: CartItem) => item.itemId !== itemId)
            })
          },

          updateCartQuantity: (itemId: string, quantity: number) => {
            set((state) => {
              const index = state.cart.findIndex((item: CartItem) => item.itemId === itemId)
              if (index !== -1) {
                if (quantity <= 0) {
                  state.cart.splice(index, 1)
                } else {
                  state.cart[index].quantity = quantity
                }
              }
            })
          },

          clearCart: () => {
            set((state) => {
              state.cart = []
            })
          },

          // Order actions
          fetchOrders: async () => {
            set((state) => {
              state.isOrdersLoading = true
              state.ordersError = null
            })

            try {
              // TODO: Replace with actual API call
              await new Promise(resolve => setTimeout(resolve, 1000))

              set((state) => {
                state.orders = []
                state.isOrdersLoading = false
              })
            } catch (error) {
              set((state) => {
                state.ordersError = error instanceof Error ? error.message : 'Failed to fetch orders'
                state.isOrdersLoading = false
              })
            }
          },

          createOrder: async (orderData) => {
            try {
              // TODO: Replace with actual API call
              const newOrder: Order = {
                ...orderData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }

              set((state) => {
                state.orders.push(newOrder)
                state.cart = [] // Clear cart after order
              })
            } catch (error) {
              set((state) => {
                state.ordersError = error instanceof Error ? error.message : 'Failed to create order'
              })
            }
          },

          updateOrderStatus: async (orderId: string, status: Order['status']) => {
            try {
              // TODO: Replace with actual API call
              set((state) => {
                const index = state.orders.findIndex((order: Order) => order.id === orderId)
                if (index !== -1) {
                  state.orders[index].status = status
                  state.orders[index].updatedAt = new Date().toISOString()
                }
              })
            } catch (error) {
              set((state) => {
                state.ordersError = error instanceof Error ? error.message : 'Failed to update order'
              })
            }
          },

          cancelOrder: async (orderId: string) => {
            try {
              // TODO: Replace with actual API call
              set((state) => {
                const index = state.orders.findIndex((order: Order) => order.id === orderId)
                if (index !== -1) {
                  state.orders[index].status = 'cancelled'
                  state.orders[index].updatedAt = new Date().toISOString()
                }
              })
            } catch (error) {
              set((state) => {
                state.ordersError = error instanceof Error ? error.message : 'Failed to cancel order'
              })
            }
          },

          // Notification actions
          addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
            set((state) => {
              const newNotification: Notification = {
                ...notification,
                id: Date.now().toString(),
                isRead: false,
                createdAt: new Date().toISOString()
              }
              state.notifications.unshift(newNotification)
              state.unreadCount = state.notifications.filter((n: Notification) => !n.isRead).length
            })
          },

          markAsRead: (id: string) => {
            set((state) => {
              const notification = state.notifications.find((n: Notification) => n.id === id)
              if (notification && !notification.isRead) {
                notification.isRead = true
                state.unreadCount = Math.max(0, state.unreadCount - 1)
              }
            })
          },

          markAllAsRead: () => {
            set((state) => {
              state.notifications.forEach((notification: Notification) => {
                notification.isRead = true
              })
              state.unreadCount = 0
            })
          },

          removeNotification: (id: string) => {
            set((state) => {
              const notification = state.notifications.find((n: Notification) => n.id === id)
              state.notifications = state.notifications.filter((n: Notification) => n.id !== id)
              if (notification && !notification.isRead) {
                state.unreadCount = Math.max(0, state.unreadCount - 1)
              }
            })
          },

          clearNotifications: () => {
            set((state) => {
              state.notifications = []
              state.unreadCount = 0
            })
          },

          // App actions
          setTheme: (theme) => {
            set((state) => {
              state.theme = theme
            })
            // Apply theme to document
            if (typeof document !== 'undefined') {
              document.documentElement.classList.toggle('dark', theme === 'dark')
            }
          },

          setLanguage: (language) => {
            set((state) => {
              state.language = language
            })
          },

          resetStore: () => {
            set((state) => {
              // Reset everything except persisted data
              state.inventoryItems = []
              state.marketplaceItems = []
              state.orders = []
              state.notifications = []
              state.cart = []
              state.unreadCount = 0
              state.isLoading = false
              state.isInventoryLoading = false
              state.isMarketplaceLoading = false
              state.isOrdersLoading = false
              state.authError = null
              state.inventoryError = null
              state.marketplaceError = null
              state.ordersError = null
            })
          }
        }),
        {
          name: 'freshflow-store',
          partialize: (state) => ({
            // Only persist essential data
            user: state.user,
            token: state.token,
            isAuthenticated: state.isAuthenticated,
            theme: state.theme,
            language: state.language,
          }),
        }
      )
    ),
    {
      name: 'FreshFlow Store',
    }
  )
)

// Selector hooks for easier component usage
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  token: state.token,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  authError: state.authError,
  login: state.login,
  register: state.register,
  logout: state.logout,
  updateProfile: state.updateProfile,
  setAuthError: state.setAuthError,
}))

export const useInventory = () => useAppStore((state) => ({
  items: state.inventoryItems,
  isLoading: state.isInventoryLoading,
  error: state.inventoryError,
  filters: state.inventoryFilters,
  fetchItems: state.fetchInventoryItems,
  addItem: state.addInventoryItem,
  updateItem: state.updateInventoryItem,
  deleteItem: state.deleteInventoryItem,
  setFilters: state.setInventoryFilters,
}))

export const useMarketplace = () => useAppStore((state) => ({
  items: state.marketplaceItems,
  isLoading: state.isMarketplaceLoading,
  error: state.marketplaceError,
  searchQuery: state.searchQuery,
  filters: state.marketplaceFilters,
  pagination: state.pagination,
  cart: state.cart,
  fetchItems: state.fetchMarketplaceItems,
  searchItems: state.searchMarketplaceItems,
  setFilters: state.setMarketplaceFilters,
  addToCart: state.addToCart,
  removeFromCart: state.removeFromCart,
  updateCartQuantity: state.updateCartQuantity,
  clearCart: state.clearCart,
}))

export const useOrders = () => useAppStore((state) => ({
  orders: state.orders,
  activeOrder: state.activeOrder,
  isLoading: state.isOrdersLoading,
  error: state.ordersError,
  fetchOrders: state.fetchOrders,
  createOrder: state.createOrder,
  updateOrderStatus: state.updateOrderStatus,
  cancelOrder: state.cancelOrder,
}))

export const useNotifications = () => useAppStore((state) => ({
  notifications: state.notifications,
  unreadCount: state.unreadCount,
  addNotification: state.addNotification,
  markAsRead: state.markAsRead,
  markAllAsRead: state.markAllAsRead,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}))

export const useTheme = () => useAppStore((state) => ({
  theme: state.theme,
  setTheme: state.setTheme,
}))

export const useLanguage = () => useAppStore((state) => ({
  language: state.language,
  setLanguage: state.setLanguage,
}))

// Development helper
if (process.env.NODE_ENV === 'development') {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.freshflowStore = useAppStore
  }
}

export default useAppStore
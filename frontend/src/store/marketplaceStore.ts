// frontend/src/store/marketplaceStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface MarketplaceItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  pricePerUnit: number
  originalPrice: number
  discount: number
  expiryDate: string
  quality: 'excellent' | 'good' | 'fair'
  description?: string
  imageUrl?: string
  vendorId: string
  vendorName: string
  vendorRating: number
  location: string
  distance?: number
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  id: string
  item: MarketplaceItem
  quantity: number
  totalPrice: number
}

export interface MarketplaceFilters {
  category?: string
  quality?: string
  priceRange?: {
    min: number
    max: number
  }
  location?: string
  maxDistance?: number
  expiryDateRange?: {
    from: string
    to: string
  }
  rating?: number
  sortBy?: 'price' | 'distance' | 'expiry' | 'rating'
  sortOrder?: 'asc' | 'desc'
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface MarketplaceStore {
  // State
  marketplaceItems: MarketplaceItem[]
  isMarketplaceLoading: boolean
  marketplaceError: string | null
  searchQuery: string
  marketplaceFilters: MarketplaceFilters
  pagination: Pagination
  cart: CartItem[]

  // Actions
  fetchMarketplaceItems: (page?: number, limit?: number) => Promise<void>
  searchItems: (query: string) => Promise<void>
  setMarketplaceFilters: (filters: MarketplaceFilters) => void
  addToCart: (item: MarketplaceItem, quantity: number) => void
  removeFromCart: (itemId: string) => void
  updateCartQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  resetMarketplace: () => void
  addNewListing: (item: MarketplaceItem) => void
  updateOrderStatus: (orderId: string, status: string) => void
}

export const useMarketplaceStore = create<MarketplaceStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    marketplaceItems: [],
    isMarketplaceLoading: false,
    marketplaceError: null,
    searchQuery: '',
    marketplaceFilters: {},
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    },
    cart: [],

    // Actions
    fetchMarketplaceItems: async (page = 1, limit = 10) => {
      try {
        set({ isMarketplaceLoading: true, marketplaceError: null })
        
        const { marketplaceFilters, searchQuery } = get()
        
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(searchQuery && { search: searchQuery }),
          ...(marketplaceFilters.category && { category: marketplaceFilters.category }),
          ...(marketplaceFilters.quality && { quality: marketplaceFilters.quality }),
          ...(marketplaceFilters.location && { location: marketplaceFilters.location }),
          ...(marketplaceFilters.sortBy && { sortBy: marketplaceFilters.sortBy }),
          ...(marketplaceFilters.sortOrder && { sortOrder: marketplaceFilters.sortOrder })
        })

        // TODO: Replace with actual API call
        const response = await fetch(`/api/marketplace?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch marketplace items')
        }

        const data = await response.json()
        
        set({
          marketplaceItems: data.items,
          pagination: {
            page: data.page,
            limit: data.limit,
            total: data.total,
            totalPages: data.totalPages
          },
          isMarketplaceLoading: false,
          marketplaceError: null
        })
      } catch (error) {
        set({
          isMarketplaceLoading: false,
          marketplaceError: error instanceof Error ? error.message : 'Failed to fetch items'
        })
      }
    },

    searchItems: async (query) => {
      set({ searchQuery: query })
      
      // Reset to first page when searching
      await get().fetchMarketplaceItems(1)
    },

    setMarketplaceFilters: (filters) => {
      set({ marketplaceFilters: filters })
      
      // Fetch items with new filters
      get().fetchMarketplaceItems(1)
    },

    addToCart: (item, quantity) => {
      const { cart } = get()
      const existingItem = cart.find(cartItem => cartItem.id === item.id)
      
      if (existingItem) {
        // Update quantity if item already in cart
        set((state) => ({
          cart: state.cart.map(cartItem =>
            cartItem.id === item.id
              ? {
                  ...cartItem,
                  quantity: cartItem.quantity + quantity,
                  totalPrice: (cartItem.quantity + quantity) * item.pricePerUnit
                }
              : cartItem
          )
        }))
      } else {
        // Add new item to cart
        set((state) => ({
          cart: [
            ...state.cart,
            {
              id: item.id,
              item,
              quantity,
              totalPrice: quantity * item.pricePerUnit
            }
          ]
        }))
      }
    },

    removeFromCart: (itemId) => {
      set((state) => ({
        cart: state.cart.filter(cartItem => cartItem.id !== itemId)
      }))
    },

    updateCartQuantity: (itemId, quantity) => {
      if (quantity <= 0) {
        get().removeFromCart(itemId)
        return
      }
      
      set((state) => ({
        cart: state.cart.map(cartItem =>
          cartItem.id === itemId
            ? {
                ...cartItem,
                quantity,
                totalPrice: quantity * cartItem.item.pricePerUnit
              }
            : cartItem
        )
      }))
    },

    clearCart: () => {
      set({ cart: [] })
    },

    resetMarketplace: () => {
      set({
        marketplaceItems: [],
        isMarketplaceLoading: false,
        marketplaceError: null,
        searchQuery: '',
        marketplaceFilters: {},
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        },
        cart: []
      })
    },

    addNewListing: (item) => {
      set((state) => ({
        marketplaceItems: [item, ...state.marketplaceItems]
      }))
    },

    updateOrderStatus: (orderId, status) => {
      // This would typically update orders in a separate orders state
      // For now, just log the update
      console.log(`Order ${orderId} status updated to: ${status}`)
    }
  }))
)
// frontend/src/store/authStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import storageService from '@/services/storage'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  businessName?: string
  address?: string
  city: string
  state: string
  pincode: string
  bio: string
  isVerified: boolean
  createdAt: string
  // Profile Stats Properties
  totalEarnings?: number
  activeListings?: number
  totalOrders?: number
  averageRating?: number
  accountType?: string
  twoFactorEnabled?: boolean
  // Business Details
  businessAddress?: string
  businessType?: 'street_vendor' | 'restaurant' | 'cafe' | 'hotel' | 'catering' | 'retailer' | 'wholesaler'
  gstNumber?: string
  operatingHours?: {
    open: string
    close: string
  }
  businessDetails?: {
    address: string
    [key: string]: any
  }
  // Additional properties
  joinedAt?: string
  isActive?: boolean
  avatar: string
  userType: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  businessName?: string
  address?: {
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
} | string;
}

export interface AuthState {
  // State
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  isAuthLoading: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  updateProfile: (userData: Partial<User>) => Promise<void>
  resetAuth: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAuthError: (error: string | null) => void
  initializeAuth: () => void
  forgotPassword: (email: string) => Promise<void>
  // Add these to AuthState interface in authStore.ts
  refreshToken: () => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
}

// Persistent state interface (only what we want to persist)
// interface PersistedAuthState {
//   user: User | null
//   token: string | null
//   isAuthenticated: boolean
// }

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
      isAuthLoading: false,

      // Initialize auth from storage
      initializeAuth: () => {
        const token = storageService.getAuthToken()
        const user = storageService.get<User>('user')
        if (token && user) {
          set({
            token,
            user,
            isAuthenticated: true
          })
          // TODO: Validate token with backend and get user data
        }
      },

      // Actions
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, isAuthLoading: true, authError: null })
          
          // TODO: Replace with actual API call
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })

          if (!response.ok) {
            throw new Error('Login failed')
          }

          const data = await response.json()
          
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            isAuthLoading: false,
            authError: null
          })

          // Store data using storage service
          storageService.setAuthToken(data.token)
          storageService.set('user', data.user)
          if (data.refreshToken) {
            storageService.setRefreshToken(data.refreshToken)
          }
        } catch (error) {
          set({
            isLoading: false,
            isAuthLoading: false,
            authError: error instanceof Error ? error.message : 'Login failed',
            isAuthenticated: false,
            user: null,
            token: null
          })
        }
      },

      register: async (userData: RegisterData) => {
        try {
          set({ isLoading: true, isAuthLoading: true, authError: null })
          
          // TODO: Replace with actual API call
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
          })

          if (!response.ok) {
            throw new Error('Registration failed')
          }

          const data = await response.json()
          
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            isAuthLoading: false,
            authError: null
          })

          // Store data using storage service
          storageService.setAuthToken(data.token)
          storageService.set('user', data.user)
          if (data.refreshToken) {
            storageService.setRefreshToken(data.refreshToken)
          }
        } catch (error) {
          set({
            isLoading: false,
            isAuthLoading: false,
            authError: error instanceof Error ? error.message : 'Registration failed',
            isAuthenticated: false,
            user: null,
            token: null
          })
        }
      },

      forgotPassword: async (email: string) => {
        try {
          set({ isLoading: true, isAuthLoading: true, authError: null })
          
          // TODO: Replace with actual API call
          const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          })

          if (!response.ok) {
            throw new Error('Failed to send reset email')
          }

          set({
            isLoading: false,
            isAuthLoading: false,
            authError: null
          })
        } catch (error) {
          set({
            isLoading: false,
            isAuthLoading: false,
            authError: error instanceof Error ? error.message : 'Failed to send reset email'
          })
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          authError: null
        })

        // Clear data from storage
        storageService.clearAuthTokens()
        storageService.remove('user')
      },

      updateProfile: async (userData: Partial<User>) => {
        try {
          set({ isLoading: true, isAuthLoading: true, authError: null })
          
          const { token } = get()
          
          // TODO: Replace with actual API call
          const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
          })

          if (!response.ok) {
            throw new Error('Profile update failed')
          }

          const updatedUser = await response.json()
          
          set({
            user: updatedUser,
            isLoading: false,
            isAuthLoading: false,
            authError: null
          })

          // Update user in storage
          storageService.set('user', updatedUser)
        } catch (error) {
          set({
            isLoading: false,
            isAuthLoading: false,
            authError: error instanceof Error ? error.message : 'Profile update failed'
          })
        }
      },

      resetAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null,
          isAuthLoading: false
        })
        storageService.clearAuthTokens()
        storageService.remove('user')
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading, isAuthLoading: loading })
      },

      setError: (error: string | null) => {
        set({ authError: error })
      },

      setAuthError: (error: string | null) => {
        set({ authError: error })
      }
    }),
    {
      name: 'auth-store'
    }
  )
)

// Initialize auth on store creation
useAuthStore.getState().initializeAuth()

export default useAuthStore
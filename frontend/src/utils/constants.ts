// App Constants
export const APP_NAME = 'FreshFlow'
export const APP_DESCRIPTION = 'Dynamic Pricing & Expiry Prevention Network for Street Food Vendors'
export const APP_VERSION = '1.0.0'

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'freshflow_auth_token',
  REFRESH_TOKEN: 'freshflow_refresh_token',
  USER_DATA: 'freshflow_user_data',
  CART: 'freshflow_cart',
  SEARCH_HISTORY: 'freshflow_search_history',
  PREFERENCES: 'freshflow_preferences',
  THEME: 'freshflow_theme',
  LOCATION: 'freshflow_location'
} as const

// User Roles
export const USER_ROLES = {
  VENDOR: 'vendor',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
} as const

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
  BANNED: 'banned'
} as const

// Ingredient Categories
export const INGREDIENT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Spices',
  'Grains',
  'Dairy',
  'Meat',
  'Seafood',
  'Oils',
  'Condiments',
  'Snacks',
  'Beverages',
  'Other'
] as const

// Units of Measurement
export const UNITS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'l', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (mL)' },
  { value: 'piece', label: 'Piece' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'packet', label: 'Packet' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' }
] as const

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
} as const

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
} as const

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  UPI: 'upi',
  CARD: 'card',
  NET_BANKING: 'net_banking',
  WALLET: 'wallet'
} as const

// Notification Types
export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  PAYMENT: 'payment',
  PRICE_ALERT: 'price_alert',
  EXPIRY_ALERT: 'expiry_alert',
  SYSTEM: 'system',
  MARKETING: 'marketing'
} as const

// Notification Status
export const NOTIFICATION_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  ARCHIVED: 'archived'
} as const

// Price Alert Types
export const PRICE_ALERT_TYPES = {
  PRICE_DROP: 'price_drop',
  PRICE_INCREASE: 'price_increase',
  AVAILABILITY: 'availability',
  EXPIRY_DISCOUNT: 'expiry_discount'
} as const

// Sort Options
export const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
  { value: 'freshness', label: 'Freshness' },
  { value: 'discount', label: 'Discount' },
  { value: 'latest', label: 'Latest First' }
] as const

// Filter Options
export const FILTER_OPTIONS = {
  PRICE_RANGES: [
    { min: 0, max: 50, label: 'Under ₹50' },
    { min: 50, max: 100, label: '₹50 - ₹100' },
    { min: 100, max: 200, label: '₹100 - ₹200' },
    { min: 200, max: 500, label: '₹200 - ₹500' },
    { min: 500, max: Infinity, label: 'Above ₹500' }
  ],
  DISTANCE_RANGES: [
    { max: 1, label: 'Within 1km' },
    { max: 5, label: 'Within 5km' },
    { max: 10, label: 'Within 10km' },
    { max: 25, label: 'Within 25km' }
  ],
  FRESHNESS_LEVELS: [
    { value: 'fresh', label: 'Fresh (3+ days)' },
    { value: 'good', label: 'Good (1-3 days)' },
    { value: 'urgent', label: 'Urgent (<1 day)' }
  ]
} as const

// Image Configuration
export const IMAGE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  DIMENSIONS: {
    THUMBNAIL: { width: 150, height: 150 },
    SMALL: { width: 300, height: 300 },
    MEDIUM: { width: 600, height: 600 },
    LARGE: { width: 1200, height: 1200 }
  }
} as const

// Validation Rules
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false
  },
  PHONE: {
    LENGTH: 10,
    PATTERN: /^[6-9]\d{9}$/
  },
  PINCODE: {
    LENGTH: 6,
    PATTERN: /^[1-9][0-9]{5}$/
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  },
  DESCRIPTION: {
    MAX_LENGTH: 500
  }
} as const

// Business Rules
export const BUSINESS_RULES = {
  MIN_ORDER_VALUE: 50,
  DELIVERY_CHARGES: 20,
  FREE_DELIVERY_THRESHOLD: 200,
  EXPIRY_ALERT_DAYS: 2,
  PRICE_ALERT_PERCENTAGE: 10,
  MAX_CART_ITEMS: 50,
  MAX_WISHLIST_ITEMS: 100,
  RATING_SCALE: { MIN: 1, MAX: 5 }
} as const

// Time Constants
export const TIME_CONSTANTS = {
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  ACCESS_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  OTP_EXPIRY: 10 * 60 * 1000, // 10 minutes
  SEARCH_DEBOUNCE: 300, // 300ms
  AUTO_REFRESH_INTERVAL: 30 * 1000, // 30 seconds
  PRICE_UPDATE_INTERVAL: 5 * 60 * 1000, // 5 minutes
  NOTIFICATION_TIMEOUT: 5000 // 5 seconds
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  EXPIRED_SESSION: 'Your session has expired. Please login again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_EXISTS: 'An account with this email already exists.',
  PHONE_EXISTS: 'An account with this phone number already exists.',
  WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, and number.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PHONE: 'Please enter a valid 10-digit phone number.',
  REQUIRED_FIELD: 'This field is required.',
  FILE_TOO_LARGE: 'File size must be less than 5MB.',
  INVALID_FILE_TYPE: 'Only JPG, PNG, and WebP files are allowed.',
  LOCATION_PERMISSION: 'Location permission is required for this feature.',
  CAMERA_PERMISSION: 'Camera permission is required to take photos.'
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Logged in successfully!',
  LOGOUT: 'Logged out successfully!',
  REGISTRATION: 'Account created successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  ORDER_PLACED: 'Order placed successfully!',
  ORDER_CANCELLED: 'Order cancelled successfully!',
  ITEM_ADDED_TO_CART: 'Item added to cart!',
  ITEM_REMOVED_FROM_CART: 'Item removed from cart!',
  INGREDIENT_LISTED: 'Ingredient listed successfully!',
  INGREDIENT_UPDATED: 'Ingredient updated successfully!',
  INGREDIENT_REMOVED: 'Ingredient removed successfully!',
  PRICE_ALERT_SET: 'Price alert set successfully!',
  NOTIFICATION_MARKED_READ: 'Notification marked as read!',
  SETTINGS_SAVED: 'Settings saved successfully!'
} as const

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  MARKETPLACE: '/marketplace',
  INVENTORY: '/inventory',
  ORDERS: '/orders',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
  HELP: '/help',
  NOT_FOUND: '/404'
} as const

// Socket Events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  PRICE_UPDATE: 'price_update',
  NEW_ORDER: 'new_order',
  ORDER_UPDATE: 'order_update',
  NOTIFICATION: 'notification',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  MESSAGE: 'message'
} as const

// Analytics Events
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  INGREDIENT_VIEW: 'ingredient_view',
  INGREDIENT_SEARCH: 'ingredient_search',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  ORDER_INITIATED: 'order_initiated',
  ORDER_COMPLETED: 'order_completed',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  SHARE_INGREDIENT: 'share_ingredient',
  PRICE_ALERT_SET: 'price_alert_set'
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_PRICE_ALERTS: true,
  ENABLE_CHAT: false,
  ENABLE_VIDEO_CALLS: false,
  ENABLE_ANALYTICS: true,
  ENABLE_A_B_TESTING: false,
  ENABLE_DARK_MODE: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_LOCATION_TRACKING: true,
  ENABLE_REVIEWS: true
} as const

// Environment Configuration
export const ENV_CONFIG = {
  DEVELOPMENT: import.meta.env.DEV,
  PRODUCTION: import.meta.env.PROD,
  API_URL: import.meta.env.VITE_API_BASE_URL,
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
  CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  RAZORPAY_KEY: import.meta.env.VITE_RAZORPAY_KEY,
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN
} as const
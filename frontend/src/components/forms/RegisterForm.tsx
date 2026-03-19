export interface User {
  id: string
  name: string
  email: string
  phone: string
  businessName: string
  businessType: BusinessType
  address: Address
  isVerified: boolean
  isApproved: boolean
  createdAt: string
  updatedAt: string
}

export type BusinessType = 
  | "street_vendor" 
  | "restaurant" 
  | "cafe" 
  | "hotel" 
  | "catering"
  | "other"  // Added this line

export interface Address {
  street: string
  city: string
  state: string
  pincode: string
  country: string
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  phone: string
  password: string
  businessName: string
  businessType: BusinessType  // This now includes 'other'
  address: Address
}

export interface AuthResponse {
  success: boolean
  message: string
  user: User
  token: string
  refreshToken: string
}

export interface AuthError {
  success: false
  message: string
  errors?: Record<string, string>
}

export interface ResetPasswordData {
  email: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UpdateProfileData {
  name?: string
  phone?: string
  businessName?: string
  businessType?: BusinessType
  address?: Partial<Address>
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  error: string | null
}

// JWT Token payload interface
export interface TokenPayload {
  userId: string
  email: string
  businessType: BusinessType
  isVerified: boolean
  isApproved: boolean
  iat: number
  exp: number
}
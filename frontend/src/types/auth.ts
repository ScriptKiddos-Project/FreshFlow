export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: 'street_vendor' | 'restaurant' | 'cafe' | 'hotel' | 'catering';
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  isVerified: boolean;
  isActive: boolean;
  avatar?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  operatingHours: {
    open: string;
    close: string;
    days: string[];
  };
  rating: number;
  totalOrders: number;
  totalSales: number;
  totalEarnings?: number;
  joinedAt: string;
  lastActive: string;
  createdAt: string;
  bio?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessType: 'street_vendor' | 'restaurant' | 'cafe' | 'hotel' | 'catering';
  address: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
  };
  businessAddress?: string;
  gstNumber?: string;
  fssaiNumber?: string;
  name?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  operatingHours?: {
    open: string;
    close: string;
    days: string[];
  };
  termsAccepted?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}
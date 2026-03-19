import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  businessType: 'street_vendor' | 'restaurant' | 'cafe' | 'hotel' | 'catering'; // ✅ FIXED: Use union type
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
  // ✅ Additional properties that your store might expect
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

// ✅ FIXED: Extended User interface to include missing properties
interface ExtendedUser {
  businessName?: string;
  businessType?: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  businessAddress?: any;
  role?: string;
  permissions?: string[];
  [key: string]: any; // Allow additional properties
}

export const useAuth = () => {
  const navigate = useNavigate();
  
  // ✅ FIXED: Destructure properties that actually exist in your AuthSlice
  const {
    user,
    token,
    isAuthenticated,
    isAuthLoading, // ✅ Your store uses 'isAuthLoading' not 'isLoading'
    authError,     // ✅ Your store uses 'authError' not 'error'
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    updateProfile,
    refreshToken,
    setAuthError,  // ✅ Your store uses 'setAuthError' not 'clearError'
    resetAuth,
    verifyEmail,
    forgotPassword,
    resetPassword
  } = useAuthStore();

  // ✅ FIXED: Map to expected names for backward compatibility
  const isLoading = isAuthLoading;
  const error = authError;
  const clearError = useCallback(() => setAuthError(null), [setAuthError]);

  // Auto logout on token expiry
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (payload.exp < currentTime) {
          handleLogout();
          toast.error('Session expired. Please login again.');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        handleLogout();
      }
    }
  }, [token]);

  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      clearError();
      
      // ✅ FIXED: Pass only the credentials your store expects
      // const loginData = {
      //   email: credentials.email,
      //   password: credentials.password
      // };
      
      await storeLogin(credentials.email, credentials.password);
      
      if (credentials.rememberMe) {
        localStorage.setItem('freshflow_remember', 'true');
      }
      
      toast.success('Welcome back! Login successful.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
      throw error;
    }
  }, [storeLogin, navigate, clearError]);

  const handleRegister = useCallback(async (data: RegisterData) => {
    try {
      clearError();
      
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // ✅ FIXED: Validate businessType
      const validBusinessTypes = ['street_vendor', 'restaurant', 'cafe', 'hotel', 'catering'] as const;
      if (!validBusinessTypes.includes(data.businessType as any)) {
        throw new Error('Invalid business type selected');
      }

      // ✅ FIXED: Create payload that matches your RegisterData interface
      const registerPayload = {
        businessName: data.businessName,
        ownerName: data.ownerName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword,
        businessType: data.businessType,
        address: data.address,
        businessAddress: `${data.address.street}, ${data.address.area}, ${data.address.city}, ${data.address.state} ${data.address.pincode}`, // ✅ FIXED: Convert address object to string
        gstNumber: data.gstNumber,
        fssaiNumber: data.fssaiNumber,
        // Add optional fields with defaults
        name: data.name || data.businessName,
        coordinates: data.coordinates || {
          lat: 0,
          lng: 0
        },
        operatingHours: data.operatingHours || {
          open: "09:00",
          close: "18:00", 
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        termsAccepted: data.termsAccepted || true
      };

      await storeRegister(registerPayload);
      toast.success('Registration successful! Welcome to FreshFlow.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
      throw error;
    }
  }, [storeRegister, navigate, clearError]);

  const handleLogout = useCallback(async () => {
    try {
      storeLogout();
      localStorage.removeItem('freshflow_remember');
      localStorage.removeItem('freshflow_tour_completed');
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      // Silent fail for logout
      console.error('Logout error:', error);
      navigate('/login');
    }
  }, [storeLogout, navigate]);

  const handleRefreshToken = useCallback(async () => {
    try {
      await refreshToken();
      return true;
    } catch (error) {
      handleLogout();
      return false;
    }
  }, [refreshToken, handleLogout]);

  const handleUpdateProfile = useCallback(async (updates: Partial<any>) => {
    try {
      await updateProfile(updates);
      toast.success('Profile updated successfully');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
      return false;
    }
  }, [updateProfile]);

  const handleChangePassword = useCallback(async (_currentPassword: string, _newPassword: string) => {
    try {
      // ✅ Note: Your store doesn't have changePassword, but has resetPassword
      // You might need to implement this or use resetPassword with a token
      console.warn('Change password not implemented. Consider using resetPassword flow.');
      toast.error('Change password feature not yet implemented');
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
      return false;
    }
  }, []);

  const handleVerifyEmail = useCallback(async (token: string) => {
    try {
      await verifyEmail(token);
      toast.success('Email verified successfully');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Email verification failed');
      return false;
    }
  }, [verifyEmail]);

  const handleForgotPassword = useCallback(async (email: string) => {
    try {
      await forgotPassword(email);
      toast.success('Password reset email sent');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
      return false;
    }
  }, [forgotPassword]);

  const handleResetPassword = useCallback(async (token: string, password: string) => {
    try {
      await resetPassword(token, password);
      toast.success('Password reset successfully');
      navigate('/dashboard');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Password reset failed');
      return false;
    }
  }, [resetPassword, navigate]);

  const isTokenExpiringSoon = useCallback(() => {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeToExpiry = payload.exp - currentTime;
      
      // Token expires in less than 5 minutes
      return timeToExpiry < 300;
    } catch {
      return true;
    }
  }, [token]);

  const getUserRole = useCallback(() => {
    return (user as ExtendedUser)?.role || 'vendor';
  }, [user]);

  const hasPermission = useCallback((permission: string) => {
    const extendedUser = user as ExtendedUser;
    const userPermissions = extendedUser?.permissions || [];
    return userPermissions.includes(permission) || extendedUser?.role === 'admin';
  }, [user]);

  // ✅ FIXED: Type assertion to access verificationStatus property
  const getBusinessInfo = useCallback(() => {
    const extendedUser = user as ExtendedUser;
    return {
      businessName: extendedUser?.businessName || '',
      businessType: extendedUser?.businessType || '',
      isVerified: extendedUser?.isVerified || false,
      verificationStatus: extendedUser?.verificationStatus || 'pending',
      businessAddress: extendedUser?.businessAddress || null
    };
  }, [user]);

  return {
    // State - properly mapped from your AuthSlice
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    
    // Actions - all available in your store
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshToken: handleRefreshToken,
    updateProfile: handleUpdateProfile,
    changePassword: handleChangePassword, // Note: not fully implemented
    clearError,
    resetAuth,
    
    // Additional auth actions from your store
    verifyEmail: handleVerifyEmail,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    
    // Utils
    isTokenExpiringSoon,
    getUserRole,
    hasPermission,
    getBusinessInfo
  };
};
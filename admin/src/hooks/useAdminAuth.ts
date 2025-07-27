import { useState, useEffect, useCallback } from 'react';
import { useAdminStore } from '../store/adminStore';
import adminApi from '../services/adminApi'; // Changed: using default import
import { AdminUser, AdminPermission, AdminRole } from '../types/admin';

interface UseAdminAuthReturn {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: AdminRole | null;
  loading: boolean;
  permissions: AdminPermission[];
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: AdminPermission) => boolean;
  hasRole: (role: AdminRole) => boolean;
  updateProfile: (data: Partial<AdminUser>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  enableTwoFactor: () => Promise<{ qrCode: string; secret: string }>;
  verifyTwoFactor: (token: string) => Promise<void>;
  disableTwoFactor: (password: string) => Promise<void>;
}

export const useAdminAuth = (): UseAdminAuthReturn => {
  const {
    user,
    isAuthenticated,
    permissions,
    role,
    setUser,
    setAuthenticated,
    setPermissions,
    setRole,
    clearAuth
  } = useAdminStore();

  const [isLoading, setIsLoading] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          setIsLoading(true);
          // Set auth header for the API instance
          if (adminApi.auth) {
            await refreshToken();
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          clearAuth();
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminRefreshToken');
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
  }, [clearAuth]);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await adminApi.auth.login({ email, password });

      const { admin, token, refreshToken } = response;

      // Store tokens
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminRefreshToken', refreshToken);

      // Convert string permissions to AdminPermission type (with type assertion)
      const adminPermissions = (admin.permissions || []) as AdminPermission[];

      // Update store with proper AdminUser structure
      const adminUser: AdminUser = {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role as AdminRole,
        isActive: true,
        permissions: adminPermissions.map(p => ({ 
          id: p, 
          name: p, 
          resource: '', 
          action: '' 
        })) || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setUser(adminUser);
      setAuthenticated(true);
      setPermissions(adminPermissions);
      setRole(admin.role as AdminRole);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setAuthenticated, setPermissions, setRole]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await adminApi.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
      clearAuth();
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      setIsLoading(false);
    }
  }, [clearAuth]);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const refreshTokenValue = localStorage.getItem('adminRefreshToken');
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await adminApi.auth.refreshToken(refreshTokenValue);
      const { token } = response;

      // Update tokens
      localStorage.setItem('adminToken', token);

      // Get updated profile
      const profile = await adminApi.auth.getProfile();
      
      // Convert string permissions to AdminPermission type (with type assertion)
      const adminPermissions = (profile.permissions || []) as AdminPermission[];
      
      // Update store with proper AdminUser structure
      const adminUser: AdminUser = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role as AdminRole,
        isActive: true,
        permissions: adminPermissions.map(p => ({ 
          id: p, 
          name: p, 
          resource: '', 
          action: '' 
        })) || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setUser(adminUser);
      setAuthenticated(true);
      setPermissions(adminPermissions);
      setRole(profile.role as AdminRole);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }, [setUser, setAuthenticated, setPermissions, setRole]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission: AdminPermission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  // Check if user has specific role
  const hasRole = useCallback((targetRole: AdminRole): boolean => {
    if (!role) return false;
    
    // Define role hierarchy - Fixed: added 'moderator' role
    const roleHierarchy: Record<AdminRole, number> = {
      'super_admin': 4,
      'admin': 3,
      'moderator': 2, // Added missing moderator role
      'viewer': 1     // Changed from 'analyst' to 'viewer' to match AdminRole type
    };

    return roleHierarchy[role] >= roleHierarchy[targetRole];
  }, [role]);

  // Update profile
  const updateProfile = useCallback(async (data: Partial<AdminUser>): Promise<void> => {
    try {
      setIsLoading(true);
      // Note: This would need to be implemented in the API
      // const response = await adminApi.auth.updateProfile(data);
      // setUser(response.user);
      
      // For now, update local user state
      if (user) {
        setUser({ ...user, ...data });
      }
    } catch (error: any) {
      console.error('Profile update failed:', error);
      throw new Error(error.message || 'Profile update failed');
    } finally {
      setIsLoading(false);
    }
  }, [setUser, user]);

  // Change password
  const changePassword = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      // Note: This would need to be implemented in the API
      // await adminApi.auth.changePassword({ currentPassword, newPassword });
      console.log('Change password called', { currentPassword: '***', newPassword: '***' });
    } catch (error: any) {
      console.error('Password change failed:', error);
      throw new Error(error.message || 'Password change failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enable two-factor authentication
  const enableTwoFactor = useCallback(async (): Promise<{ qrCode: string; secret: string }> => {
    try {
      setIsLoading(true);
      // Note: This would need to be implemented in the API
      // const response = await adminApi.auth.enableTwoFactor();
      // return response;
      
      // Mock response for now
      return {
        qrCode: 'mock-qr-code',
        secret: 'mock-secret'
      };
    } catch (error: any) {
      console.error('Failed to enable 2FA:', error);
      throw new Error(error.message || 'Failed to enable 2FA');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify two-factor authentication
  const verifyTwoFactor = useCallback(async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      // Note: This would need to be implemented in the API
      // await adminApi.auth.verifyTwoFactor(token);
      console.log('Verify 2FA called with token:', token);
      
      // Refresh user data to get updated 2FA status
      await refreshToken();
    } catch (error: any) {
      console.error('2FA verification failed:', error);
      throw new Error(error.message || '2FA verification failed');
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  // Disable two-factor authentication
  const disableTwoFactor = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      // Note: This would need to be implemented in the API
      // await adminApi.auth.disableTwoFactor(password);
      console.log('Disable 2FA called with password:', '***');
      
      // Refresh user data to get updated 2FA status
      await refreshToken();
    } catch (error: any) {
      console.error('Failed to disable 2FA:', error);
      throw new Error(error.message || 'Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken]);

  return {
    user,
    isAuthenticated,
    isLoading,
    role,
    loading: isLoading,
    permissions: permissions as AdminPermission[],
    initializeAuth: refreshToken,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    updateProfile,
    changePassword,
    enableTwoFactor,
    verifyTwoFactor,
    disableTwoFactor
  };
};
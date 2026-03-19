// src/services/auth.service.ts
import { apiService } from './api';
import { ApiResponse, User } from '@/types/common.types';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  vendorType: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

class AuthService {
  private readonly baseUrl = '/auth';

  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return await apiService.post<LoginResponse>(
      `${this.baseUrl}/login`, 
      credentials
    );
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    return await apiService.post<LoginResponse>(
      `${this.baseUrl}/register`, 
      userData
    );
  }

  async logout(): Promise<ApiResponse<void>> {
    return await apiService.post<void>(`${this.baseUrl}/logout`);
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return await apiService.get<User>(`${this.baseUrl}/profile`);
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return await apiService.patch<User>(
      `${this.baseUrl}/profile`, 
      userData
    );
  }

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    return await apiService.patch<void>(
      `${this.baseUrl}/change-password`, 
      data
    );
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<void>> {
    return await apiService.post<void>(
      `${this.baseUrl}/forgot-password`, 
      data
    );
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<void>> {
    return await apiService.post<void>(
      `${this.baseUrl}/reset-password`, 
      data
    );
  }

  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return await apiService.post<void>(
      `${this.baseUrl}/verify-email`, 
      { token }
    );
  }

  async resendVerificationEmail(): Promise<ApiResponse<void>> {
    return await apiService.post<void>(
      `${this.baseUrl}/resend-verification`
    );
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return await apiService.post<{ token: string }>(
      `${this.baseUrl}/refresh-token`
    );
  }

  // Upload profile picture
  async uploadProfilePicture(file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    return await apiService.uploadFile<{ imageUrl: string }>(
      `${this.baseUrl}/upload-avatar`,
      file
    );
  }

  // Validate token
  async validateToken(token: string): Promise<ApiResponse<{ valid: boolean }>> {
    return await apiService.post<{ valid: boolean }>(
      `${this.baseUrl}/validate-token`,
      { token }
    );
  }

  // Check if email exists
  async checkEmailExists(email: string): Promise<ApiResponse<{ exists: boolean }>> {
    return await apiService.get<{ exists: boolean }>(
      `${this.baseUrl}/check-email?email=${encodeURIComponent(email)}`
    );
  }

  // Check if phone exists
  async checkPhoneExists(phone: string): Promise<ApiResponse<{ exists: boolean }>> {
    return await apiService.get<{ exists: boolean }>(
      `${this.baseUrl}/check-phone?phone=${encodeURIComponent(phone)}`
    );
  }

  // Update location
  async updateLocation(location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    pincode: string;
  }): Promise<ApiResponse<User>> {
    return await apiService.patch<User>(
      `${this.baseUrl}/location`,
      { location }
    );
  }

  // Delete account
  async deleteAccount(password: string): Promise<ApiResponse<void>> {
    return await apiService.delete<void>(
      `${this.baseUrl}/account`,
      {
        data: { password }
      }
    );
  }

  // Get user activities/logs
  async getUserActivities(page = 1, limit = 20): Promise<ApiResponse<{
    activities: Array<{
      id: string;
      action: string;
      description: string;
      ipAddress: string;
      userAgent: string;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    return await apiService.get(
      `${this.baseUrl}/activities?page=${page}&limit=${limit}`
    );
  }

  // Two-factor authentication methods
  async enableTwoFactor(): Promise<ApiResponse<{ 
    secret: string; 
    qrCode: string; 
    backupCodes: string[] 
  }>> {
    return await apiService.post(`${this.baseUrl}/2fa/enable`);
  }

  async confirmTwoFactor(token: string): Promise<ApiResponse<{ 
    backupCodes: string[] 
  }>> {
    return await apiService.post(`${this.baseUrl}/2fa/confirm`, { token });
  }

  async disableTwoFactor(password: string): Promise<ApiResponse<void>> {
    return await apiService.post(`${this.baseUrl}/2fa/disable`, { password });
  }

  async verifyTwoFactor(token: string): Promise<ApiResponse<void>> {
    return await apiService.post(`${this.baseUrl}/2fa/verify`, { token });
  }

  // Social login methods
  async googleLogin(token: string): Promise<ApiResponse<LoginResponse>> {
    return await apiService.post<LoginResponse>(
      `${this.baseUrl}/google`,
      { token }
    );
  }

  async facebookLogin(token: string): Promise<ApiResponse<LoginResponse>> {
    return await apiService.post<LoginResponse>(
      `${this.baseUrl}/facebook`,
      { token }
    );
  }
}

export const authService = new AuthService();
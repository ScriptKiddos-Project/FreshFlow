// Local Storage Service for FreshFlow App
// Handles all client-side data persistence with error handling and type safety

interface StorageData {
  [key: string]: any;
}

interface CachedData<T = any> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

class StorageService {
  private prefix = 'freshflow_';
  private defaultExpiration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Check if localStorage is available
  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      console.warn('localStorage is not available');
      return false;
    }
  }

  // Get prefixed key
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  // Basic storage operations
  public set<T>(key: string, value: T, expirationMs?: number): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      const cachedData: CachedData<T> = {
        data: value,
        timestamp: Date.now(),
        expiresAt: expirationMs ? Date.now() + expirationMs : undefined,
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(cachedData));
      return true;
    } catch (error) {
      console.error(`Failed to save to localStorage: ${key}`, error);
      return false;
    }
  }

  public get<T>(key: string, defaultValue: T): T;
  public get<T>(key: string): T | null;
  public get<T>(key: string, defaultValue?: T): T | null {
    if (!this.isStorageAvailable()) return defaultValue ?? null;

    try {
      const item = localStorage.getItem(this.getKey(key));
      if (!item) return defaultValue ?? null;

      const cachedData: CachedData<T> = JSON.parse(item);

      // Check if data has expired
      if (cachedData.expiresAt && Date.now() > cachedData.expiresAt) {
        this.remove(key);
        return defaultValue ?? null;
      }

      return cachedData.data;
    } catch (error) {
      console.error(`Failed to get from localStorage: ${key}`, error);
      return defaultValue ?? null;
    }
  }

  public remove(key: string): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.error(`Failed to remove from localStorage: ${key}`, error);
      return false;
    }
  }

  public clear(): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage', error);
      return false;
    }
  }

  public exists(key: string): boolean {
    if (!this.isStorageAvailable()) return false;
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  // Specialized methods for common use cases

  // User authentication data
  public setAuthToken(token: string): boolean {
    return this.set('auth_token', token, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  public getAuthToken(): string | null {
    return this.get<string>('auth_token');
  }

  public setRefreshToken(token: string): boolean {
    return this.set('refresh_token', token, 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  public getRefreshToken(): string | null {
    return this.get<string>('refresh_token');
  }

  public clearAuthTokens(): boolean {
    const tokenCleared = this.remove('auth_token');
    const refreshCleared = this.remove('refresh_token');
    return tokenCleared && refreshCleared;
  }

  // User preferences
  public setUserPreferences(preferences: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    notifications?: boolean;
    location?: string;
    currency?: string;
  }): boolean {
    return this.set('user_preferences', preferences);
  }

  public getUserPreferences() {
    return this.get('user_preferences', {
      theme: 'system' as const,
      language: 'en',
      notifications: true,
      location: 'Mumbai',
      currency: 'INR',
    });
  }

  // Search history
  public addSearchTerm(term: string): boolean {
    const history = this.getSearchHistory();
    const updatedHistory = [term, ...history.filter(t => t !== term)].slice(0, 10);
    return this.set('search_history', updatedHistory);
  }

  public getSearchHistory(): string[] {
    return this.get<string[]>('search_history', []);
  }

  public clearSearchHistory(): boolean {
    return this.remove('search_history');
  }

  // Recently viewed ingredients
  public addRecentlyViewed(ingredientId: string, ingredientData: any): boolean {
    const recent = this.getRecentlyViewed();
    const updated = [
      { id: ingredientId, data: ingredientData, viewedAt: Date.now() },
      ...recent.filter(item => item.id !== ingredientId)
    ].slice(0, 20);
    
    return this.set('recently_viewed', updated, this.defaultExpiration);
  }

  public getRecentlyViewed(): Array<{ id: string; data: any; viewedAt: number }> {
    return this.get('recently_viewed', []);
  }

  // Favorites/Wishlist
  public addToFavorites(ingredientId: string): boolean {
    const favorites = this.getFavorites();
    if (!favorites.includes(ingredientId)) {
      favorites.push(ingredientId);
      return this.set('favorites', favorites);
    }
    return true;
  }

  public removeFromFavorites(ingredientId: string): boolean {
    const favorites = this.getFavorites();
    const updated = favorites.filter(id => id !== ingredientId);
    return this.set('favorites', updated);
  }

  public getFavorites(): string[] {
    return this.get<string[]>('favorites', []);
  }

  public isFavorite(ingredientId: string): boolean {
    return this.getFavorites().includes(ingredientId);
  }

  // Cart data (temporary storage)
  public setCartItems(items: any[]): boolean {
    return this.set('cart_items', items, 2 * 60 * 60 * 1000); // 2 hours
  }

  public getCartItems(): any[] {
    return this.get<any[]>('cart_items', []);
  }

  public clearCart(): boolean {
    return this.remove('cart_items');
  }

  // Draft listings (for incomplete ingredient listings)
  public saveDraftListing(draft: any): boolean {
    const drafts = this.getDraftListings();
    const draftId = draft.id || `draft_${Date.now()}`;
    const updatedDrafts = {
      ...drafts,
      [draftId]: { ...draft, id: draftId, savedAt: Date.now() }
    };
    return this.set('draft_listings', updatedDrafts);
  }

  public getDraftListings(): Record<string, any> {
    return this.get('draft_listings', {});
  }

  public getDraftListing(draftId: string): any | null {
    const drafts = this.getDraftListings();
    return drafts[draftId] || null;
  }

  public removeDraftListing(draftId: string): boolean {
    const drafts = this.getDraftListings();
    delete drafts[draftId];
    return this.set('draft_listings', drafts);
  }

  // Offline data queue (for when user is offline)
  public addToOfflineQueue(action: {
    type: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    timestamp: number;
  }): boolean {
    const queue = this.getOfflineQueue();
    queue.push(action);
    return this.set('offline_queue', queue);
  }

  public getOfflineQueue(): any[] {
    return this.get<any[]>('offline_queue', []);
  }

  public clearOfflineQueue(): boolean {
    return this.remove('offline_queue');
  }

  // App settings and configuration
  public setAppSettings(settings: {
    autoRefresh?: boolean;
    refreshInterval?: number;
    pushNotifications?: boolean;
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    locationTracking?: boolean;
  }): boolean {
    return this.set('app_settings', settings);
  }

  public getAppSettings() {
    return this.get('app_settings', {
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds
      pushNotifications: true,
      soundEnabled: true,
      vibrationEnabled: true,
      locationTracking: false,
    });
  }

  // Performance and analytics data
  public logPerformanceMetric(metric: {
    name: string;
    value: number;
    timestamp: number;
    page?: string;
  }): boolean {
    const metrics = this.get<any[]>('performance_metrics', []);
    metrics.push(metric);
    // Keep only last 100 metrics
    const trimmed = metrics.slice(-100);
    return this.set('performance_metrics', trimmed, this.defaultExpiration);
  }

  public getPerformanceMetrics(): any[] {
    return this.get<any[]>('performance_metrics', []);
  }

  // Error logs (for debugging)
  public logError(error: {
    message: string;
    stack?: string;
    timestamp: number;
    page?: string;
    userAgent?: string;
  }): boolean {
    const errors = this.get<any[]>('error_logs', []);
    errors.push(error);
    // Keep only last 50 errors
    const trimmed = errors.slice(-50);
    return this.set('error_logs', trimmed, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  public getErrorLogs(): any[] {
    return this.get<any[]>('error_logs', []);
  }

  public clearErrorLogs(): boolean {
    return this.remove('error_logs');
  }

  // App version and update tracking
  public setAppVersion(version: string): boolean {
    return this.set('app_version', version);
  }

  public getAppVersion(): string | null {
    return this.get<string>('app_version');
  }

  public setLastUpdateCheck(timestamp: number): boolean {
    return this.set('last_update_check', timestamp);
  }

  public getLastUpdateCheck(): number {
    return this.get<number>('last_update_check', 0);
  }

  // Form auto-save functionality
  public autoSaveForm(formId: string, formData: any): boolean {
    const autoSaves = this.get<Record<string, any>>('auto_saves', {});
    autoSaves[formId] = {
      data: formData,
      savedAt: Date.now()
    };
    return this.set('auto_saves', autoSaves, 60 * 60 * 1000); // 1 hour
  }

  public getAutoSavedForm(formId: string): any | null {
    const autoSaves = this.get<Record<string, any>>('auto_saves', {});
    return autoSaves[formId]?.data || null;
  }

  public clearAutoSavedForm(formId: string): boolean {
    const autoSaves = this.get<Record<string, any>>('auto_saves', {});
    delete autoSaves[formId];
    return this.set('auto_saves', autoSaves);
  }

  // Network status and connectivity
  public setNetworkStatus(isOnline: boolean): boolean {
    return this.set('network_status', {
      isOnline,
      lastChecked: Date.now()
    });
  }

  public getNetworkStatus(): { isOnline: boolean; lastChecked: number } {
    return this.get('network_status', {
      isOnline: navigator.onLine,
      lastChecked: Date.now()
    });
  }

  // Location data
  public setUserLocation(location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    timestamp: number;
  }): boolean {
    return this.set('user_location', location, 60 * 60 * 1000); // 1 hour
  }

  public getUserLocation(): any | null {
    return this.get('user_location');
  }

  // Utility methods
  public getStorageSize(): string {
    if (!this.isStorageAvailable()) return '0 KB';

    let totalSize = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    });

    if (totalSize < 1024) return `${totalSize} B`;
    if (totalSize < 1024 * 1024) return `${(totalSize / 1024).toFixed(2)} KB`;
    return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
  }

  public getStorageInfo(): {
    totalKeys: number;
    totalSize: string;
    keys: string[];
  } {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
    return {
      totalKeys: keys.length,
      totalSize: this.getStorageSize(),
      keys: keys.map(key => key.replace(this.prefix, ''))
    };
  }

  // Backup and restore functionality
  public exportData(): string {
    const data: StorageData = {};
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          data[key.replace(this.prefix, '')] = value;
        }
      }
    });

    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      data
    });
  }

  public importData(jsonData: string): boolean {
    try {
      const backup = JSON.parse(jsonData);
      
      if (!backup.data || typeof backup.data !== 'object') {
        throw new Error('Invalid backup format');
      }

      Object.entries(backup.data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          localStorage.setItem(this.getKey(key), value);
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Memory management
  public cleanupExpiredData(): number {
    if (!this.isStorageAvailable()) return 0;

    let cleanedCount = 0;
    const keys = Object.keys(localStorage);

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const cachedData: CachedData = JSON.parse(item);
            if (cachedData.expiresAt && Date.now() > cachedData.expiresAt) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch {
          // If parsing fails, remove the corrupted item
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    });

    return cleanedCount;
  }
}

// Create singleton instance
const storageService = new StorageService();

// Automatically cleanup expired data on initialization
storageService.cleanupExpiredData();

// Setup periodic cleanup (every 10 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    storageService.cleanupExpiredData();
  }, 10 * 60 * 1000);
}

export default storageService;
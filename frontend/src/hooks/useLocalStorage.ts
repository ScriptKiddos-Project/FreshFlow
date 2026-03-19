import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((val: T) => T);

interface UseLocalStorageOptions {
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
  syncAcrossTabs?: boolean;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
): [T, (value: SetValue<T>) => void, () => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = true
  } = options;

  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Save state
        setStoredValue(valueToStore);
        
        // Save to local storage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialize(valueToStore));
          
          // Dispatch custom event to sync across tabs
          if (syncAcrossTabs) {
            window.dispatchEvent(
              new CustomEvent('local-storage', {
                detail: { key, newValue: valueToStore }
              })
            );
          }
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, serialize, storedValue, syncAcrossTabs]
  );

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        
        if (syncAcrossTabs) {
          window.dispatchEvent(
            new CustomEvent('local-storage', {
              detail: { key, newValue: undefined }
            })
          );
        }
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue, syncAcrossTabs]);

  // Listen for changes in localStorage from other tabs
  useEffect(() => {
    if (!syncAcrossTabs || typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserialize(e.newValue));
        } catch (error) {
          console.error(`Error deserializing localStorage key "${key}":`, error);
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    const handleCustomStorageEvent = (e: CustomEvent) => {
      if (e.detail.key === key) {
        if (e.detail.newValue !== undefined) {
          setStoredValue(e.detail.newValue);
        } else {
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleCustomStorageEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleCustomStorageEvent as EventListener);
    };
  }, [key, deserialize, initialValue, syncAcrossTabs]);

  return [storedValue, setValue, removeValue];
}

// Specialized hooks for common use cases
export function useLocalStorageState<T>(key: string, initialValue: T) {
  return useLocalStorage(key, initialValue, { syncAcrossTabs: true });
}

export function useSessionPreferences() {
  const [preferences, setPreferences] = useLocalStorage('freshflow_preferences', {
    theme: 'light' as 'light' | 'dark' | 'system',
    language: 'en',
    currency: 'INR',
    notifications: {
      desktop: true,
      sound: true,
      priceAlerts: true,
      orderUpdates: true,
      inventoryAlerts: true,
      marketing: false
    },
    dashboard: {
      layout: 'grid' as 'grid' | 'list',
      showQuickStats: true,
      showRecentOrders: true,
      autoRefresh: true,
      refreshInterval: 30 // seconds
    },
    marketplace: {
      defaultSort: 'price_asc' as 'price_asc' | 'price_desc' | 'name' | 'distance' | 'rating',
      showOutOfStock: false,
      maxDistance: 50, // km
      favoriteCategories: [] as string[]
    }
  });

  const updateTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    setPreferences(prev => ({ ...prev, theme }));
  }, [setPreferences]);

  const updateNotifications = useCallback((notifications: Partial<typeof preferences.notifications>) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, ...notifications }
    }));
  }, [setPreferences]);

  const updateDashboard = useCallback((dashboard: Partial<typeof preferences.dashboard>) => {
    setPreferences(prev => ({
      ...prev,
      dashboard: { ...prev.dashboard, ...dashboard }
    }));
  }, [setPreferences]);

  const updateMarketplace = useCallback((marketplace: Partial<typeof preferences.marketplace>) => {
    setPreferences(prev => ({
      ...prev,
      marketplace: { ...prev.marketplace, ...marketplace }
    }));
  }, [setPreferences]);

  return {
    preferences,
    updateTheme,
    updateNotifications,
    updateDashboard,
    updateMarketplace,
    setPreferences
  };
}

export function useRecentSearches(maxItems: number = 10) {
  const [searches, setSearches] = useLocalStorage<string[]>('freshflow_recent_searches', []);

  const addSearch = useCallback((search: string) => {
    if (!search.trim()) return;
    
    setSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== search.toLowerCase());
      return [search, ...filtered].slice(0, maxItems);
    });
  }, [setSearches, maxItems]);

  const removeSearch = useCallback((search: string) => {
    setSearches(prev => prev.filter(s => s !== search));
  }, [setSearches]);

  const clearSearches = useCallback(() => {
    setSearches([]);
  }, [setSearches]);

  return {
    searches,
    addSearch,
    removeSearch,
    clearSearches
  };
}

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>('freshflow_favorites', []);

  const addFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, [setFavorites]);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(fav => fav !== id));
  }, [setFavorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        return prev.filter(fav => fav !== id);
      }
      return [...prev, id];
    });
  }, [setFavorites]);

  const isFavorite = useCallback((id: string) => {
    return favorites.includes(id);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, [setFavorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites
  };
}

export function useViewHistory(maxItems: number = 50) {
  const [history, setHistory] = useLocalStorage<Array<{
    id: string;
    name: string;
    type: 'ingredient' | 'vendor' | 'order';
    timestamp: number;
    metadata?: any;
  }>>('freshflow_view_history', []);

  const addToHistory = useCallback((item: {
    id: string;
    name: string;
    type: 'ingredient' | 'vendor' | 'order';
    metadata?: any;
  }) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== item.id || h.type !== item.type);
      const newItem = { ...item, timestamp: Date.now() };
      return [newItem, ...filtered].slice(0, maxItems);
    });
  }, [setHistory, maxItems]);

  const removeFromHistory = useCallback((id: string, type: string) => {
    setHistory(prev => prev.filter(item => !(item.id === id && item.type === type)));
  }, [setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const getRecentByType = useCallback((type: 'ingredient' | 'vendor' | 'order', limit?: number) => {
    const filtered = history.filter(item => item.type === type);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [history]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentByType
  };
}

export function useDraftData<T>(key: string, initialValue: T) {
  const storageKey = `freshflow_draft_${key}`;
  const [draft, setDraft] = useLocalStorage<T>(storageKey, initialValue);

  const saveDraft = useCallback((data: T) => {
    setDraft(data);
  }, [setDraft]);

  const clearDraft = useCallback(() => {
    setDraft(initialValue);
  }, [setDraft, initialValue]);

  const hasDraft = useCallback(() => {
    return JSON.stringify(draft) !== JSON.stringify(initialValue);
  }, [draft, initialValue]);

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft
  };
}
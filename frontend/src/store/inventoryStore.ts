import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types for inventory management
export interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  originalPrice: number;
  expiryDate: string;
  description?: string;
  image?: string;
  location: string;
  vendorId: string;
  vendorName: string;
  status: 'available' | 'sold' | 'expired' | 'reserved';
  discount: number;
  isUrgent: boolean;
  listingDate: string;
  tags: string[];
  minStockLevel: number;

}

export interface InventoryFilters {
  category: string;
  priceRange: {
    min: number;
    max: number;
  };
  location: string;
  expiryDays: number;
  isUrgent: boolean;
  searchQuery: string;
}

export interface InventoryState {
  // State
  ingredients: Ingredient[];
  myIngredients: Ingredient[];
  loading: boolean;
  error: string | null;
  filters: InventoryFilters;
  selectedIngredient: Ingredient | null;
  categories: string[];
  locations: string[];
  isLoading: boolean;

  // Actions
  setIngredients: (ingredients: Ingredient[]) => void;
  setMyIngredients: (ingredients: Ingredient[]) => void;
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => void;
  removeIngredient: (id: string) => void;
  setSelectedIngredient: (ingredient: Ingredient | null) => void;
  setFilters: (filters: Partial<InventoryFilters>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed getters
  getFilteredIngredients: () => Ingredient[];
  getIngredientById: (id: string) => Ingredient | undefined;
  getUrgentIngredients: () => Ingredient[];
  getExpiringIngredients: (days: number) => Ingredient[];
  getCategoryCounts: () => Record<string, number>;
  getTotalValue: () => number;
  
  // Real-time updates
  updatePriceRealtime: (id: string, newPrice: number, discount: number) => void;
  markAsUrgent: (id: string) => void;
  reserveIngredient: (id: string) => void;
  setIsLoading: (isLoading: boolean) => void;
}

const initialFilters: InventoryFilters = {
  category: '',
  priceRange: { min: 0, max: 10000 },
  location: '',
  expiryDays: 30,
  isUrgent: false,
  searchQuery: '',
};

export const useInventoryStore = create<InventoryState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ingredients: [],
        myIngredients: [],
        loading: false,
        error: null,
        filters: initialFilters,
        selectedIngredient: null,
        categories: [
          'Vegetables',
          'Fruits',
          'Grains',
          'Spices',
          'Dairy',
          'Meat',
          'Seafood',
          'Oils',
          'Condiments',
        ],
        locations: [
          'Mumbai Central',
          'Andheri West',
          'Bandra',
          'Borivali',
          'Thane',
          'Navi Mumbai',
          'Pune',
          'Delhi',
          'Bangalore',
          'Chennai',
        ],
        isLoading: false,

        // Basic actions
        setIsLoading: (isLoading) => set({ isLoading }, false, 'setIsLoading'),
        
        setIngredients: (ingredients) =>
          set({ ingredients }, false, 'setIngredients'),

        setMyIngredients: (myIngredients) =>
          set({ myIngredients }, false, 'setMyIngredients'),

        addIngredient: (ingredient) =>
          set(
            (state) => ({
              ingredients: [ingredient, ...state.ingredients],
              myIngredients: ingredient.vendorId === 'current_user' 
                ? [ingredient, ...state.myIngredients] 
                : state.myIngredients,
            }),
            false,
            'addIngredient'
          ),

        updateIngredient: (id, updates) =>
          set(
            (state) => ({
              ingredients: state.ingredients.map((ingredient) =>
                ingredient.id === id ? { ...ingredient, ...updates } : ingredient
              ),
              myIngredients: state.myIngredients.map((ingredient) =>
                ingredient.id === id ? { ...ingredient, ...updates } : ingredient
              ),
              selectedIngredient:
                state.selectedIngredient?.id === id
                  ? { ...state.selectedIngredient, ...updates }
                  : state.selectedIngredient,
            }),
            false,
            'updateIngredient'
          ),

        removeIngredient: (id) =>
          set(
            (state) => ({
              ingredients: state.ingredients.filter(
                (ingredient) => ingredient.id !== id
              ),
              myIngredients: state.myIngredients.filter(
                (ingredient) => ingredient.id !== id
              ),
              selectedIngredient:
                state.selectedIngredient?.id === id
                  ? null
                  : state.selectedIngredient,
            }),
            false,
            'removeIngredient'
          ),

        setSelectedIngredient: (ingredient) =>
          set({ selectedIngredient: ingredient }, false, 'setSelectedIngredient'),

        setFilters: (newFilters) =>
          set(
            (state) => ({
              filters: { ...state.filters, ...newFilters },
            }),
            false,
            'setFilters'
          ),

        resetFilters: () =>
          set({ filters: initialFilters }, false, 'resetFilters'),

        setLoading: (loading) => set({ loading }, false, 'setLoading'),

        setError: (error) => set({ error }, false, 'setError'),

        // Computed getters
        getFilteredIngredients: () => {
          const { ingredients, filters } = get();
          
          return ingredients.filter((ingredient) => {
            // Search query filter
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              const matchesName = ingredient.name.toLowerCase().includes(query);
              const matchesCategory = ingredient.category.toLowerCase().includes(query);
              const matchesDescription = ingredient.description?.toLowerCase().includes(query);
              const matchesTags = ingredient.tags.some(tag => 
                tag.toLowerCase().includes(query)
              );
              
              if (!matchesName && !matchesCategory && !matchesDescription && !matchesTags) {
                return false;
              }
            }

            // Category filter
            if (filters.category && ingredient.category !== filters.category) {
              return false;
            }

            // Price range filter
            if (
              ingredient.price < filters.priceRange.min ||
              ingredient.price > filters.priceRange.max
            ) {
              return false;
            }

            // Location filter
            if (filters.location && ingredient.location !== filters.location) {
              return false;
            }

            // Expiry days filter
            if (filters.expiryDays > 0) {
              const expiryDate = new Date(ingredient.expiryDate);
              const daysUntilExpiry = Math.ceil(
                (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              if (daysUntilExpiry > filters.expiryDays) {
                return false;
              }
            }

            // Urgent filter
            if (filters.isUrgent && !ingredient.isUrgent) {
              return false;
            }

            // Only show available ingredients
            return ingredient.status === 'available';
          });
        },

        getIngredientById: (id) => {
          const { ingredients } = get();
          return ingredients.find((ingredient) => ingredient.id === id);
        },

        getUrgentIngredients: () => {
          const { ingredients } = get();
          return ingredients.filter(
            (ingredient) => ingredient.isUrgent && ingredient.status === 'available'
          );
        },

        getExpiringIngredients: (days) => {
          const { ingredients } = get();
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() + days);

          return ingredients.filter((ingredient) => {
            const expiryDate = new Date(ingredient.expiryDate);
            return expiryDate <= cutoffDate && ingredient.status === 'available';
          });
        },

        getCategoryCounts: () => {
          const { ingredients } = get();
          const counts: Record<string, number> = {};

          ingredients
            .filter((ingredient) => ingredient.status === 'available')
            .forEach((ingredient) => {
              counts[ingredient.category] = (counts[ingredient.category] || 0) + 1;
            });

          return counts;
        },

        getTotalValue: () => {
          const { myIngredients } = get();
          return myIngredients
            .filter((ingredient) => ingredient.status === 'available')
            .reduce((total, ingredient) => total + ingredient.price * ingredient.quantity, 0);
        },

        // Real-time update methods
        updatePriceRealtime: (id, newPrice, discount) =>
          set(
            (state) => ({
              ingredients: state.ingredients.map((ingredient) =>
                ingredient.id === id
                  ? { 
                      ...ingredient, 
                      price: newPrice, 
                      discount,
                      isUrgent: discount > 20 
                    }
                  : ingredient
              ),
              myIngredients: state.myIngredients.map((ingredient) =>
                ingredient.id === id
                  ? { 
                      ...ingredient, 
                      price: newPrice, 
                      discount,
                      isUrgent: discount > 20 
                    }
                  : ingredient
              ),
            }),
            false,
            'updatePriceRealtime'
          ),

        markAsUrgent: (id) =>
          set(
            (state) => ({
              ingredients: state.ingredients.map((ingredient) =>
                ingredient.id === id ? { ...ingredient, isUrgent: true } : ingredient
              ),
              myIngredients: state.myIngredients.map((ingredient) =>
                ingredient.id === id ? { ...ingredient, isUrgent: true } : ingredient
              ),
            }),
            false,
            'markAsUrgent'
          ),

        reserveIngredient: (id) =>
          set(
            (state) => ({
              ingredients: state.ingredients.map((ingredient) =>
                ingredient.id === id ? { ...ingredient, status: 'reserved' } : ingredient
              ),
            }),
            false,
            'reserveIngredient'
          ),
      }),
      {
        name: 'freshflow-inventory-store',
        partialize: (state) => ({
          myIngredients: state.myIngredients,
          filters: state.filters,
        }),
      }
    ),
    { name: 'InventoryStore' }
  )
);
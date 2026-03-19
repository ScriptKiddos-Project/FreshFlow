export interface IIngredient {
  _id: string;
  sellerId: string;
  name: string;
  category: 'vegetables' | 'fruits' | 'spices' | 'grains' | 'dairy' | 'meat' | 'seafood' | 'other';
  description?: string;
  quantity: number;
  unit: 'kg' | 'gm' | 'ltr' | 'ml' | 'pcs' | 'dozen' | 'bundle';
  basePrice: number;
  currentPrice: number;
  previousPrice?: number;
  priceHistory: Array<{
    price: number;
    date: Date;
    reason?: string;
  }>;
  imageUrl?: string;
  images?: string[];
  expiryDate: Date;
  harvestDate?: Date;
  origin?: string;
  quality: 'premium' | 'standard' | 'economy';
  isOrganic: boolean;
  certifications?: string[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    vitamins?: string[];
  };
  storageInstructions?: string;
  status?: 'active' | 'sold' | 'expired' | 'removed';
  reservedQuantity?: number;
  soldQuantity?: number;
  views: number;
  favorites: number;
  tags?: string[];
  location?: {
    coordinates: [number, number];
    address: string;
  };
  priceOverride?: {
    isOverridden: boolean;
    overridePrice?: number;
    reason?: string;
    overrideBy?: string;
    overrideDate?: Date;
  };
  priceUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  reviews?: Array<{
    rating: number;
    comment?: string;
    buyerId?: string;
    createdAt?: Date;
  }>;
  averageRating?: number;
}

export interface CreateIngredientData {
  name: string;
  category: string;
  description?: string;
  quantity: number;
  unit: string;
  basePrice: number;
  imageUrl?: string;
  images?: string[];
  expiryDate: Date;
  harvestDate?: Date;
  origin?: string;
  quality: string;
  isOrganic: boolean;
  certifications?: string[];
  nutritionalInfo?: any;
  storageInstructions?: string;
  tags?: string[];
}

export interface UpdateIngredientData {
  name?: string;
  category?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  basePrice?: number;
  imageUrl?: string;
  images?: string[];
  expiryDate?: Date;
  harvestDate?: Date;
  origin?: string;
  quality?: string;
  isOrganic?: boolean;
  certifications?: string[];
  nutritionalInfo?: any;
  storageInstructions?: string;
  status?: string;
  tags?: string[];
}

export interface IngredientFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  quality?: string;
  isOrganic?: boolean;
  location?: string;
  expiryDays?: number;
  sortBy?: 'price' | 'expiry' | 'distance' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface IngredientSearchQuery {
  query?: string;
  category?: string;
  filters?: IngredientFilters;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
}

export interface PriceHistory {
  price: number;
  date: Date;
  reason?: string;
}
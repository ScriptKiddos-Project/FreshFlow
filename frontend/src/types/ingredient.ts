export interface Ingredient {
  _id: string;
  name: string;
  category: IngredientCategory;
  subcategory: string;
  description: string;
  vendorId: string;
  vendorName: string;
  vendorBusinessName: string;
  vendorLocation: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  quantity: {
    available: number;
    unit: QuantityUnit;
    minOrder: number;
    maxOrder: number;
  };
  pricing: {
    basePrice: number;
    currentPrice: number;
    discountPercentage: number;
    pricePerUnit: number;
    negotiable: boolean;
  };
  quality: {
    grade: QualityGrade;
    freshness: FreshnessLevel;
    organic: boolean;
    certification?: string[];
  };
  expiry: {
    harvestDate?: string;
    expiryDate: string;
    shelfLife: number; // in days
    timeRemaining: number; // in hours
    urgencyLevel: UrgencyLevel;
  };
  images: string[];
  tags: string[];
  isActive: boolean;
  isVerified: boolean;
  averageRating: number;
  totalReviews: number;
  viewCount: number;
  favoriteCount: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
  lastPriceUpdate: string;
}

export type IngredientCategory = 
  | 'vegetables'
  | 'fruits' 
  | 'grains'
  | 'spices'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'oils'
  | 'condiments'
  | 'beverages'
  | 'snacks'
  | 'frozen'
  | 'canned'
  | 'bakery'
  | 'other';

export type QuantityUnit = 
  | 'kg'
  | 'grams'
  | 'liters'
  | 'ml'
  | 'pieces'
  | 'dozens'
  | 'packets'
  | 'boxes'
  | 'bottles'
  | 'cans'
  | 'bunches'
  | 'bags';

export type QualityGrade = 'A+' | 'A' | 'B+' | 'B' | 'C';

export type FreshnessLevel = 
  | 'very_fresh'
  | 'fresh' 
  | 'good'
  | 'fair'
  | 'needs_quick_sale';

export type UrgencyLevel = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface CreateIngredientData {
  name: string;
  category: IngredientCategory;
  subcategory: string;
  description: string;
  quantity: {
    available: number;
    unit: QuantityUnit;
    minOrder: number;
    maxOrder: number;
  };
  pricing: {
    basePrice: number;
    negotiable: boolean;
  };
  quality: {
    grade: QualityGrade;
    freshness: FreshnessLevel;
    organic: boolean;
    certification?: string[];
  };
  expiry: {
    harvestDate?: string;
    expiryDate: string;
    shelfLife: number;
  };
  images: File[];
  tags: string[];
}

export interface UpdateIngredientData {
  name?: string;
  category?: IngredientCategory;
  subcategory?: string;
  description?: string;
  quantity?: {
    available?: number;
    unit?: QuantityUnit;
    minOrder?: number;
    maxOrder?: number;
  };
  pricing?: {
    basePrice?: number;
    negotiable?: boolean;
  };
  quality?: {
    grade?: QualityGrade;
    freshness?: FreshnessLevel;
    organic?: boolean;
    certification?: string[];
  };
  expiry?: {
    harvestDate?: string;
    expiryDate?: string;
    shelfLife?: number;
  };
  newImages?: File[];
  removeImages?: string[];
  tags?: string[];
  isActive?: boolean;
}

export interface IngredientFilters {
  category?: IngredientCategory[];
  subcategory?: string[];
  location?: {
    coordinates: {
      lat: number;
      lng: number;
    };
    radius: number; // in km
  };
  priceRange?: {
    min: number;
    max: number;
  };
  quantityRange?: {
    min: number;
    max: number;
    unit?: QuantityUnit;
  };
  qualityGrade?: QualityGrade[];
  freshness?: FreshnessLevel[];
  urgencyLevel?: UrgencyLevel[];
  organic?: boolean;
  negotiable?: boolean;
  timeRemaining?: {
    min: number; // in hours
    max: number; // in hours
  };
  tags?: string[];
  vendorRating?: {
    min: number;
    max: number;
  };
  sortBy?: SortOption;
  sortOrder?: 'asc' | 'desc';
}

export type SortOption = 
  | 'price'
  | 'distance'
  | 'freshness'
  | 'expiry'
  | 'rating'
  | 'popularity'
  | 'newest'
  | 'urgency';

export interface IngredientSearchParams {
  query?: string;
  filters?: IngredientFilters;
  page?: number;
  limit?: number;
}

export interface IngredientSearchResponse {
  success: boolean;
  data: {
    ingredients: Ingredient[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    aggregations: {
      categoryCount: Record<IngredientCategory, number>;
      averagePrice: number;
      totalVendors: number;
      urgentItems: number;
    };
  };
  message: string;
}

export interface IngredientResponse {
  success: boolean;
  data: Ingredient;
  message: string;
}

export interface IngredientsResponse {
  success: boolean;
  data: Ingredient[];
  message: string;
}

export interface IngredientReview {
  _id: string;
  ingredientId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  helpfulVotes: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewData {
  ingredientId: string;
  rating: number;
  comment: string;
  images?: File[];
}

export interface IngredientStats {
  totalListed: number;
  totalSold: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  categoryBreakdown: Record<IngredientCategory, number>;
  monthlyStats: {
    month: string;
    listed: number;
    sold: number;
    revenue: number;
  }[];
  urgentItems: number;
  expiringSoon: number;
  lowStock: number;
}

export interface PriceHistory {
  _id: string;
  ingredientId: string;
  price: number;
  discountPercentage: number;
  reason: string;
  timestamp: string;
}

export interface SimilarIngredient {
  _id: string;
  name: string;
  vendorName: string;
  currentPrice: number;
  distance: number;
  rating: number;
  image: string;
  urgencyLevel: UrgencyLevel;
}

export interface IngredientAnalytics {
  views: number;
  favorites: number;
  inquiries: number;
  orders: number;
  conversionRate: number;
  averageViewDuration: number;
  topSearchTerms: string[];
  competitorPrices: {
    vendorName: string;
    price: number;
    distance: number;
  }[];
}

export interface BulkIngredientOperation {
  ingredientIds: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'update_price' | 'extend_expiry';
  data?: {
    priceAdjustment?: {
      type: 'percentage' | 'fixed';
      value: number;
    };
    expiryExtension?: number; // in days
    isActive?: boolean;
  };
}

export interface IngredientNotification {
  _id: string;
  type: 'price_drop' | 'expiry_warning' | 'out_of_stock' | 'new_review' | 'inquiry_received';
  ingredientId: string;
  ingredientName: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface CategorySuggestion {
  category: IngredientCategory;
  subcategories: string[];
  commonTags: string[];
  averagePrice: number;
  popularUnits: QuantityUnit[];
}

export interface IngredientTemplate {
  _id: string;
  name: string;
  category: IngredientCategory;
  subcategory: string;
  defaultUnit: QuantityUnit;
  suggestedTags: string[];
  averagePrice: number;
  typicalShelfLife: number;
  description: string;
  isPopular: boolean;
}
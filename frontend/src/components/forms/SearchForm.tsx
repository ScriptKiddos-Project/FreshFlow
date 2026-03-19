import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Clock, Tag, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
// import { useMarketplaceStore } from '../../store/marketplaceStore';
import { useAuthStore } from '../../store/authStore';

export interface SearchFilters {
  query: string;
  category: string;
  location: string;
  priceRange: {
    min: number;
    max: number;
  };
  distance: number;
  expiryTimeFrame: string;
  tags: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  availability: 'all' | 'available' | 'ending_soon';
}

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
  className?: string;
}

const CATEGORIES = [
  'All Categories',
  'Vegetables', 'Fruits', 'Spices & Herbs', 'Grains & Cereals', 
  'Dairy Products', 'Meat & Poultry', 'Seafood', 'Oils & Fats',
  'Condiments', 'Snacks', 'Beverages', 'Others'
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price', label: 'Price' },
  { value: 'distance', label: 'Distance' },
  { value: 'expiry', label: 'Expiry Time' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'created', label: 'Recently Listed' }
];

const EXPIRY_TIMEFRAMES = [
  { value: 'all', label: 'Any Time' },
  { value: '1h', label: 'Within 1 Hour' },
  { value: '6h', label: 'Within 6 Hours' },
  { value: '24h', label: 'Within 24 Hours' },
  { value: '3d', label: 'Within 3 Days' },
  { value: '7d', label: 'Within 1 Week' }
];

const POPULAR_TAGS = [
  'Organic', 'Fresh', 'Premium', 'Local', 'Seasonal', 'Bulk Deal',
  'Quick Sale', 'Restaurant Quality', 'Farm Fresh', 'Export Quality'
];

export const SearchForm: React.FC<SearchFormProps> = ({
  onSearch,
  initialFilters,
  className = ''
}) => {
  const { user } = useAuthStore();
  // const { addToSearchHistory } = useMarketplaceStore();
 
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'All Categories',
    location: (user as any)?.businessDetails?.address || 
          (user && 'address' in user ? user.address : '') || 
          '',
    priceRange: { min: 0, max: 1000 },
    distance: 10,
    expiryTimeFrame: 'all',
    tags: [],
    sortBy: 'relevance',
    sortOrder: 'desc',
    availability: 'all',
    ...initialFilters
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // Load recent searches from localStorage or store
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setRecentSearches(recent.slice(0, 5));
  }, []);

  useEffect(() => {
    // Generate suggestions based on query
    if (filters.query.length > 1) {
      const mockSuggestions = [
        `${filters.query} in ${filters.location}`,
        `Fresh ${filters.query}`,
        `Organic ${filters.query}`,
        `${filters.query} bulk`,
        `Premium ${filters.query}`
      ].filter(s => s.toLowerCase().includes(filters.query.toLowerCase()));
      setSuggestions(mockSuggestions.slice(0, 4));
    } else {
      setSuggestions([]);
    }
  }, [filters.query, filters.location]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePriceRangeChange = (type: 'min' | 'max', value: number) => {
    setFilters(prev => ({
      ...prev,
      priceRange: { ...prev.priceRange, [type]: value }
    }));
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      handleFilterChange('tags', [...filters.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    handleFilterChange('tags', filters.tags.filter(t => t !== tag));
  };

  const handleSearch = (searchQuery?: string) => {
    const finalFilters = searchQuery 
      ? { ...filters, query: searchQuery }
      : filters;

    // Add to search history
    if (finalFilters.query) {
      const newRecent = [finalFilters.query, ...recentSearches.filter(s => s !== finalFilters.query)]
        .slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      // addToSearchHistory(finalFilters.query);
    }

    onSearch(finalFilters);
    setShowSuggestions(false);
  };

  const handleQuickSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
    handleSearch(query);
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: 'All Categories',
      location: (user as any)?.businessDetails?.address || 
          (user && 'address' in user ? user.address : '') || 
          '',
      priceRange: { min: 0, max: 1000 },
      distance: 10,
      expiryTimeFrame: 'all',
      tags: [],
      sortBy: 'relevance',
      sortOrder: 'desc',
      availability: 'all'
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category !== 'All Categories') count++;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 1000) count++;
    if (filters.distance < 10) count++;
    if (filters.expiryTimeFrame !== 'all') count++;
    if (filters.tags.length > 0) count++;
    if (filters.availability !== 'all') count++;
    return count;
  };

  return (
    <div className={`bg-white ${className}`}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Input
              ref={searchInputRef}
              placeholder="Search ingredients (e.g., fresh tomatoes, organic spices)"
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              icon={<Search className="h-4 w-4" />}
              className="pr-12"
            />
            {filters.query && (
              <button
                onClick={() => handleFilterChange('query', '')}
                className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <Button onClick={() => handleSearch()} className="px-6">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 ${showAdvanced ? 'bg-blue-50 border-blue-300' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-1">
                {getActiveFiltersCount()}
              </span>
            )}
          </Button>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && (filters.query || recentSearches.length > 0) && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 p-4">
            {suggestions.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Suggestions</p>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSearch(suggestion)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                  >
                    <Search className="h-3 w-3 inline mr-2 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {recentSearches.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Recent Searches</p>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSearch(search)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm text-gray-600"
                  >
                    <Clock className="h-3 w-3 inline mr-2 text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card className="mt-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <Input
                placeholder="Enter location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>

            {/* Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance: {filters.distance} km
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={filters.distance}
                onChange={(e) => handleFilterChange('distance', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>

            {/* Price Range */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range: ₹{filters.priceRange.min} - ₹{filters.priceRange.max}
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={filters.priceRange.min}
                    onChange={(e) => handlePriceRangeChange('min', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={filters.priceRange.max}
                    onChange={(e) => handlePriceRangeChange('max', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>₹0</span>
                <span>₹1000+</span>
              </div>
            </div>

            {/* Expiry Timeframe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Time
              </label>
              <select
                value={filters.expiryTimeFrame}
                onChange={(e) => handleFilterChange('expiryTimeFrame', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EXPIRY_TIMEFRAMES.map(timeframe => (
                  <option key={timeframe.value} value={timeframe.value}>
                    {timeframe.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Availability Filter */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Availability
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Items' },
                { value: 'available', label: 'Available Now' },
                { value: 'ending_soon', label: 'Ending Soon' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('availability', option.value)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    filters.availability === option.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tags
            </label>
            
            {/* Popular Tags */}
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Popular tags:</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => filters.tags.includes(tag) ? removeTag(tag) : addTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {filters.tags.includes(tag) ? '✓ ' : '+ '}{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Tags */}
            {filters.tags.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-2">Selected tags:</p>
                <div className="flex flex-wrap gap-2">
                  {filters.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sort Options */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Sort By
            </label>
            <div className="flex items-center space-x-4">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFilterChange('sortOrder', 'asc')}
                  className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                    filters.sortOrder === 'asc'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Low to High
                </button>
                <button
                  onClick={() => handleFilterChange('sortOrder', 'desc')}
                  className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                    filters.sortOrder === 'desc'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  High to Low
                </button>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {getActiveFiltersCount()} active filters
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={getActiveFiltersCount() === 0}
              >
                Clear All
              </Button>
              <Button onClick={() => handleSearch()}>
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Filter Chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.category !== 'All Categories' && (
          <span className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
            {filters.category}
            <button
              onClick={() => handleFilterChange('category', 'All Categories')}
              className="ml-1 hover:text-blue-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        
        {filters.expiryTimeFrame !== 'all' && (
          <span className="inline-flex items-center px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
            <Clock className="h-3 w-3 mr-1" />
            {EXPIRY_TIMEFRAMES.find(t => t.value === filters.expiryTimeFrame)?.label}
            <button
              onClick={() => handleFilterChange('expiryTimeFrame', 'all')}
              className="ml-1 hover:text-orange-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {filters.distance < 10 && (
          <span className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            <MapPin className="h-3 w-3 mr-1" />
            Within {filters.distance} km
            <button
              onClick={() => handleFilterChange('distance', 10)}
              className="ml-1 hover:text-green-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {(filters.priceRange.min > 0 || filters.priceRange.max < 1000) && (
          <span className="inline-flex items-center px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
            ₹{filters.priceRange.min} - ₹{filters.priceRange.max}
            <button
              onClick={() => handleFilterChange('priceRange', { min: 0, max: 1000 })}
              className="ml-1 hover:text-purple-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        
        {filters.tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
          >
            <Tag className="h-3 w-3 mr-1" />
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-gray-900"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Click outside to close suggestions */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
};
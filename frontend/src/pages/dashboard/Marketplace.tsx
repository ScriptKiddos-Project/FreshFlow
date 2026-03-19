import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Clock, ShoppingCart, Eye, Star, AlertCircle, Package, Truck, Phone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { SearchForm } from '../../components/forms/SearchForm';

import { useAuthStore } from '../../store/authStore';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  originalPrice: number;
  currentPrice: number;
  expiryDate: string;
  location: string;
  description?: string;
  tags: string[];
  images: string[];
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  discountPercentage: number;
  minOrderQuantity: number;
  listedAt: string;
  distance?: number;
}

interface CartItem extends Ingredient {
  requestedQuantity: number;
}

export const Marketplace: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const { user } = useAuthStore();
  // Removed the unused searchIngredients destructuring

  // Mock data for demo
  useEffect(() => {
    const mockIngredients: Ingredient[] = [
      {
        id: '1',
        name: 'Fresh Tomatoes',
        category: 'Vegetables',
        quantity: 5,
        unit: 'kg',
        originalPrice: 60,
        currentPrice: 35,
        expiryDate: '2024-07-28',
        location: 'Andheri West, Mumbai',
        description: 'Farm fresh tomatoes, perfect for curries and salads',
        tags: ['Fresh', 'Local', 'Organic'],
        images: ['/api/placeholder/300/200'],
        vendorId: 'vendor1',
        vendorName: 'Raj Vegetables',
        vendorRating: 4.5,
        urgencyLevel: 'high',
        discountPercentage: 42,
        minOrderQuantity: 1,
        listedAt: '2024-07-26T10:00:00Z',
        distance: 2.5
      },
      {
        id: '2',
        name: 'Basmati Rice',
        category: 'Grains & Cereals',
        quantity: 25,
        unit: 'kg',
        originalPrice: 120,
        currentPrice: 95,
        expiryDate: '2024-12-30',
        location: 'Bandra East, Mumbai',
        description: 'Premium quality basmati rice, aged for better aroma',
        tags: ['Premium', 'Bulk Available'],
        images: ['/api/placeholder/300/200'],
        vendorId: 'vendor2',
        vendorName: 'Mumbai Grains Co.',
        vendorRating: 4.8,
        urgencyLevel: 'low',
        discountPercentage: 21,
        minOrderQuantity: 2,
        listedAt: '2024-07-26T08:30:00Z',
        distance: 1.8
      },
      {
        id: '3',
        name: 'Green Chillies',
        category: 'Vegetables',
        quantity: 2,
        unit: 'kg',
        originalPrice: 80,
        currentPrice: 50,
        expiryDate: '2024-07-27',
        location: 'Santa Cruz West, Mumbai',
        description: 'Spicy green chillies, perfect for Indian cooking',
        tags: ['Spicy', 'Fresh', 'Quick Sale'],
        images: ['/api/placeholder/300/200'],
        vendorId: 'vendor3',
        vendorName: 'Spice Garden',
        vendorRating: 4.2,
        urgencyLevel: 'critical',
        discountPercentage: 38,
        minOrderQuantity: 0.5,
        listedAt: '2024-07-26T14:15:00Z',
        distance: 3.2
      },
      {
        id: '4',
        name: 'Paneer',
        category: 'Dairy Products',
        quantity: 3,
        unit: 'kg',
        originalPrice: 400,
        currentPrice: 320,
        expiryDate: '2024-07-29',
        location: 'Juhu, Mumbai',
        description: 'Fresh homemade paneer, soft and creamy',
        tags: ['Fresh', 'Homemade', 'Premium'],
        images: ['/api/placeholder/300/200'],
        vendorId: 'vendor4',
        vendorName: 'Dairy Fresh',
        vendorRating: 4.7,
        urgencyLevel: 'medium',
        discountPercentage: 20,
        minOrderQuantity: 0.5,
        listedAt: '2024-07-26T09:45:00Z',
        distance: 4.1
      }
    ];

    setIngredients(mockIngredients);
    setLoading(false);
  }, []);

  const addToCart = (ingredient: Ingredient, quantity: number) => {
    const existingItem = cartItems.find(item => item.id === ingredient.id);
    
    if (existingItem) {
      setCartItems(prev => prev.map(item => 
        item.id === ingredient.id 
          ? { ...item, requestedQuantity: item.requestedQuantity + quantity }
          : item
      ));
    } else {
      setCartItems(prev => [...prev, { ...ingredient, requestedQuantity: quantity }]);
    }
  };

  const removeFromCart = (ingredientId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== ingredientId));
  };

  const getTotalCartValue = () => {
    return cartItems.reduce((total, item) => 
      total + (item.currentPrice * item.requestedQuantity), 0
    );
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderIngredientCard = (ingredient: Ingredient) => {
    const daysLeft = getDaysUntilExpiry(ingredient.expiryDate);
    
    return (
      <Card key={ingredient.id} className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative">
          <img
            src={ingredient.images[0] || '/api/placeholder/300/200'}
            alt={ingredient.name}
            className="w-full h-48 object-cover"
          />
          
          {ingredient.discountPercentage > 0 && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-bold">
              {ingredient.discountPercentage}% OFF
            </div>
          )}
          
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(ingredient.urgencyLevel)}`}>
            {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
          </div>
          
          <button
            onClick={() => setSelectedIngredient(ingredient)}
            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center opacity-0 hover:opacity-100"
          >
            <Eye className="w-6 h-6 text-white" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{ingredient.name}</h3>
              <p className="text-gray-600 text-sm">{ingredient.category}</p>
            </div>
            <div className="text-right">
              {ingredient.originalPrice > ingredient.currentPrice && (
                <p className="text-gray-500 text-sm line-through">₹{ingredient.originalPrice}</p>
              )}
              <p className="text-xl font-bold text-green-600">₹{ingredient.currentPrice}</p>
              <p className="text-gray-500 text-xs">per {ingredient.unit}</p>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Package className="w-4 h-4 mr-1" />
            <span>{ingredient.quantity} {ingredient.unit} available</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{ingredient.location}</span>
            {ingredient.distance && (
              <span className="ml-2 text-blue-600">({ingredient.distance}km)</span>
            )}
          </div>
          
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Star className="w-4 h-4 mr-1 text-yellow-500" />
            <span>{ingredient.vendorName}</span>
            <span className="ml-1">({ingredient.vendorRating}★)</span>
          </div>
          
          {ingredient.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {ingredient.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
              {ingredient.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                  +{ingredient.tags.length - 3}
                </span>
              )}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={() => addToCart(ingredient, ingredient.minOrderQuantity)}
              className="flex-1"
              size="sm"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIngredient(ingredient)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const renderIngredientList = (ingredient: Ingredient) => {
    const daysLeft = getDaysUntilExpiry(ingredient.expiryDate);
    
    return (
      <Card key={ingredient.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          <img
            src={ingredient.images[0] || '/api/placeholder/100/100'}
            alt={ingredient.name}
            className="w-20 h-20 object-cover rounded-lg"
          />
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{ingredient.name}</h3>
                <p className="text-gray-600">{ingredient.category}</p>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{ingredient.location}</span>
                  {ingredient.distance && (
                    <span className="ml-2 text-blue-600">({ingredient.distance}km)</span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                {ingredient.originalPrice > ingredient.currentPrice && (
                  <p className="text-gray-500 text-sm line-through">₹{ingredient.originalPrice}</p>
                )}
                <p className="text-xl font-bold text-green-600">₹{ingredient.currentPrice}</p>
                <p className="text-gray-500 text-xs">per {ingredient.unit}</p>
                {ingredient.discountPercentage > 0 && (
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full mt-1">
                    {ingredient.discountPercentage}% OFF
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  {ingredient.quantity} {ingredient.unit}
                </span>
                <span className="flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-500" />
                  {ingredient.vendorName} ({ingredient.vendorRating}★)
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(ingredient.urgencyLevel)}`}>
                  {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => addToCart(ingredient, ingredient.minOrderQuantity)}
                  size="sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIngredient(ingredient)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderCart = () => (
    <Dialog
      open={showCart}
      onOpenChange={() => setShowCart(false)}
    >
      <div className="max-h-96 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <img
                  src={item.images[0] || '/api/placeholder/60/60'}
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.vendorName}</p>
                  <p className="text-sm">
                    {item.requestedQuantity} {item.unit} × ₹{item.currentPrice} = ₹{item.currentPrice * item.requestedQuantity}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {cartItems.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total: ₹{getTotalCartValue()}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCartItems([])}>
              Clear Cart
            </Button>
            <Button className="flex-1">
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );

  const renderIngredientDetail = () => {
    if (!selectedIngredient) return null;
    
    const daysLeft = getDaysUntilExpiry(selectedIngredient.expiryDate);
    
    return (
      <Dialog
        open={!!selectedIngredient}
        onOpenChange={() => setSelectedIngredient(null)}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <img
                src={selectedIngredient.images[0] || '/api/placeholder/400/300'}
                alt={selectedIngredient.name}
                className="w-full h-64 object-cover rounded-lg"
              />
              {selectedIngredient.images.length > 1 && (
                <div className="flex gap-2 mt-2">
                  {selectedIngredient.images.slice(1, 4).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${selectedIngredient.name} ${index + 2}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedIngredient.name}</h2>
                  <p className="text-gray-600">{selectedIngredient.category}</p>
                </div>
                <div className="text-right">
                  {selectedIngredient.originalPrice > selectedIngredient.currentPrice && (
                    <p className="text-gray-500 line-through">₹{selectedIngredient.originalPrice}</p>
                  )}
                  <p className="text-3xl font-bold text-green-600">₹{selectedIngredient.currentPrice}</p>
                  <p className="text-gray-500">per {selectedIngredient.unit}</p>
                </div>
              </div>
              
              {selectedIngredient.discountPercentage > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="font-semibold text-red-800">
                      {selectedIngredient.discountPercentage}% Discount!
                    </span>
                  </div>
                  <p className="text-red-600 text-sm">
                    Save ₹{selectedIngredient.originalPrice - selectedIngredient.currentPrice} per {selectedIngredient.unit}
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-gray-500 mr-3" />
                  <span>{selectedIngredient.quantity} {selectedIngredient.unit} available</span>
                </div>
                
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-500 mr-3" />
                  <span>Expires in {daysLeft} days ({selectedIngredient.expiryDate})</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(selectedIngredient.urgencyLevel)}`}>
                    {selectedIngredient.urgencyLevel.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-500 mr-3" />
                  <span>{selectedIngredient.location}</span>
                  {selectedIngredient.distance && (
                    <span className="ml-2 text-blue-600">({selectedIngredient.distance}km away)</span>
                  )}
                </div>
                
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 mr-3" />
                  <span>{selectedIngredient.vendorName} ({selectedIngredient.vendorRating}★)</span>
                </div>
                
                <div className="flex items-center">
                  <Truck className="w-5 h-5 text-gray-500 mr-3" />
                  <span>Min order: {selectedIngredient.minOrderQuantity} {selectedIngredient.unit}</span>
                </div>
              </div>
              
              {selectedIngredient.description && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-gray-700">{selectedIngredient.description}</p>
                </div>
              )}
              
              {selectedIngredient.tags.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedIngredient.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => addToCart(selectedIngredient, selectedIngredient.minOrderQuantity)}
              className="flex-1"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
            <Button variant="outline">
              <Phone className="w-4 h-4 mr-2" />
              Contact Vendor
            </Button>
          </div>
        </div>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600">Find fresh ingredients at discounted prices</p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">Welcome back, {user.name}!</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowCart(true)}
            className="relative"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Cart
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartItems.length}
              </span>
            )}
          </Button>
          
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
            >
              <div className="grid grid-cols-2 gap-1 w-4 h-4">
                <div className="bg-current w-1.5 h-1.5 rounded-sm"></div>
                <div className="bg-current w-1.5 h-1.5 rounded-sm"></div>
                <div className="bg-current w-1.5 h-1.5 rounded-sm"></div>
                <div className="bg-current w-1.5 h-1.5 rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
            >
              <div className="space-y-1 w-4 h-4">
                <div className="bg-current w-full h-1 rounded-sm"></div>
                <div className="bg-current w-full h-1 rounded-sm"></div>
                <div className="bg-current w-full h-1 rounded-sm"></div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients..."
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="p-4">
          <SearchForm
            onSearch={(filters) => console.log('Search filters:', filters)}
          />
        </Card>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {ingredients.length} ingredients found
        </p>
        
        <select className="border rounded-lg px-3 py-2 text-sm">
          <option>Sort by: Recently Listed</option>
          <option>Sort by: Price (Low to High)</option>
          <option>Sort by: Price (High to Low)</option>
          <option>Sort by: Expiry Date</option>
          <option>Sort by: Distance</option>
          <option>Sort by: Discount %</option>
        </select>
      </div>

      {/* Ingredients Grid/List */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
        : 'space-y-4'
      }>
        {ingredients.map(ingredient => 
          viewMode === 'grid' 
            ? renderIngredientCard(ingredient)
            : renderIngredientList(ingredient)
        )}
      </div>

      {/* Load More */}
      <div className="text-center">
        <Button variant="outline">
          Load More Ingredients
        </Button>
      </div>

      {/* Modals */}
      {renderCart()}
      {renderIngredientDetail()}
    </div>
  );
};

export default Marketplace;
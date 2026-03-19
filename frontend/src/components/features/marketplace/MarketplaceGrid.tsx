import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, TrendingDown, Star } from 'lucide-react';
import { Ingredient } from '@/types/ingredient';
import { formatCurrency, formatExpiryDate } from '@/utils/formatters';

interface MarketplaceGridProps {
  ingredients: Ingredient[];
  onPurchase: (ingredientId: string) => void;
  onViewDetails: (ingredient: Ingredient) => void;
  loading?: boolean;
}

export const MarketplaceGrid: React.FC<MarketplaceGridProps> = ({
  ingredients,
  onPurchase,
  onViewDetails,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (ingredients.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No ingredients found</div>
        <div className="text-gray-600">Try adjusting your search filters</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {ingredients.map((ingredient) => {
        const expiryInfo = formatExpiryDate(ingredient.expiry.expiryDate);
        const hasDiscount = ingredient.pricing.basePrice > ingredient.pricing.currentPrice;
        
        return (
          <Card 
            key={ingredient._id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onViewDetails(ingredient)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {ingredient.name}
                </CardTitle>
                <div className="flex items-center space-x-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">
                    {ingredient.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {ingredient.vendorLocation.address}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {ingredient.images && ingredient.images.length > 0 && (
                <div className="aspect-video w-full overflow-hidden rounded-md bg-gray-100">
                  <img
                    src={ingredient.images[0]}
                    alt={ingredient.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Quantity</span>
                  <span className="font-medium">
                    {ingredient.quantity.available} {ingredient.quantity.unit}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Price per {ingredient.quantity.unit}</span>
                  <div className="flex items-center space-x-2">
                    {hasDiscount && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(ingredient.pricing.basePrice)}
                      </span>
                    )}
                    <span className="font-bold text-green-600">
                      {formatCurrency(ingredient.pricing.currentPrice)}
                    </span>
                  </div>
                </div>
                
                {hasDiscount && (
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    <span>
                      {ingredient.pricing.discountPercentage}% off
                    </span>
                  </div>
                )}
                
                <div className={`flex items-center text-sm ${expiryInfo.color}`}>
                  <Clock className="w-4 h-4 mr-1" />
                  <span>
                    {expiryInfo.daysLeft < 0 ? 'Expired' : 
                     expiryInfo.daysLeft === 0 ? 'Expires today' :
                     `Expires in ${expiryInfo.daysLeft} day${expiryInfo.daysLeft > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(ingredient);
                  }}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPurchase(ingredient._id);
                  }}
                  disabled={ingredient.quantity.available === 0}
                >
                  {ingredient.quantity.available === 0 ? 'Out of Stock' : 'Buy Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
import React, { useState } from 'react';
import { Edit, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInventoryStore } from '@/store/inventoryStore';

import { formatCurrency, formatDate, getDaysUntilExpiry } from '@/utils/formatters';

interface InventoryListProps {
  loading?: boolean;
}

export const InventoryList: React.FC<InventoryListProps> = ({ loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiry' | 'price'>('name');

  const store = useInventoryStore();
  const ingredients = store.ingredients ?? [];
  const { removeIngredient } = store;

  const filteredIngredients = [...ingredients]
    .filter((ingredient) =>
      `${ingredient.name} ${ingredient.category}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'expiry':
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        case 'price':
          return b.price - a.price;
        default:
          return 0;
      }
    });

  const getExpiryStatus = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50' };
    if (days <= 1) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (days <= 3) return { status: 'warning', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading inventory...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Inventory</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'expiry' | 'price')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="expiry">Sort by Expiry</option>
            <option value="price">Sort by Price</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredIngredients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">No ingredients found</div>
            <div>Add some ingredients to your inventory to get started</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIngredients.map((ingredient) => {
              const expiryInfo = getExpiryStatus(ingredient.expiryDate);
              const isLowStock = ingredient.quantity <= ingredient.minStockLevel;

              return (
                <div
                  key={ingredient.id}
                  className={`p-4 border rounded-lg ${expiryInfo.bg} border-gray-200`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{ingredient.name}</h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {ingredient.category}
                        </span>
                        {isLowStock && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Low Stock
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Quantity:</span>
                          <div className="font-medium">
                            {ingredient.quantity} {ingredient.unit}
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-600">Price per {ingredient.unit}:</span>
                          <div className="font-medium">{formatCurrency(ingredient.price)}</div>
                        </div>

                        <div>
                          <span className="text-gray-600">Expiry Date:</span>
                          <div className={`font-medium ${expiryInfo.color}`}>
                            {formatDate(ingredient.expiryDate)}
                            <div className="text-xs">({getDaysUntilExpiry(ingredient.expiryDate)} days)</div>
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-600">Total Value:</span>
                          <div className="font-medium">
                            {formatCurrency(ingredient.quantity * ingredient.price)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeIngredient(ingredient.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

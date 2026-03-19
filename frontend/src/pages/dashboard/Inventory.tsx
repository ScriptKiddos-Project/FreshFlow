import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from  '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { InventoryList } from '@/components/features/inventory/InventoryList';


interface ListIngredientFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingIngredient?: any;
}

export const ListIngredientForm: React.FC<ListIngredientFormProps> = ({
  isOpen,
  onClose,
  editingIngredient
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: 'kg',
    originalPrice: '',
    currentPrice: '',
    expiryDate: '',
    description: '',
    images: [] as string[]
  });

  useEffect(() => {
    if (editingIngredient) {
      setFormData({
        name: editingIngredient.name || '',
        category: editingIngredient.category || '',
        quantity: editingIngredient.quantity?.toString() || '',
        unit: editingIngredient.unit || 'kg',
        originalPrice: editingIngredient.originalPrice?.toString() || '',
        currentPrice: editingIngredient.currentPrice?.toString() || '',
        expiryDate: editingIngredient.expiryDate || '',
        description: editingIngredient.description || '',
        images: editingIngredient.images || []
      });
    } else {
      setFormData({
        name: '',
        category: '',
        quantity: '',
        unit: 'kg',
        originalPrice: '',
        currentPrice: '',
        expiryDate: '',
        description: '',
        images: []
      });
    }
  }, [editingIngredient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {editingIngredient ? 'Edit Ingredient' : 'List New Ingredient'}
            </h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Ingredient Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Fresh Tomatoes"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('category', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="vegetables">Vegetables</option>
                  <option value="fruits">Fruits</option>
                  <option value="grains">Grains</option>
                  <option value="dairy">Dairy</option>
                  <option value="meat">Meat</option>
                  <option value="spices">Spices</option>
                  <option value="others">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quantity *
                </label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('quantity', e.target.value)}
                  placeholder="e.g., 50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Unit *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('unit', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="l">Liters (l)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pieces">Pieces</option>
                  <option value="packets">Packets</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Original Price (₹) *
                </label>
                <Input
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('originalPrice', e.target.value)}
                  placeholder="e.g., 100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Current Price (₹) *
                </label>
                <Input
                  type="number"
                  value={formData.currentPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('currentPrice', e.target.value)}
                  placeholder="e.g., 80"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Expiry Date *
                </label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('expiryDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                placeholder="Additional details about the ingredient..."
                className="w-full border rounded-lg px-3 py-2 h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Images
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 mb-2">Click to upload images</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 5MB each</p>
                <Button type="button" variant="outline" className="mt-2">
                  Choose Files
                </Button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1">
                {editingIngredient ? 'Update Ingredient' : 'List Ingredient'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
export default InventoryList;

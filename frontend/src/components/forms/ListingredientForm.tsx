import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
// import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Dialog } from '../ui/dialog';
import { Camera, Upload, X, Plus, Calendar, Clock, Tag, Weight, MapPin } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useInventoryStore } from '../../store/inventoryStore';

const ingredientSchema = z.object({
  name: z.string().min(2, 'Ingredient name must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  quantity: z.number().min(0.1, 'Quantity must be at least 0.1'),
  unit: z.string().min(1, 'Please select a unit'),
  currentPrice: z.number().min(0.01, 'Price must be at least ₹0.01'),
  minPrice: z.number().min(0.01, 'Minimum price must be at least ₹0.01'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  expiryTime: z.string().min(1, 'Expiry time is required'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
});

type IngredientFormData = z.infer<typeof ingredientSchema>;

interface ListIngredientFormProps {
  isOpen: boolean;
  onClose: () => void;
  editIngredient?: any;
}

const CATEGORIES = [
  'Vegetables', 'Fruits', 'Spices & Herbs', 'Grains & Cereals', 
  'Dairy Products', 'Meat & Poultry', 'Seafood', 'Oils & Fats',
  'Condiments', 'Snacks', 'Beverages', 'Others'
];

const UNITS = [
  'kg', 'g', 'l', 'ml', 'pieces', 'dozens', 'bunches', 'packets'
];

const COMMON_TAGS = [
  'Organic', 'Fresh', 'Premium', 'Local', 'Seasonal', 'Bulk Deal',
  'Quick Sale', 'Restaurant Quality', 'Farm Fresh', 'Export Quality'
];

export const ListIngredientForm: React.FC<ListIngredientFormProps> = ({
  isOpen,
  onClose,
  editIngredient
}) => {
  const { user } = useAuthStore();
  const { addIngredient, updateIngredient, isLoading } = useInventoryStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedTags, setSelectedTags] = useState<string[]>(editIngredient?.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>(editIngredient?.images || []);
  const [dragActive, setDragActive] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: editIngredient ? {
      ...editIngredient,
      expiryDate: editIngredient.expiryDate?.split('T')[0],
      expiryTime: editIngredient.expiryDate?.split('T')[1]?.slice(0, 5),
    } : {
      quantity: 1,
      unit: 'kg',
      category: '',
      location: user?.businessDetails?.address || '',
      tags: [],
      images: []
    }
  });

  const watchedMinPrice = watch('minPrice');
  const watchedCurrentPrice = watch('currentPrice');

  const handleImageUpload = (files: FileList) => {
    const newImages: string[] = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          newImages.push(result);
          if (newImages.length === files.length) {
            setUploadedImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const addCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim());
      setCustomTag('');
    }
  };

  const calculateSuggestedPrice = () => {
    // Simple pricing suggestion based on category and quantity
    const basePrice = watchedCurrentPrice || 0;
    const quantity = watch('quantity') || 1;
    
    if (quantity > 10) return Math.max(basePrice * 0.9, watchedMinPrice || 0);
    if (quantity > 5) return Math.max(basePrice * 0.95, watchedMinPrice || 0);
    return basePrice;
  };

  const onSubmit = async (data: IngredientFormData) => {
    try {
      const currentPrice = data.currentPrice;
      const suggestedPrice = calculateSuggestedPrice();
      const discount = Math.max(0, ((currentPrice - suggestedPrice) / currentPrice) * 100);

      const ingredientData = {
  ...data,
  id: editIngredient?.id || `ingredient_${Date.now()}`,
  tags: selectedTags,
  image: uploadedImages[0] || undefined, // Take first image only
  expiryDate: new Date(`${data.expiryDate}T${data.expiryTime}`).toISOString(),
  vendorId: user?.id || '',
  vendorName: user?.businessDetails?.businessName || user?.name || '',
  price: currentPrice,
  originalPrice: currentPrice,
  suggestedPrice: suggestedPrice,
  discount: discount,
  status: 'available' as const,
  isUrgent: discount > 20 || false,
  minStockLevel: 1, // Add default minimum stock level
  listingDate: editIngredient?.listingDate || new Date().toISOString(),
  createdAt: editIngredient?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

      if (editIngredient) {
        await updateIngredient(editIngredient.id, ingredientData);
      } else {
        await addIngredient(ingredientData);
      }

      reset();
      setSelectedTags([]);
      setUploadedImages([]);
      onClose();
    } catch (error) {
      console.error('Failed to save ingredient:', error);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedTags([]);
    setUploadedImages([]);
    setCustomTag('');
    onClose();
  };

  return (
    // <Dialog open={isOpen} onOpenChange={handleClose} className="max-w-4xl">
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {editIngredient ? 'Edit Ingredient' : 'List New Ingredient'}
          </h2>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Tag className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredient Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('name')}
                    placeholder="e.g., Fresh Tomatoes"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Weight className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      {...register('quantity', { valueAsNumber: true })}
                      type="number"
                      step="0.1"
                      placeholder="1.0"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {errors.quantity && (
                    <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    {...register('unit')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                  {errors.unit && (
                    <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('location')}
                    placeholder="e.g., Andheri West, Mumbai"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {errors.location && (
                  <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the quality, condition, or special features of your ingredient..."
              />
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Tag className="h-5 w-5 mr-2 text-green-600" />
              Pricing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Price (₹)
                </label>
                <input
                  {...register('currentPrice', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.currentPrice && (
                  <p className="text-red-500 text-xs mt-1">{errors.currentPrice.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Price (₹)
                </label>
                <input
                  {...register('minPrice', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="80.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.minPrice && (
                  <p className="text-red-500 text-xs mt-1">{errors.minPrice.message}</p>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suggested Price
                </label>
                <p className="text-lg font-semibold text-green-600">
                  ₹{calculateSuggestedPrice().toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  Based on quantity and market trends
                </p>
              </div>
            </div>

            {watchedMinPrice && watchedCurrentPrice && watchedMinPrice > watchedCurrentPrice && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Minimum price should not exceed current price
                </p>
              </div>
            )}
          </Card>

          {/* Expiry Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Expiry Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('expiryDate')}
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {errors.expiryDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.expiryDate.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Time
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('expiryTime')}
                    type="time"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {errors.expiryTime && (
                  <p className="text-red-500 text-xs mt-1">{errors.expiryTime.message}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Images Upload */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2 text-purple-600" />
              Images ({uploadedImages.length}/5)
            </h3>
            
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 mb-2">
                Drag and drop images here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  browse files
                </button>
              </p>
              <p className="text-xs text-gray-500">
                Maximum 5 images, up to 5MB each (JPG, PNG, WebP)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              className="hidden"
            />

            {/* Image Preview */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tags */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Tags ({selectedTags.length})
            </h3>
            
            {/* Common Tags */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Popular tags:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    disabled={selectedTags.includes(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 text-blue-700 border-blue-300 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {selectedTags.includes(tag) ? '✓ ' : '+ '}{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Tag Input */}
            <div className="flex gap-2 mb-4">
              <input
                placeholder="Add custom tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomTag}
                disabled={!customTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Selected tags:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
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
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              loading={isLoading}
            >
              {editIngredient ? 'Update Ingredient' : 'List Ingredient'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};
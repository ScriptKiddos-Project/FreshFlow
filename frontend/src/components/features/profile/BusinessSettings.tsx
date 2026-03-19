import React, { useState } from 'react';
import { Save, Clock, MapPin, Phone, Building, FileText, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const businessSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessAddress: z.string().min(5, 'Address must be at least 5 characters'),
  businessType: z.enum(['street_vendor', 'restaurant', 'cafe', 'hotel', 'catering', 'retailer', 'wholesaler']),
  gstNumber: z.string().optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  operatingHours: z.object({
    open: z.string(),
    close: z.string(),
  }),
});

type BusinessFormData = z.infer<typeof businessSchema>;

export const BusinessSettings: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [showGST, setShowGST] = useState(false);
  const { user, updateProfile } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      businessName: user?.businessName || '',
      businessAddress: user?.businessAddress || '',
      businessType: user?.businessType || 'street_vendor',
      gstNumber: user?.gstNumber || '',
      phone: user?.phone || '',
      operatingHours: {
        open: user?.operatingHours?.open || '09:00',
        close: user?.operatingHours?.close || '18:00',
      },
    }
  });

  const businessTypeOptions = [
    { value: 'street_vendor', label: 'Street Vendor' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'cafe', label: 'Cafe' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'catering', label: 'Catering Service' },
    { value: 'retailer', label: 'Retailing Service' },
    { value: 'wholesaler', label: 'Wholesale Service' },
  ];

  const onSubmit = async (data: BusinessFormData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
      // Show success message
    } catch (error) {
      console.error('Business settings update failed:', error);
      // Show error message
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Business Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Business Information
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <Input
                  {...register('businessName')}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : ''}
                />
                {errors.businessName && (
                  <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                <select
                  {...register('businessType')}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                >
                  {businessTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.businessType && (
                  <p className="text-red-500 text-sm mt-1">{errors.businessType.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Business Phone
                </label>
                <Input
                  {...register('phone')}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : ''}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                  <span>
                    <FileText className="w-4 h-4 inline mr-1" />
                    GST Number (Optional)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGST(!showGST)}
                    disabled={!isEditing}
                  >
                    {showGST ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </label>
                <Input
                  {...register('gstNumber')}
                  type={showGST ? 'text' : 'password'}
                  placeholder="Enter GST number if applicable"
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-gray-50' : ''}
                />
                {errors.gstNumber && (
                  <p className="text-red-500 text-sm mt-1">{errors.gstNumber.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Business Address
              </label>
              <textarea
                {...register('businessAddress')}
                disabled={!isEditing}
                rows={3}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
                placeholder="Enter your complete business address"
              />
              {errors.businessAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.businessAddress.message}</p>
              )}
            </div>

            {/* Operating Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Clock className="w-4 h-4 inline mr-1" />
                Operating Hours
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Opening Time</label>
                  <Input
                    {...register('operatingHours.open')}
                    type="time"
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Closing Time</label>
                  <Input
                    {...register('operatingHours.close')}
                    type="time"
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />
                </div>
              </div>
              {(errors.operatingHours?.open || errors.operatingHours?.close) && (
                <p className="text-red-500 text-sm mt-1">Please set valid operating hours</p>
              )}
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Business Status */}
      <Card>
        <CardHeader>
          <CardTitle>Business Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">Verification Status</span>
                <div className={`w-3 h-3 rounded-full ${user?.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              </div>
              <p className="text-green-600 font-semibold mt-1">
                {user?.isVerified ? 'Verified' : 'Pending Verification'}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Account Status</span>
                <div className={`w-3 h-3 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              <p className="text-blue-600 font-semibold mt-1">
                {user?.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <span className="text-sm font-medium text-purple-800">Member Since</span>
              <p className="text-purple-600 font-semibold mt-1">
                {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessSettings;
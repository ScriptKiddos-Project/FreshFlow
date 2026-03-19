import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Building, User, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ✅ FIXED: Updated imports - removed Select import that was causing the error
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
// ✅ REMOVED: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAuthStore } from '../../store/authStore';

// ✅ Temporary Alert components if ui/alert doesn't exist
const Alert: React.FC<{ variant?: 'destructive'; children: React.ReactNode; className?: string }> = ({ 
  variant, 
  children, 
  className = '' 
}) => (
  <div className={`rounded-md p-4 ${variant === 'destructive' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'} ${className}`}>
    {children}
  </div>
);

const AlertDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`text-sm ${className}`}>{children}</div>
);

// ✅ FIXED: Custom Select components with proper typing
const CustomSelect: React.FC<{ children: React.ReactNode; onValueChange?: (value: string) => void; defaultValue?: string }> = ({ 
  children, 
  onValueChange,
  defaultValue 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue || '');

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    onValueChange?.(value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === CustomSelectTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, { 
            onClick: () => setIsOpen(!isOpen),
            selectedValue 
          });
        }
        if (React.isValidElement(child) && child.type === CustomSelectContent) {
          return isOpen ? React.cloneElement(child as React.ReactElement<any>, { onItemSelect: handleSelect }) : null;
        }
        return child;
      })}
    </div>
  );
};

const CustomSelectTrigger: React.FC<{ children: React.ReactNode; onClick?: () => void; selectedValue?: string; className?: string }> = ({ 
  children, 
  onClick,
  selectedValue,
  className = '' 
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 ${className}`}
  >
    {selectedValue || children}
  </button>
);

const CustomSelectContent: React.FC<{ children: React.ReactNode; onItemSelect?: (value: string) => void }> = ({ children, onItemSelect }) => (
  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
    {React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, { onItemSelect });
      }
      return child;
    })}
  </div>
);

const CustomSelectItem: React.FC<{ value: string; children: React.ReactNode; onItemSelect?: (value: string) => void }> = ({ 
  value, 
  children, 
  onItemSelect 
}) => (
  <div
    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
    onClick={() => onItemSelect?.(value)}
  >
    {children}
  </div>
);

const CustomSelectValue: React.FC<{ placeholder: string }> = ({ placeholder }) => (
  <span className="text-gray-500">{placeholder}</span>
);

// Validation schema
const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  businessType: z.enum(['street_vendor', 'restaurant', 'cafe', 'hotel', 'catering'], {
    required_error: 'Please select a business type',
  }),
  address: z.object({
    street: z.string().min(5, 'Street address is required'),
    area: z.string().min(2, 'Area is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().min(6, 'Pincode must be 6 digits').max(6, 'Pincode must be 6 digits'),
  }),
  gstNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  
  // ✅ FIXED: Updated to match your actual auth store properties
  const { 
    register: registerUser, 
    isAuthLoading: loading, 
    authError: error, 
    setAuthError,
    isAuthenticated 
  } = useAuthStore();
  
  // ✅ Create clearError function from setAuthError
  const clearError = () => setAuthError(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Form handling
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessName: '',
      ownerName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      businessType: undefined,
      address: {
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
      },
      gstNumber: '',
      fssaiNumber: '',
      termsAccepted: false,
    },
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear error on component mount
  React.useEffect(() => {
    clearError();
  }, []);

  // Handle form submission
  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      
      // ✅ FIXED: Create payload that matches your store's RegisterData interface
      const registerPayload = {
        businessName: data.businessName,
        ownerName: data.ownerName,
        email: data.email.toLowerCase().trim(),
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword,
        businessType: data.businessType,
        address: data.address,
        businessAddress: `${data.address.street}, ${data.address.area}, ${data.address.city}, ${data.address.state} ${data.address.pincode}`,
        gstNumber: data.gstNumber,
        fssaiNumber: data.fssaiNumber,
        name: data.businessName,
        coordinates: {
          lat: 0,
          lng: 0
        },
        operatingHours: {
          open: "09:00",
          close: "18:00", 
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        },
        termsAccepted: data.termsAccepted
      };

      await registerUser(registerPayload);
      setRegistrationSuccess(true);
      
      // Redirect after successful registration
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  // Success state
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
              <p className="text-gray-600">Welcome to FreshFlow! Redirecting you to your dashboard...</p>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Logo and Brand */}
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FreshFlow</h1>
          </div>
          <p className="text-gray-600">Join our vendor network</p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
            <CardDescription>
              Fill in your business details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-green-600" />
                  Business Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Business Name */}
                  <div className="space-y-2">
                    <label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                      Business Name *
                    </label>
                    <Input
                      id="businessName"
                      placeholder="Enter your business name"
                      {...register('businessName')}
                      className={errors.businessName ? 'border-red-500' : ''}
                      disabled={loading || isSubmitting}
                    />
                    {errors.businessName && (
                      <p className="text-sm text-red-600">{errors.businessName.message}</p>
                    )}
                  </div>

                  {/* Owner Name */}
                  <div className="space-y-2">
                    <label htmlFor="ownerName" className="text-sm font-medium text-gray-700">
                      Owner Name *
                    </label>
                    <Input
                      id="ownerName"
                      placeholder="Enter owner's full name"
                      {...register('ownerName')}
                      className={errors.ownerName ? 'border-red-500' : ''}
                      disabled={loading || isSubmitting}
                    />
                    {errors.ownerName && (
                      <p className="text-sm text-red-600">{errors.ownerName.message}</p>
                    )}
                  </div>
                </div>

                {/* Business Type */}
                <div className="space-y-2">
                  <label htmlFor="businessType" className="text-sm font-medium text-gray-700">
                    Business Type *
                  </label>
                  <CustomSelect onValueChange={(value) => setValue('businessType', value as any)}>
                    <CustomSelectTrigger className={errors.businessType ? 'border-red-500' : ''}>
                      <CustomSelectValue placeholder="Select your business type" />
                    </CustomSelectTrigger>
                    <CustomSelectContent>
                      <CustomSelectItem value="street_vendor">Street Vendor</CustomSelectItem>
                      <CustomSelectItem value="restaurant">Restaurant</CustomSelectItem>
                      <CustomSelectItem value="cafe">Cafe</CustomSelectItem>
                      <CustomSelectItem value="hotel">Hotel</CustomSelectItem>
                      <CustomSelectItem value="catering">Catering Service</CustomSelectItem>
                    </CustomSelectContent>
                  </CustomSelect>
                  {errors.businessType && (
                    <p className="text-sm text-red-600">{errors.businessType.message}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <User className="h-5 w-5 mr-2 text-green-600" />
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        {...register('email')}
                        className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                        disabled={loading || isSubmitting}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        {...register('phone')}
                        className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                        disabled={loading || isSubmitting}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-green-600" />
                  Business Address
                </h3>

                <div className="space-y-4">
                  {/* Street Address */}
                  <div className="space-y-2">
                    <label htmlFor="address.street" className="text-sm font-medium text-gray-700">
                      Street Address *
                    </label>
                    <Input
                      id="address.street"
                      placeholder="Enter street address"
                      {...register('address.street')}
                      className={errors.address?.street ? 'border-red-500' : ''}
                      disabled={loading || isSubmitting}
                    />
                    {errors.address?.street && (
                      <p className="text-sm text-red-600">{errors.address.street.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Area */}
                    <div className="space-y-2">
                      <label htmlFor="address.area" className="text-sm font-medium text-gray-700">
                        Area *
                      </label>
                      <Input
                        id="address.area"
                        placeholder="Enter area/locality"
                        {...register('address.area')}
                        className={errors.address?.area ? 'border-red-500' : ''}
                        disabled={loading || isSubmitting}
                      />
                      {errors.address?.area && (
                        <p className="text-sm text-red-600">{errors.address.area.message}</p>
                      )}
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      <label htmlFor="address.city" className="text-sm font-medium text-gray-700">
                        City *
                      </label>
                      <Input
                        id="address.city"
                        placeholder="Enter city"
                        {...register('address.city')}
                        className={errors.address?.city ? 'border-red-500' : ''}
                        disabled={loading || isSubmitting}
                      />
                      {errors.address?.city && (
                        <p className="text-sm text-red-600">{errors.address.city.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* State */}
                    <div className="space-y-2">
                      <label htmlFor="address.state" className="text-sm font-medium text-gray-700">
                        State *
                      </label>
                      <Input
                        id="address.state"
                        placeholder="Enter state"
                        {...register('address.state')}
                        className={errors.address?.state ? 'border-red-500' : ''}
                        disabled={loading || isSubmitting}
                      />
                      {errors.address?.state && (
                        <p className="text-sm text-red-600">{errors.address.state.message}</p>
                      )}
                    </div>

                    {/* Pincode */}
                    <div className="space-y-2">
                      <label htmlFor="address.pincode" className="text-sm font-medium text-gray-700">
                        Pincode *
                      </label>
                      <Input
                        id="address.pincode"
                        placeholder="Enter 6-digit pincode"
                        {...register('address.pincode')}
                        className={errors.address?.pincode ? 'border-red-500' : ''}
                        disabled={loading || isSubmitting}
                        maxLength={6}
                      />
                      {errors.address?.pincode && (
                        <p className="text-sm text-red-600">{errors.address.pincode.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Business Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-green-600" />
                  Business Documents (Optional)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GST Number */}
                  <div className="space-y-2">
                    <label htmlFor="gstNumber" className="text-sm font-medium text-gray-700">
                      GST Number
                    </label>
                    <Input
                      id="gstNumber"
                      placeholder="Enter GST number (if applicable)"
                      {...register('gstNumber')}
                      disabled={loading || isSubmitting}
                    />
                  </div>

                  {/* FSSAI Number */}
                  <div className="space-y-2">
                    <label htmlFor="fssaiNumber" className="text-sm font-medium text-gray-700">
                      FSSAI Number
                    </label>
                    <Input
                      id="fssaiNumber"
                      placeholder="Enter FSSAI number (if applicable)"
                      {...register('fssaiNumber')}
                      disabled={loading || isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Security</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password *
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        {...register('password')}
                        className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                        disabled={loading || isSubmitting}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading || isSubmitting}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        {...register('confirmPassword')}
                        className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                        disabled={loading || isSubmitting}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading || isSubmitting}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    {...register('termsAccepted')}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
                    disabled={loading || isSubmitting}
                  />
                  <label htmlFor="termsAccepted" className="text-sm text-gray-700">
                    I agree to the{' '}
                    <Link to="/terms" className="text-green-600 hover:text-green-500 font-medium">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-green-600 hover:text-green-500 font-medium">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                {errors.termsAccepted && (
                  <p className="text-sm text-red-600">{errors.termsAccepted.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading || isSubmitting}
              >
                {loading || isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/auth/login"
                  className="text-green-600 hover:text-green-500 font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help with registration?{' '}
            <Link
              to="/support"
              className="text-green-600 hover:text-green-500 font-medium"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
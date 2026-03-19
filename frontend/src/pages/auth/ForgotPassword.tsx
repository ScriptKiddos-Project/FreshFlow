import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ✅ FIXED: Updated imports - adjust paths as needed
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
// ✅ If Alert component doesn't exist, create it or use a simple div
// import { Alert, AlertDescription } from '../../components/ui/alert';
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

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  
  // ✅ FIXED: Updated to match your actual auth store properties
  const { 
    forgotPassword, 
    isAuthLoading: loading, 
    authError: error, 
    setAuthError 
  } = useAuthStore();
  
  // ✅ Create clearError function from setAuthError
  const clearError = () => setAuthError(null);
  
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userEmail, setUserEmail] = useState('');

  // Form handling
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const email = watch('email');

  // Handle form submission
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      clearError();
      await forgotPassword(data.email.toLowerCase().trim());
      
      setUserEmail(data.email.toLowerCase().trim());
      setIsEmailSent(true);
      setCountdown(60); // Start 60-second countdown
      
      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Forgot password error:', err);
    }
  };

  // Resend email
  const handleResendEmail = async () => {
    if (countdown > 0) return;
    
    try {
      clearError();
      await forgotPassword(userEmail);
      setCountdown(60);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Resend email error:', err);
    }
  };

  // Success state - Email sent
  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo and Brand */}
          <div className="text-center">
            <div className="flex justify-center items-center space-x-2 mb-4">
              <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">FreshFlow</h1>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
                  <p className="text-gray-600">
                    We've sent password reset instructions to
                  </p>
                  <p className="font-medium text-gray-900">{userEmail}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Email sent successfully!</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    The email should arrive within a few minutes. Don't forget to check your spam folder.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Didn't receive the email?
                  </p>
                  
                  {countdown > 0 ? (
                    <div className="flex items-center justify-center space-x-2 text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">
                        Resend available in {countdown} seconds
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleResendEmail}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend email'
                      )}
                    </Button>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/auth/login')}
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to sign in
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Still having trouble?{' '}
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
  }

  // Main forgot password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Brand */}
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FreshFlow</h1>
          </div>
          <p className="text-gray-600">Reset your password</p>
        </div>

        {/* Forgot Password Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    {...register('email')}
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    autoComplete="email"
                    disabled={loading || isSubmitting}
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">What happens next?</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• We'll send a secure reset link to your email</li>
                      <li>• The link will expire in 1 hour for security</li>
                      <li>• Follow the link to create a new password</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading || isSubmitting || !email}
              >
                {loading || isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>

              {/* Back to Login */}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/auth/login')}
                disabled={loading || isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Additional Help */}
        <div className="text-center space-y-4">
          <div className="text-sm text-gray-600">
            <p>Remember your password?{' '}
              <Link
                to="/auth/login"
                className="text-green-600 hover:text-green-500 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>Don't have an account?{' '}
              <Link
                to="/auth/register"
                className="text-green-600 hover:text-green-500 font-medium"
              >
                Sign up here
              </Link>
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need immediate help?{' '}
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
    </div>
  );
};

export default ForgotPassword;
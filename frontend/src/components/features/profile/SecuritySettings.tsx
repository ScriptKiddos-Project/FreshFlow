import React, { useState } from 'react';
import { Shield, Lock, Smartphone, Eye, EyeOff, AlertTriangle, CheckCircle, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

export const SecuritySettings: React.FC = () => {
  const { user } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loginSessions] = useState([
    {
      id: '1',
      device: 'Chrome on Windows',
      location: 'Mumbai, Maharashtra',
      lastActive: '2 minutes ago',
      current: true,
      ip: '192.168.1.1'
    },
    {
      id: '2',
      device: 'Mobile App on Android',
      location: 'Mumbai, Maharashtra',
      lastActive: '1 hour ago',
      current: false,
      ip: '192.168.1.2'
    },
    {
      id: '3',
      device: 'Safari on iPhone',
      location: 'Pune, Maharashtra',
      lastActive: '2 days ago',
      current: false,
      ip: '103.45.67.89'
    }
  ]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    setSaving(true);
    try {
      // API call to change password
      // await changePassword(passwordForm);
      console.log('Changing password:', passwordForm);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      alert('Password changed successfully');
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    setSaving(true);
    try {
      // API call to toggle 2FA
      // await toggle2FA(!twoFactorEnabled);
      console.log('Toggling 2FA:', !twoFactorEnabled);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTwoFactorEnabled(!twoFactorEnabled);
      alert(twoFactorEnabled ? '2FA disabled successfully' : '2FA enabled successfully');
    } catch (error) {
      console.error('Failed to toggle 2FA:', error);
      alert('Failed to update 2FA setting');
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      // API call to terminate session
      // await terminateSession(sessionId);
      console.log('Terminating session:', sessionId);
      
      alert('Session terminated successfully');
    } catch (error) {
      console.error('Failed to terminate session:', error);
      alert('Failed to terminate session');
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return 'bg-red-500';
    if (strength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return 'Weak';
    if (strength < 4) return 'Medium';
    return 'Strong';
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-medium text-green-800">Account Verified</p>
                <p className="text-sm text-green-600">Email and phone verified</p>
              </div>
            </div>
            <div className={`flex items-center space-x-3 p-4 rounded-lg ${
              twoFactorEnabled ? 'bg-green-50' : 'bg-orange-50'
            }`}>
              <Smartphone className={`w-8 h-8 ${
                twoFactorEnabled ? 'text-green-500' : 'text-orange-500'
              }`} />
              <div>
                <p className={`font-medium ${
                  twoFactorEnabled ? 'text-green-800' : 'text-orange-800'
                }`}>
                  2FA {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className={`text-sm ${
                  twoFactorEnabled ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {twoFactorEnabled ? 'Extra security active' : 'Consider enabling 2FA'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Key className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium text-blue-800">Strong Password</p>
                <p className="text-sm text-blue-600">Last changed 30 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            Change Password
          </CardTitle>
          <p className="text-sm text-gray-600">
            Ensure your account stays secure with a strong password
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordForm.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getStrengthColor(passwordStrength)}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {getStrengthText(passwordStrength)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="w-5 h-5 mr-2" />
            Two-Factor Authentication
          </CardTitle>
          <p className="text-sm text-gray-600">
            Add an extra layer of security to your account
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                twoFactorEnabled ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Shield className={`w-5 h-5 ${
                  twoFactorEnabled ? 'text-green-600' : 'text-gray-600'
                }`} />
              </div>
              <div>
                <p className="font-medium">
                  Two-Factor Authentication is {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-sm text-gray-600">
                  {twoFactorEnabled 
                    ? 'Your account has enhanced security protection'
                    : 'Protect your account with SMS or authenticator app'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={handleToggle2FA}
              disabled={saving}
              variant={twoFactorEnabled ? 'outline' : 'default'}
            >
              {saving ? 'Updating...' : (twoFactorEnabled ? 'Disable' : 'Enable')}
            </Button>
          </div>

          {twoFactorEnabled && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    2FA is protecting your account
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    You'll be asked for a verification code when signing in from new devices.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <p className="text-sm text-gray-600">
            Manage your active sessions across different devices
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loginSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    session.current ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Smartphone className={`w-5 h-5 ${
                      session.current ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{session.device}</p>
                      {session.current && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{session.location}</p>
                    <p className="text-xs text-gray-500">
                      {session.ip} • Last active {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTerminateSession(session.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Terminate
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p className="text-sm text-gray-700">
                Use a unique password that you don't use anywhere else
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p className="text-sm text-gray-700">
                Enable two-factor authentication for enhanced security
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p className="text-sm text-gray-700">
                Log out of shared or public devices when you're done
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p className="text-sm text-gray-700">
                Regularly review your account activity and active sessions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
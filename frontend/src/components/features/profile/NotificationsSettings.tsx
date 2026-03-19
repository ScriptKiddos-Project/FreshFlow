import React, { useState } from 'react';
import { Bell, Mail, MessageSquare, ShoppingCart, TrendingUp, AlertTriangle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { useAuthStore } from '@/store/authStore';
import { useAuthStore } from '@/store/authStore';

interface NotificationPreferences {
  email: {
    newOrders: boolean;
    orderUpdates: boolean;
    paymentNotifications: boolean;
    marketingEmails: boolean;
    systemUpdates: boolean;
  };
  push: {
    newOrders: boolean;
    orderUpdates: boolean;
    paymentNotifications: boolean;
    promotions: boolean;
    systemAlerts: boolean;
  };
  sms: {
    newOrders: boolean;
    paymentNotifications: boolean;
    emergencyAlerts: boolean;
  };
}

export const NotificationSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      newOrders: true,
      orderUpdates: true,
      paymentNotifications: true,
      marketingEmails: false,
      systemUpdates: true,
    },
    push: {
      newOrders: true,
      orderUpdates: true,
      paymentNotifications: true,
      promotions: false,
      systemAlerts: true,
    },
    sms: {
      newOrders: true,
      paymentNotifications: true,
      emergencyAlerts: true,
    },
  });

  const handleToggle = <T extends keyof NotificationPreferences>(
    category: T,
    setting: keyof NotificationPreferences[T]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !(prev[category] as any)[setting]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // API call to save notification preferences
      // await updateNotificationPreferences(preferences);
      console.log('Saving notification preferences:', preferences);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      // Show error message
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch: React.FC<{ 
    checked: boolean; 
    onChange: () => void; 
    disabled?: boolean;
  }> = ({ checked, onChange, disabled = false }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
          <p className="text-sm text-gray-600">
            Manage your email notification preferences
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">New Orders</p>
                <p className="text-sm text-gray-600">Get notified when you receive new orders</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.email.newOrders}
              onChange={() => handleToggle('email', 'newOrders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">Order Updates</p>
                <p className="text-sm text-gray-600">Updates on order status changes</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.email.orderUpdates}
              onChange={() => handleToggle('email', 'orderUpdates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">Payment Notifications</p>
                <p className="text-sm text-gray-600">Payment confirmations and invoices</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.email.paymentNotifications}
              onChange={() => handleToggle('email', 'paymentNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-gray-600">Promotional offers and newsletters</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.email.marketingEmails}
              onChange={() => handleToggle('email', 'marketingEmails')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">System Updates</p>
                <p className="text-sm text-gray-600">Important app updates and maintenance notices</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.email.systemUpdates}
              onChange={() => handleToggle('email', 'systemUpdates')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <p className="text-sm text-gray-600">
            Control push notifications on your devices
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">New Orders</p>
                <p className="text-sm text-gray-600">Instant notifications for new orders</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.push.newOrders}
              onChange={() => handleToggle('push', 'newOrders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">Order Updates</p>
                <p className="text-sm text-gray-600">Status changes and customer messages</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.push.orderUpdates}
              onChange={() => handleToggle('push', 'orderUpdates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">Payment Notifications</p>
                <p className="text-sm text-gray-600">Payment received confirmations</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.push.paymentNotifications}
              onChange={() => handleToggle('push', 'paymentNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">Promotions</p>
                <p className="text-sm text-gray-600">Special offers and promotional campaigns</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.push.promotions}
              onChange={() => handleToggle('push', 'promotions')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">System Alerts</p>
                <p className="text-sm text-gray-600">Critical system notifications</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.push.systemAlerts}
              onChange={() => handleToggle('push', 'systemAlerts')}
            />
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Notifications
          </CardTitle>
          <p className="text-sm text-gray-600">
            SMS notifications to {user?.phone || 'your phone number'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">New Orders</p>
                <p className="text-sm text-gray-600">SMS alerts for new orders</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.sms.newOrders}
              onChange={() => handleToggle('sms', 'newOrders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">Payment Notifications</p>
                <p className="text-sm text-gray-600">SMS for payment confirmations</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.sms.paymentNotifications}
              onChange={() => handleToggle('sms', 'paymentNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium">Emergency Alerts</p>
                <p className="text-sm text-gray-600">Critical alerts and system emergencies</p>
              </div>
            </div>
            <ToggleSwitch
              checked={preferences.sms.emergencyAlerts}
              onChange={() => handleToggle('sms', 'emergencyAlerts')}
              disabled={true}
            />
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Emergency Alerts Required</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Emergency alerts cannot be disabled for security and safety reasons.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[120px]"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
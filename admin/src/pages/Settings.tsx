import React, { useState, useEffect } from 'react';
import adminApi from '../services/adminApi';
import { SystemSettingsConfig, PricingConfig, NotificationConfig } from '../types/admin';

// Mock UI Components (replace with your actual UI components)
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);

const Button: React.FC<{ 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean; 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}> = ({ children, onClick, disabled = false, variant = 'default', className = '' }) => {
  const baseClass = "px-4 py-2 rounded-md text-sm font-medium transition-colors";
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50"
  };
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Input: React.FC<{ 
  value: string | number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  step?: string;
  className?: string;
}> = ({ value, onChange, type = 'text', step, className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    step={step}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
  />
);

const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}> = ({ children, variant = 'default' }) => {
  const variantClasses = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800",
    destructive: "bg-red-100 text-red-800",
    outline: "border border-gray-300 text-gray-700"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
};

// Mock hooks (replace with your actual hooks)
const useAdminAuth = () => ({
  user: { id: '1', name: 'Admin User', email: 'admin@example.com' },
  permissions: { canManageSettings: true }
});

const useRealTimeData = () => ({
  systemStats: { status: 'healthy' }
});

interface SettingsTabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SettingsTabs: React.FC<SettingsTabProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'system', label: 'System Configuration', icon: '⚙' },
    { id: 'pricing', label: 'Pricing Settings', icon: '💰' },
    { id: 'notifications', label: 'Notification Settings', icon: '🔔' },
    { id: 'security', label: 'Security & Access', icon: '🔒' },
    { id: 'features', label: 'Feature Flags', icon: '🚩' },
    { id: 'backup', label: 'Backup & Recovery', icon: '💾' }
  ];

  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

const SystemConfigurationTab: React.FC = () => {
  const [config, setConfig] = useState<SystemSettingsConfig>({
    appName: 'FreshFlow',
    version: '1.0.0',
    maintenanceMode: false,
    maxVendorsPerDay: 50,
    maxOrdersPerVendor: 100,
    sessionTimeout: 3600,
    apiRateLimit: 1000,
    enableRegistration: true,
    requireEmailVerification: true,
    autoApproveVendors: false
  });

  const [loading, setLoading] = useState(false);

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await adminApi.config.updateSystemConfig(config);
      alert('System configuration updated successfully');
    } catch (error) {
      console.error('Failed to update system config:', error);
      alert('Failed to update system configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">General Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Application Name</label>
            <Input
              value={config.appName}
              onChange={(e) => setConfig({ ...config, appName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Version</label>
            <Input
              value={config.version}
              onChange={(e) => setConfig({ ...config, version: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Vendors Per Day</label>
            <Input
              type="number"
              value={config.maxVendorsPerDay}
              onChange={(e) => setConfig({ ...config, maxVendorsPerDay: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Session Timeout (seconds)</label>
            <Input
              type="number"
              value={config.sessionTimeout}
              onChange={(e) => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Feature Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Maintenance Mode</h4>
              <p className="text-sm text-gray-600">Temporarily disable user access</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={config.maintenanceMode ? 'destructive' : 'secondary'}>
                {config.maintenanceMode ? 'ON' : 'OFF'}
              </Badge>
              <Button
                variant={config.maintenanceMode ? 'destructive' : 'default'}
                onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
              >
                Toggle
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">New Vendor Registration</h4>
              <p className="text-sm text-gray-600">Allow new vendors to register</p>
            </div>
            <Button
              variant={config.enableRegistration ? 'default' : 'secondary'}
              onClick={() => setConfig({ ...config, enableRegistration: !config.enableRegistration })}
            >
              {config.enableRegistration ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto-Approve Vendors</h4>
              <p className="text-sm text-gray-600">Automatically approve new vendor registrations</p>
            </div>
            <Button
              variant={config.autoApproveVendors ? 'default' : 'secondary'}
              onClick={() => setConfig({ ...config, autoApproveVendors: !config.autoApproveVendors })}
            >
              {config.autoApproveVendors ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveConfig} disabled={loading}>
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};

const PricingSettingsTab: React.FC = () => {
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    dynamicPricingEnabled: true,
    priceUpdateInterval: 300,
    maxPriceFluctuation: 15,
    minimumProfitMargin: 10,
    expiryDiscountRate: 25,
    bulkDiscountThreshold: 100,
    bulkDiscountRate: 10,
    platformCommission: 5,
    paymentGatewayFee: 2.5
  });

  const [loading, setLoading] = useState(false);

  const handleSavePricingConfig = async () => {
    setLoading(true);
    try {
      await adminApi.config.updatePricingConfig(pricingConfig);
      alert('Pricing configuration updated successfully');
    } catch (error) {
      console.error('Failed to update pricing config:', error);
      alert('Failed to update pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dynamic Pricing Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Price Update Interval (seconds)</label>
            <Input
              type="number"
              value={pricingConfig.priceUpdateInterval}
              onChange={(e) => setPricingConfig({ ...pricingConfig, priceUpdateInterval: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Price Fluctuation (%)</label>
            <Input
              type="number"
              value={pricingConfig.maxPriceFluctuation}
              onChange={(e) => setPricingConfig({ ...pricingConfig, maxPriceFluctuation: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Profit Margin (%)</label>
            <Input
              type="number"
              value={pricingConfig.minimumProfitMargin}
              onChange={(e) => setPricingConfig({ ...pricingConfig, minimumProfitMargin: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Expiry Discount Rate (%)</label>
            <Input
              type="number"
              value={pricingConfig.expiryDiscountRate}
              onChange={(e) => setPricingConfig({ ...pricingConfig, expiryDiscountRate: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Commission & Fees</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Platform Commission (%)</label>
            <Input
              type="number"
              step="0.1"
              value={pricingConfig.platformCommission}
              onChange={(e) => setPricingConfig({ ...pricingConfig, platformCommission: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Payment Gateway Fee (%)</label>
            <Input
              type="number"
              step="0.1"
              value={pricingConfig.paymentGatewayFee}
              onChange={(e) => setPricingConfig({ ...pricingConfig, paymentGatewayFee: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Bulk Discount Threshold (₹)</label>
            <Input
              type="number"
              value={pricingConfig.bulkDiscountThreshold}
              onChange={(e) => setPricingConfig({ ...pricingConfig, bulkDiscountThreshold: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Bulk Discount Rate (%)</label>
            <Input
              type="number"
              value={pricingConfig.bulkDiscountRate}
              onChange={(e) => setPricingConfig({ ...pricingConfig, bulkDiscountRate: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSavePricingConfig} disabled={loading}>
          {loading ? 'Saving...' : 'Save Pricing Configuration'}
        </Button>
      </div>
    </div>
  );
};

const NotificationSettingsTab: React.FC = () => {
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    orderNotifications: true,
    priceAlerts: true,
    expiryAlerts: true,
    systemAlerts: true,
    marketingEmails: false,
    weeklyReports: true,
    monthlyReports: true
  });

  const [loading, setLoading] = useState(false);

  const handleSaveNotificationConfig = async () => {
    setLoading(true);
    try {
      await adminApi.config.updateNotificationConfig(notificationConfig);
      alert('Notification configuration updated successfully');
    } catch (error) {
      console.error('Failed to update notification config:', error);
      alert('Failed to update notification configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-sm text-gray-600">Send notifications via email</p>
            </div>
            <Button
              variant={notificationConfig.emailNotifications ? 'default' : 'secondary'}
              onClick={() => setNotificationConfig({ ...notificationConfig, emailNotifications: !notificationConfig.emailNotifications })}
            >
              {notificationConfig.emailNotifications ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">SMS Notifications</h4>
              <p className="text-sm text-gray-600">Send notifications via SMS</p>
            </div>
            <Button
              variant={notificationConfig.smsNotifications ? 'default' : 'secondary'}
              onClick={() => setNotificationConfig({ ...notificationConfig, smsNotifications: !notificationConfig.smsNotifications })}
            >
              {notificationConfig.smsNotifications ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Push Notifications</h4>
              <p className="text-sm text-gray-600">Send push notifications to mobile apps</p>
            </div>
            <Button
              variant={notificationConfig.pushNotifications ? 'default' : 'secondary'}
              onClick={() => setNotificationConfig({ ...notificationConfig, pushNotifications: !notificationConfig.pushNotifications })}
            >
              {notificationConfig.pushNotifications ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Order Notifications</h4>
              <p className="text-sm text-gray-600">Notify vendors about new orders</p>
            </div>
            <Button
              variant={notificationConfig.orderNotifications ? 'default' : 'secondary'}
              onClick={() => setNotificationConfig({ ...notificationConfig, orderNotifications: !notificationConfig.orderNotifications })}
            >
              {notificationConfig.orderNotifications ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Price Alerts</h4>
              <p className="text-sm text-gray-600">Alert vendors about significant price changes</p>
            </div>
            <Button
              variant={notificationConfig.priceAlerts ? 'default' : 'secondary'}
              onClick={() => setNotificationConfig({ ...notificationConfig, priceAlerts: !notificationConfig.priceAlerts })}
            >
              {notificationConfig.priceAlerts ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Expiry Alerts</h4>
              <p className="text-sm text-gray-600">Alert vendors about expiring ingredients</p>
            </div>
            <Button
              variant={notificationConfig.expiryAlerts ? 'default' : 'secondary'}
              onClick={() => setNotificationConfig({ ...notificationConfig, expiryAlerts: !notificationConfig.expiryAlerts })}
            >
              {notificationConfig.expiryAlerts ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveNotificationConfig} disabled={loading}>
          {loading ? 'Saving...' : 'Save Notification Configuration'}
        </Button>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('system');
  const { user, permissions } = useAdminAuth();
  const { systemStats } = useRealTimeData();

  useEffect(() => {
    if (!permissions.canManageSettings) {
      alert('Access denied: You do not have permission to manage settings');
      return;
    }
  }, [permissions]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'system':
        return <SystemConfigurationTab />;
      case 'pricing':
        return <PricingSettingsTab />;
      case 'notifications':
        return <NotificationSettingsTab />;
      case 'security':
        return (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security & Access Settings</h3>
            <p className="text-gray-600">Security settings panel coming soon...</p>
          </Card>
        );
      case 'features':
        return (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Feature Flags</h3>
            <p className="text-gray-600">Feature flags panel coming soon...</p>
          </Card>
        );
      case 'backup':
        return (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Backup & Recovery</h3>
            <p className="text-gray-600">Backup and recovery settings coming soon...</p>
          </Card>
        );
      default:
        return <SystemConfigurationTab />;
    }
  };

  if (!permissions.canManageSettings) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to access system settings.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">
            System Status: {systemStats?.status || 'Unknown'}
          </Badge>
          <Badge variant="outline">
            Last Updated: {new Date().toLocaleDateString()}
          </Badge>
        </div>
      </div>

      <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {renderTabContent()}
    </div>
  );
};

export default Settings;
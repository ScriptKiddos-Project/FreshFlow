import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Clock,
  Shield,
  Bell,
  Globe,
  Database,
  Zap
} from 'lucide-react';

interface SystemConfig {
  general: {
    platformName: string;
    supportEmail: string;
    maintenanceMode: boolean;
    maxVendorsPerDay: number;
    autoApprovalEnabled: boolean;
  }
  pricing: {
    platformFeePercentage: number;
    minimumOrderValue: number;
    dynamicPricingEnabled: boolean;
    priceUpdateInterval: number;
    expiryDiscountPercentage: number;
  };
  notifications: {
    emailNotificationsEnabled: boolean;
    smsNotificationsEnabled: boolean;
    pushNotificationsEnabled: boolean;
    expiryAlertHours: number;
    lowStockThreshold: number;
  };
  security: {
    jwtExpirationMinutes: number;
    maxLoginAttempts: number;
    rateLimitPerMinute: number;
    requireEmailVerification: boolean;
    twoFactorEnabled: boolean;
  };
  features: {
    realTimeUpdatesEnabled: boolean;
    analyticsEnabled: boolean;
    exportFunctionalityEnabled: boolean;
    chatSupportEnabled: boolean;
    mobileAppEnabled: boolean;
  };
}

interface ConfigFormProps {
  config: SystemConfig;
  onSave: (config: SystemConfig) => void;
  onReset: () => void;
  loading?: boolean;
  lastUpdated?: string;
}

const ConfigForm: React.FC<ConfigFormProps> = ({
  config,
  onSave,
  onReset,
  loading = false,
  lastUpdated
}) => {
  const [formData, setFormData] = useState<SystemConfig>(config);
  const [activeSection, setActiveSection] = useState<'general' | 'pricing' | 'notifications' | 'security' | 'features'>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(config));
  }, [formData, config]);

  const handleInputChange = (section: keyof SystemConfig, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleReset = () => {
    onReset();
    setFormData(config);
    setShowResetDialog(false);
  };

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'features', label: 'Features', icon: Zap }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Settings className="h-6 w-6 mr-3" />
              System Configuration
            </h2>
            <p className="text-gray-600 mt-1">
              Manage platform settings and configuration
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Unsaved Changes
              </Badge>
            )}
            <Button
              onClick={() => setShowResetDialog(true)}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !hasChanges}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex gap-6">
        {/* Section Navigation */}
        <Card className="w-64 p-4">
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <section.icon className="h-4 w-4 mr-3" />
                {section.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Configuration Forms */}
        <div className="flex-1">
          {activeSection === 'general' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Name
                  </label>
                  <Input
                    value={formData.general.platformName}
                    onChange={(e) => handleInputChange('general', 'platformName', e.target.value)}
                    placeholder="FreshFlow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Email
                  </label>
                  <Input
                    type="email"
                    value={formData.general.supportEmail}
                    onChange={(e) => handleInputChange('general', 'supportEmail', e.target.value)}
                    placeholder="support@freshflow.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Vendors Per Day
                  </label>
                  <Input
                    type="number"
                    value={formData.general.maxVendorsPerDay}
                    onChange={(e) => handleInputChange('general', 'maxVendorsPerDay', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="maintenanceMode"
                    checked={formData.general.maintenanceMode}
                    onChange={(e) => handleInputChange('general', 'maintenanceMode', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="maintenanceMode" className="text-sm text-gray-700">
                    Enable Maintenance Mode
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="autoApproval"
                    checked={formData.general.autoApprovalEnabled}
                    onChange={(e) => handleInputChange('general', 'autoApprovalEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="autoApproval" className="text-sm text-gray-700">
                    Enable Auto Approval for Vendors
                  </label>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'pricing' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Pricing Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Fee Percentage (%)
                  </label>
                  <Input
                    type="number"
                    value={formData.pricing.platformFeePercentage}
                    onChange={(e) => handleInputChange('pricing', 'platformFeePercentage', parseFloat(e.target.value))}
                    min="0"
                    max="20"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Value (₹)
                  </label>
                  <Input
                    type="number"
                    value={formData.pricing.minimumOrderValue}
                    onChange={(e) => handleInputChange('pricing', 'minimumOrderValue', parseFloat(e.target.value))}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Update Interval (minutes)
                  </label>
                  <Input
                    type="number"
                    value={formData.pricing.priceUpdateInterval}
                    onChange={(e) => handleInputChange('pricing', 'priceUpdateInterval', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Discount Percentage (%)
                  </label>
                  <Input
                    type="number"
                    value={formData.pricing.expiryDiscountPercentage}
                    onChange={(e) => handleInputChange('pricing', 'expiryDiscountPercentage', parseFloat(e.target.value))}
                    min="0"
                    max="80"
                    step="5"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="dynamicPricing"
                    checked={formData.pricing.dynamicPricingEnabled}
                    onChange={(e) => handleInputChange('pricing', 'dynamicPricingEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="dynamicPricing" className="text-sm text-gray-700">
                    Enable Dynamic Pricing
                  </label>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Alert Hours (before expiry)
                  </label>
                  <Input
                    type="number"
                    value={formData.notifications.expiryAlertHours}
                    onChange={(e) => handleInputChange('notifications', 'expiryAlertHours', parseInt(e.target.value))}
                    min="1"
                    max="72"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Low Stock Threshold (%)
                  </label>
                  <Input
                    type="number"
                    value={formData.notifications.lowStockThreshold}
                    onChange={(e) => handleInputChange('notifications', 'lowStockThreshold', parseInt(e.target.value))}
                    min="5"
                    max="50"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={formData.notifications.emailNotificationsEnabled}
                      onChange={(e) => handleInputChange('notifications', 'emailNotificationsEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="emailNotifications" className="text-sm text-gray-700">
                      Enable Email Notifications
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="smsNotifications"
                      checked={formData.notifications.smsNotificationsEnabled}
                      onChange={(e) => handleInputChange('notifications', 'smsNotificationsEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="smsNotifications" className="text-sm text-gray-700">
                      Enable SMS Notifications
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="pushNotifications"
                      checked={formData.notifications.pushNotificationsEnabled}
                      onChange={(e) => handleInputChange('notifications', 'pushNotificationsEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="pushNotifications" className="text-sm text-gray-700">
                      Enable Push Notifications
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JWT Expiration (minutes)
                  </label>
                  <Input
                    type="number"
                    value={formData.security.jwtExpirationMinutes}
                    onChange={(e) => handleInputChange('security', 'jwtExpirationMinutes', parseInt(e.target.value))}
                    min="15"
                    max="1440"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <Input
                    type="number"
                    value={formData.security.maxLoginAttempts}
                    onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    min="3"
                    max="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate Limit (requests per minute)
                  </label>
                  <Input
                    type="number"
                    value={formData.security.rateLimitPerMinute}
                    onChange={(e) => handleInputChange('security', 'rateLimitPerMinute', parseInt(e.target.value))}
                    min="10"
                    max="1000"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="emailVerification"
                      checked={formData.security.requireEmailVerification}
                      onChange={(e) => handleInputChange('security', 'requireEmailVerification', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="emailVerification" className="text-sm text-gray-700">
                      Require Email Verification
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="twoFactor"
                      checked={formData.security.twoFactorEnabled}
                      onChange={(e) => handleInputChange('security', 'twoFactorEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="twoFactor" className="text-sm text-gray-700">
                      Enable Two-Factor Authentication
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'features' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Feature Flags</h3>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="realTimeUpdates"
                      checked={formData.features.realTimeUpdatesEnabled}
                      onChange={(e) => handleInputChange('features', 'realTimeUpdatesEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="realTimeUpdates" className="text-sm text-gray-700">
                      Enable Real-time Updates
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="analytics"
                      checked={formData.features.analyticsEnabled}
                      onChange={(e) => handleInputChange('features', 'analyticsEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="analytics" className="text-sm text-gray-700">
                      Enable Analytics Dashboard
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="exportFunctionality"
                      checked={formData.features.exportFunctionalityEnabled}
                      onChange={(e) => handleInputChange('features', 'exportFunctionalityEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="exportFunctionality" className="text-sm text-gray-700">
                      Enable Data Export
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="chatSupport"
                      checked={formData.features.chatSupportEnabled}
                      onChange={(e) => handleInputChange('features', 'chatSupportEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="chatSupport" className="text-sm text-gray-700">
                      Enable Chat Support
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="mobileApp"
                      checked={formData.features.mobileAppEnabled}
                      onChange={(e) => handleInputChange('features', 'mobileAppEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="mobileApp" className="text-sm text-gray-700">
                      Enable Mobile App Features
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Reset Configuration</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reset all configurations to their default values? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                disabled={loading}
                variant="destructive"
              >
                Reset All
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};


export default ConfigForm;
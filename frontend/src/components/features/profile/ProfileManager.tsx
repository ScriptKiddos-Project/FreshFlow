import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Store, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
import { ProfileInfo } from './ProfileInfo';
import { BusinessSettings } from './BusinessSettings';
import { NotificationSettings } from './NotificationsSettings';
import { SecuritySettings } from './SecuritySettings';
import { ProfileStats } from './ProfileStats';
import { useAuthStore } from '@/store/authStore';

type ProfileTab = 'info' | 'business' | 'notifications' | 'security' | 'stats';

export const ProfileManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const { user } = useAuthStore();

  const tabs = [
    {
      id: 'info' as ProfileTab,
      label: 'Profile Info',
      icon: User,
      description: 'Manage your personal information'
    },
    {
      id: 'business' as ProfileTab,
      label: 'Business Settings',
      icon: Store,
      description: 'Configure your vendor details'
    },
    {
      id: 'stats' as ProfileTab,
      label: 'Statistics',
      icon: BarChart3,
      description: 'View your performance metrics'
    },
    {
      id: 'notifications' as ProfileTab,
      label: 'Notifications',
      icon: Bell,
      description: 'Manage notification preferences'
    },
    {
      id: 'security' as ProfileTab,
      label: 'Security',
      icon: Shield,
      description: 'Password and security settings'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return <ProfileInfo />;
      case 'business':
        return <BusinessSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'stats':
        return <ProfileStats />;
      default:
        return <ProfileInfo />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-medium">{user?.name}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Welcome back, {user?.name}!</h2>
              <p className="text-blue-100">
                Vendor since {new Date(user?.createdAt || Date.now()).getFullYear()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">₹{user?.totalEarnings?.toLocaleString() || '0'}</div>
              <div className="text-blue-100">Total Earnings</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                        : 'text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500">{tab.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};
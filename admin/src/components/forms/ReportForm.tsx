import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { 
  FileText, 
  Download,  
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ReportConfig {
  type: 'sales' | 'vendors' | 'transactions' | 'inventory' | 'analytics' | 'custom';
  title: string;
  dateRange: {
    startDate: string;
    endDate: string;
    preset: 'today' | '7days' | '30days' | '90days' | 'custom';
  };
  filters: {
    vendorIds?: string[];
    categories?: string[];
    locations?: string[];
    minAmount?: number;
    maxAmount?: number;
    status?: string[];
  };
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeDetails: boolean;
  scheduled: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
}

interface ReportFormProps {
  onGenerate: (config: ReportConfig) => void;
  onSchedule: (config: ReportConfig) => void;
  loading?: boolean;
  availableVendors?: { id: string; name: string }[];
  availableCategories?: string[];
  availableLocations?: string[];
}

const ReportForm: React.FC<ReportFormProps> = ({
  onGenerate,
  onSchedule,
  loading = false,
  availableVendors = [],
  availableCategories = [],
}) => {
  const [config, setConfig] = useState<ReportConfig>({
    type: 'sales',
    title: '',
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      preset: '30days'
    },
    filters: {},
    format: 'pdf',
    includeCharts: true,
    includeDetails: true,
    scheduled: false
  });

  const [activeStep, setActiveStep] = useState<'type' | 'filters' | 'format' | 'schedule'>('type');

  const reportTypes = [
    {
      id: 'sales',
      name: 'Sales Report',
      description: 'Revenue, orders, and sales performance',
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      id: 'vendors',
      name: 'Vendor Report',
      description: 'Vendor performance and activity',
      icon: Users,
      color: 'bg-green-50 text-green-600 border-green-200'
    },
    {
      id: 'transactions',
      name: 'Transaction Report',
      description: 'Payment and transaction analysis',
      icon: DollarSign,
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
    {
      id: 'inventory',
      name: 'Inventory Report',
      description: 'Stock levels and ingredient tracking',
      icon: ShoppingCart,
      color: 'bg-orange-50 text-orange-600 border-orange-200'
    },
    {
      id: 'analytics',
      name: 'Analytics Report',
      description: 'Comprehensive business intelligence',
      icon: BarChart3,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200'
    },
    {
      id: 'custom',
      name: 'Custom Report',
      description: 'Build your own custom report',
      icon: PieChart,
      color: 'bg-gray-50 text-gray-600 border-gray-200'
    }
  ];

  const datePresets = [
    { id: 'today', label: 'Today', days: 0 },
    { id: '7days', label: 'Last 7 Days', days: 7 },
    { id: '30days', label: 'Last 30 Days', days: 30 },
    { id: '90days', label: 'Last 90 Days', days: 90 },
    { id: 'custom', label: 'Custom Range', days: null }
  ];

  const handleTypeChange = (type: ReportConfig['type']) => {
    setConfig(prev => ({
      ...prev,
      type,
      title: reportTypes.find(t => t.id === type)?.name || ''
    }));
  };

  const handleDatePresetChange = (preset: ReportConfig['dateRange']['preset']) => {
    const presetData = datePresets.find(p => p.id === preset);
    if (presetData && presetData.days !== null) {
      const endDate = new Date();
      const startDate = new Date(Date.now() - presetData.days * 24 * 60 * 60 * 1000);
      
      setConfig(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange,
          preset,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange,
          preset
        }
      }));
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setConfig(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value,
        preset: 'custom'
      }
    }));
  };

  const handleFilterChange = (filterKey: keyof ReportConfig['filters'], value: any) => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterKey]: value
      }
    }));
  };

  const handleGenerate = () => {
    onGenerate(config);
  };

  const handleSchedule = () => {
    onSchedule(config);
  };

  const steps = [
    { id: 'type', label: 'Report Type', icon: FileText },
    { id: 'filters', label: 'Filters & Date', icon: Filter },
    { id: 'format', label: 'Format & Options', icon: Download },
    { id: 'schedule', label: 'Generate', icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-3" />
              Generate Report
            </h2>
            <p className="text-gray-600 mt-1">
              Create detailed reports and analytics for your business
            </p>
          </div>
        </div>
      </Card>

      {/* Step Navigation */}
      <Card className="p-6">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setActiveStep(step.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeStep === step.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <step.icon className="h-4 w-4 mr-2" />
                {step.label}
              </button>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-300 mx-2"></div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Step Content */}
      <div className="space-y-6">
        {activeStep === 'type' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Select Report Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleTypeChange(type.id as any)}
                  className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                    config.type === type.id
                      ? type.color
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <type.icon className="h-5 w-5 mr-2" />
                    <h4 className="font-semibold">{type.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Report Title (Optional)
              </label>
              <Input
                value={config.title}
                onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter custom report title"
              />
            </div>
          </Card>
        )}

        {activeStep === 'filters' && (
          <div className="space-y-6">
            {/* Date Range */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Date Range</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {datePresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleDatePresetChange(preset.id as any)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      config.dateRange.preset === preset.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={config.dateRange.startDate}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={config.dateRange.endDate}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Filters */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Filters</h3>
              <div className="space-y-4">
                {availableVendors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Vendors (Optional)
                    </label>
                    <select
                      multiple
                      value={config.filters.vendorIds || []}
                      onChange={(e) => handleFilterChange('vendorIds', Array.from(e.target.selectedOptions, option => option.value))}
                      className="w-full p-2 border border-gray-300 rounded-md h-32"
                    >
                      {availableVendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {availableCategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categories (Optional)
                    </label>
                    <select
                      multiple
                      value={config.filters.categories || []}
                      onChange={(e) => handleFilterChange('categories', Array.from(e.target.selectedOptions, option => option.value))}
                      className="w-full p-2 border border-gray-300 rounded-md h-24"
                    >
                      {availableCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Amount (₹)
                    </label>
                    <Input
                      type="number"
                      value={config.filters.minAmount || ''}
                      onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Amount (₹)
                    </label>
                    <Input
                      type="number"
                      value={config.filters.maxAmount || ''}
                      onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="No limit"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeStep === 'format' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Format & Options</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'pdf', name: 'PDF', description: 'Formatted document' },
                    { id: 'excel', name: 'Excel', description: 'Spreadsheet format' },
                    { id: 'csv', name: 'CSV', description: 'Data only' }
                  ].map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setConfig(prev => ({ ...prev, format: format.id as any }))}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        config.format === format.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold">{format.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{format.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeCharts"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="includeCharts" className="text-sm text-gray-700">
                    Include Charts and Visualizations
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeDetails"
                    checked={config.includeDetails}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeDetails: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="includeDetails" className="text-sm text-gray-700">
                    Include Detailed Transaction Data
                  </label>
                </div>
              </div>

              {config.format === 'pdf' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-blue-900">PDF Report Features</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        PDF reports include formatted tables, charts, and professional layout suitable for presentations and sharing.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeStep === 'schedule' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Report Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Report Type:</span>
                  <Badge>{reportTypes.find(t => t.id === config.type)?.name}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date Range:</span>
                  <span className="font-medium">
                    {config.dateRange.startDate} to {config.dateRange.endDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium uppercase">{config.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Charts Included:</span>
                  <span className="font-medium">{config.includeCharts ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Schedule Options</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="scheduled"
                    checked={config.scheduled}
                    onChange={(e) => setConfig(prev => ({ ...prev, scheduled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="scheduled" className="text-sm text-gray-700">
                    Schedule this report to be generated automatically
                  </label>
                </div>

                {config.scheduled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={config.scheduleFrequency || 'weekly'}
                      onChange={(e) => setConfig(prev => ({ ...prev, scheduleFrequency: e.target.value as any }))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Ready to Generate</h3>
                  <p className="text-gray-600 text-sm">
                    Click generate to create your report, or schedule it for automatic generation.
                  </p>
                </div>
                <div className="flex space-x-3">
                  {config.scheduled && (
                    <Button
                      onClick={handleSchedule}
                      disabled={loading}
                      variant="outline"
                      className="flex items-center"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule Report
                    </Button>
                  )}
                  <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Now
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation */}
      <Card className="p-4">
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              const currentIndex = steps.findIndex(s => s.id === activeStep);
              if (currentIndex > 0) {
                setActiveStep(steps[currentIndex - 1].id as any);
              }
            }}
            disabled={activeStep === 'type'}
          >
            Previous
          </Button>
          <Button
            onClick={() => {
              const currentIndex = steps.findIndex(s => s.id === activeStep);
              if (currentIndex < steps.length - 1) {
                setActiveStep(steps[currentIndex + 1].id as any);
              }
            }}
            disabled={activeStep === 'schedule'}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ReportForm;
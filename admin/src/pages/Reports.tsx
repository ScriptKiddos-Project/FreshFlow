import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialoge';
import ReportForm from '../components/forms/ReportForm';
import { useReports } from '../hooks/useReports';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { formatDate } from '../utils/dataProcessing';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  Eye,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Target
} from 'lucide-react';
import { 
  ReportType, 
  ReportRequest,
  ReportJob
} from '../types/reports';

interface ReportFilters {
  status: ReportStatus | 'all';
  type: ReportType | 'all';  
  dateRange: { start: string; end: string };
  createdBy: string;
}

interface Report extends Omit<ReportJob, 'parameters'> {
  description?: string;
  fileSize?: number;
  format?: string;
  parameters?: Record<string, any>; // optional here
  summary?: string;
  createdBy: string;
}


type ReportStatus = 'completed' | 'generating' | 'scheduled' | 'failed';

// Report config interface for ReportForm compatibility
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

const Reports: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const {
    reports,
    isLoading,
    error,
    generateCustomReport,
    deleteReport,
    exportReport,
    refreshReports
  } = useReports();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');

  const [filters, setFilters] = useState<ReportFilters>({
    status: 'all',
    type: 'all',
    dateRange: { start: '', end: '' },
    createdBy: ''
  });

  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: ReportStatus | 'all') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleTypeFilter = (type: ReportType | 'all') => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  // Updated to handle ReportConfig from ReportForm
  const handleGenerateReport = async (config: ReportConfig) => {
    try {
      const request: ReportRequest = {
        type: config.type as ReportType,
        dateRange: {
          startDate: new Date(config.dateRange.startDate),
          endDate: new Date(config.dateRange.endDate)
        },
        parameters: {
          ...config.filters,
          format: config.format,
          includeCharts: config.includeCharts,
          includeDetails: config.includeDetails,
          title: config.title
        },
        userId: 'current-user-id' // Get from auth context
      };
      
      await generateCustomReport(request);
      setShowCreateDialog(false);
      await refreshReports();
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  // Handle schedule from ReportForm
  const handleScheduleReport = async (config: ReportConfig) => {
    try {
      // Implementation for scheduling would go here
      console.log('Scheduling report:', config);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error scheduling report:', error);
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowReportDetails(true);
  };

  const handleDownloadReport = async (report: Report, format: 'pdf' | 'excel' | 'csv') => {
    try {
      await exportReport(report.id, format);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await deleteReport(reportId);
        await refreshReports();
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  const getStatusBadgeVariant = (status: ReportStatus) => {
    switch (status) {
      case 'completed': return 'default';
      case 'generating': return 'secondary';
      case 'scheduled': return 'outline';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'generating': return <Clock className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'financial': return <DollarSign className="h-4 w-4" />;
      case 'sales': return <TrendingUp className="h-4 w-4" />;
      case 'vendor': return <Users className="h-4 w-4" />;
      case 'transaction': return <Package className="h-4 w-4" />;
      case 'waste': return <Target className="h-4 w-4" />;
      case 'operational': return <BarChart3 className="h-4 w-4" />;
      case 'custom': return <BarChart3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const reportTypeOptions = [
    { value: 'financial', label: 'Financial Report', icon: DollarSign },
    { value: 'sales', label: 'Sales Report', icon: TrendingUp },
    { value: 'vendor', label: 'Vendor Report', icon: Users },
    { value: 'transaction', label: 'Transaction Report', icon: Package },
    { value: 'waste', label: 'Waste Reduction', icon: Target },
    { value: 'operational', label: 'Operational Report', icon: BarChart3 }
  ];

  // Filter reports based on current filters
  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || report.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesType = typeFilter === 'all' || report.templateId?.includes(typeFilter);
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination
  const totalReports = filteredReports.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + pageSize);

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Generate and manage business intelligence reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-sm">
            <FileText className="h-4 w-4 mr-1" />
            {totalReports} Total Reports
          </Badge>
          {hasPermission('create:reports') && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Generate Report</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {reportTypeOptions.map((option) => (
          <Card 
            key={option.value}
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setTypeFilter(option.value as ReportType);
              setShowCreateDialog(true);
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <option.icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-500">Quick generate</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search reports by name or type..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value as ReportStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="generating">Generating</option>
              <option value="scheduled">Scheduled</option>
              <option value="failed">Failed</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilter(e.target.value as ReportType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {reportTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created From
                </label>
                <Input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters({
                    ...filters, 
                    dateRange: {...filters.dateRange, start: e.target.value}
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created To
                </label>
                <Input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters({
                    ...filters, 
                    dateRange: {...filters.dateRange, end: e.target.value}
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created By
                </label>
                <Input
                  placeholder="Filter by creator"
                  value={filters.createdBy}
                  onChange={(e) => setFilters({...filters, createdBy: e.target.value})}
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-3">
              <Button
                onClick={() => {
                  setCurrentPage(1);
                  // Apply filters logic here
                }}
                size="sm"
              >
                Apply Filters
              </Button>
              <Button
                onClick={() => {
                  setFilters({
                    status: 'all',
                    type: 'all',
                    dateRange: { start: '', end: '' },
                    createdBy: ''
                  });
                  setCurrentPage(1);
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Reports List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Generated Reports</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalReports)} of {totalReports}
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          {getTypeIcon(report.templateId as ReportType)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {report.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className="flex items-center space-x-1">
                      {getTypeIcon(report.templateId as ReportType)}
                      <span>{report.templateId?.replace('_', ' ') || 'Custom'}</span>
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={getStatusBadgeVariant(report.status as ReportStatus)}
                      className="flex items-center space-x-1"
                    >
                      {getStatusIcon(report.status as ReportStatus)}
                      <span>{report.status}</span>
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{formatDate(report.createdAt.toISOString())}</div>
                      <div className="text-xs text-gray-500">by {(report as Report).createdBy}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(report as Report).fileSize ? `${((report as Report).fileSize! / 1024 / 1024).toFixed(2)} MB` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {report.status === 'completed' && (
                        <>
                          <Button
                            onClick={() => handleViewReport(report as Report)}
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </Button>
                          <div className="relative group">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center space-x-1"
                            >
                              <Download className="h-3 w-3" />
                              <span>Download</span>
                            </Button>
                            <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                              <button
                                onClick={() => handleDownloadReport(report as Report, 'pdf')}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                PDF
                              </button>
                              <button
                                onClick={() => handleDownloadReport(report as Report, 'excel')}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                Excel
                              </button>
                              <button
                                onClick={() => handleDownloadReport(report as Report, 'csv')}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                              >
                                CSV
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      {hasPermission('delete:reports') && (
                        <Button
                          onClick={() => handleDeleteReport(report.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isLoading}
            variant="outline"
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, Math.ceil(totalReports / pageSize)) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <Button
            onClick={() => setCurrentPage(Math.min(Math.ceil(totalReports / pageSize), currentPage + 1))}
            disabled={currentPage >= Math.ceil(totalReports / pageSize) || isLoading}
            variant="outline"
          >
            Next
          </Button>
        </div>
      </Card>

      {/* Create Report Dialog */}
      {showCreateDialog && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Generate New Report</h2>
              </div>
              
              <div className="p-6">
                <ReportForm
                  onGenerate={handleGenerateReport}
                  onSchedule={handleScheduleReport}
                  loading={isLoading}
                  availableVendors={[]}
                  availableCategories={[]}
                />
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Report Details Dialog */}
      {showReportDetails && selectedReport && (
        <Dialog open={showReportDetails} onOpenChange={setShowReportDetails}>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedReport.name}
                  </h2>
                  <Badge 
                    variant={getStatusBadgeVariant(selectedReport.status as ReportStatus)}
                    className="flex items-center space-x-1"
                  >
                    {getStatusIcon(selectedReport.status as ReportStatus)}
                    <span>{selectedReport.status}</span>
                  </Badge>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Report Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedReport.templateId?.replace('_', ' ') || 'Custom'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="text-sm font-medium">{formatDate(selectedReport.createdAt.toISOString())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Created By:</span>
                        <span className="text-sm font-medium">{selectedReport.createdBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">File Size:</span>
                        <span className="text-sm font-medium">
                          {selectedReport.fileSize ? `${(selectedReport.fileSize / 1024 / 1024).toFixed(2)} MB` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Format:</span>
                        <span className="text-sm font-medium">{selectedReport.format || 'PDF'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Parameters</h3>
                    <div className="space-y-3">
                      {selectedReport.parameters && Object.entries(selectedReport.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm text-gray-600">{key.replace('_', ' ')}:</span>
                          <span className="text-sm font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {selectedReport.description && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-600">{selectedReport.description}</p>
                  </div>
                )}

                {selectedReport.summary && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Summary</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{selectedReport.summary}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-between">
                <div className="space-x-3">
                  {selectedReport.status === 'completed' && (
                    <>
                      <Button
                        onClick={() => handleDownloadReport(selectedReport, 'pdf')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Download PDF
                      </Button>
                      <Button
                        onClick={() => handleDownloadReport(selectedReport, 'excel')}
                        variant="outline"
                      >
                        Download Excel
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  onClick={() => setShowReportDetails(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
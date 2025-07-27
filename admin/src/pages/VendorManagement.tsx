import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import VendorTable from '../components/tables/VendorTable';
import VendorApprovalForm from '../components/forms/VendorApprovalForm';
import { 
  useVendorStore, 
  useVendorList, 
  useVendorStats, 
  useVendorActions,
  useVendorFilters,
  useVendorPagination 
} from '../store/vendorStore';
import type { VendorStatus, VendorFilters as AdminVendorFilters, Vendor } from '../types/admin';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { formatCurrency, formatDate } from '../utils/dataProcessing';
import { 
  Search, 
  Filter, 
  Download,  
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Users
} from 'lucide-react';

// Types based on admin.ts
// type AdminPermission = 'manage:vendors' | 'export:vendors' | 'view:vendors';

interface VendorFilters {
  status: VendorStatus | 'all';
  location: string;
  revenueRange: { min: number; max: number };
  joinDateRange: { start: string; end: string };
  businessType: string;
}

const VendorManagement: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  
  // Use the store selectors
  const { vendors, loading, error, totalVendors, loadVendors } = useVendorList();
  const { stats, loadVendorStats } = useVendorStats();
  const { approveVendor, rejectVendor, suspendVendor, activateVendor } = useVendorActions();
  const { filters, searchQuery, sortBy, sortOrder, setFilters, setSearchQuery, setSorting } = useVendorFilters();
  const { currentPage, pageSize, totalPages, setPage, setPageSize } = useVendorPagination();
  
  // Get the full store for some operations
  const { selectedVendor, loadVendorById, exportVendors } = useVendorStore();

  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [localFilters, setLocalFilters] = useState<VendorFilters>({
    status: 'all',
    location: '',
    revenueRange: { min: 0, max: 0 },
    joinDateRange: { start: '', end: '' },
    businessType: ''
  });

  const transformedVendors: Vendor[] = (vendors || []).map(vendor => ({
    id: vendor.id,
    businessName: vendor.businessName,
    ownerName: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    location: `${vendor.address?.city || ''}, ${vendor.address?.state || ''}`,
    status: vendor.status,
    joinDate: vendor.joinedAt,
    totalRevenue: vendor.financialInfo?.totalRevenue || 0,
    totalOrders: vendor.financialInfo?.totalTransactions || 0,
    successRate: vendor.financialInfo?.completionRate || 0,
    averageRating: vendor.financialInfo?.averageRating || 0,
    documents: vendor.documents ? Object.entries(vendor.documents).map(([type, url]) => ({ type, url: url || '' })) : []
  }));

  // Get pending vendors from the vendors list
  const pendingVendors = (vendors || []).filter(vendor => vendor.status === 'pending');

  useEffect(() => {
    loadVendors();
    loadVendorStats();
  }, [currentPage, pageSize, searchQuery, filters, sortBy, sortOrder]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleStatusFilter = (status: VendorStatus | 'all') => {
    setStatusFilter(status);
    if (status === 'all') {
      setFilters({});
    } else {
      setFilters({ status: [status] });
    }
  };

  const handleSort = (field: 'name' | 'revenue' | 'joinDate' | 'status') => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSorting(field, newOrder);
  };

  const handleApproveVendor = async (vendorId: string, notes?: string) => {
    try {
      setApprovalLoading(true);
      await approveVendor(vendorId, notes);
      await loadVendors();
      await loadVendorStats();
    } catch (error) {
      console.error('Error approving vendor:', error);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectVendor = async (vendorId: string, reason: string) => {
    try {
      setApprovalLoading(true);
      await rejectVendor(vendorId, reason);
      await loadVendors();
      await loadVendorStats();
    } catch (error) {
      console.error('Error rejecting vendor:', error);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRequestMoreInfo = async (vendorId: string, message: string) => {
    try {
      // This functionality would need to be implemented in the store
      console.log('Request more info:', vendorId, message);
      // For now, just show a success message
      alert('Information request sent to vendor');
    } catch (error) {
      console.error('Error requesting more info:', error);
    }
  };

  const handleVendorAction = async (action: 'suspend' | 'activate', vendorId: string) => {
    try {
      if (action === 'suspend') {
        await suspendVendor(vendorId, 'Administrative action');
      } else {
        await activateVendor(vendorId);
      }
      await loadVendors();
      await loadVendorStats();
    } catch (error) {
      console.error(`Error ${action} vendor:`, error);
    }
  };

  const handleViewVendor = async (vendor: any) => {
    await loadVendorById(vendor.id);
    setShowVendorDetails(true);
  };

  const handleExportVendors = async () => {
    try {
      await exportVendors('csv');
    } catch (error) {
      console.error('Error exporting vendors:', error);
    }
  };

  const handleApplyFilters = () => {
    const filterParams: any = {};
    
    if (localFilters.status !== 'all') {
      filterParams.status = [localFilters.status];
    }
    if (localFilters.location) {
      filterParams.city = [localFilters.location];
    }
    if (localFilters.businessType) {
      filterParams.category = [localFilters.businessType];
    }
    if (localFilters.joinDateRange.start) {
      filterParams.joinedAfter = localFilters.joinDateRange.start;
    }
    if (localFilters.joinDateRange.end) {
      filterParams.joinedBefore = localFilters.joinDateRange.end;
    }

    setFilters(filterParams);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      status: 'all' as const,
      location: '',
      revenueRange: { min: 0, max: 0 },
      joinDateRange: { start: '', end: '' },
      businessType: ''
    };
    setLocalFilters(emptyFilters);
    setFilters({});
    setStatusFilter('all');
  };

  const getStatusBadgeVariant = (status: VendorStatus) => {
    switch (status) {
      case 'active': 
      case 'approved': 
        return 'default';
      case 'pending': 
        return 'secondary';
      case 'suspended': 
      case 'rejected': 
        return 'destructive';
      default: 
        return 'secondary';
    }
  };

  const getStatusIcon = (status: VendorStatus) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'suspended':
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading && vendors.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600 mt-1">Manage vendor applications and monitor performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-sm">
            <Users className="h-4 w-4 mr-1" />
            {totalVendors} Total Vendors
          </Badge>
          {hasPermission('export_vendors') && ( 
            <Button
              onClick={handleExportVendors}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingVendors.length > 0 && hasPermission('manage_vendors') && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Pending Vendor Approvals
                </h3>
                <p className="text-sm text-yellow-700">
                  {pendingVendors.length} vendor{pendingVendors.length > 1 ? 's' : ''} waiting for approval
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowApprovalDialog(true)}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Review Applications
            </Button>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vendors by name, email, or location..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value as VendorStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <Input
                  placeholder="Filter by location"
                  value={localFilters.location}
                  onChange={(e) => setLocalFilters({...localFilters, location: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type
                </label>
                <select
                  value={localFilters.businessType}
                  onChange={(e) => setLocalFilters({...localFilters, businessType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="street_food">Street Food</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="supplier">Supplier</option>
                  <option value="wholesaler">Wholesaler</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Join Date From
                </label>
                <Input
                  type="date"
                  value={localFilters.joinDateRange.start}
                  onChange={(e) => setLocalFilters({
                    ...localFilters, 
                    joinDateRange: {...localFilters.joinDateRange, start: e.target.value}
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Join Date To
                </label>
                <Input
                  type="date"
                  value={localFilters.joinDateRange.end}
                  onChange={(e) => setLocalFilters({
                    ...localFilters, 
                    joinDateRange: {...localFilters.joinDateRange, end: e.target.value}
                  })}
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-3">
              <Button
                onClick={handleApplyFilters}
                size="sm"
              >
                Apply Filters
              </Button>
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Vendor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Vendors</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.active || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats?.pending || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspended</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.suspended || 0}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vendors</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats?.total || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Vendor Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Vendor List</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalVendors)} of {totalVendors}
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

        <VendorTable
          data={transformedVendors}
          loading={loading}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onViewVendor={handleViewVendor}
          onVendorAction={handleVendorAction}
          hasManagePermission={hasPermission('manage_vendors')}
        />

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            variant="outline"
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => setPage(page)}
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
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || loading}
            variant="outline"
          >
            Next
          </Button>
        </div>
      </Card>

      {/* Vendor Approval Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Vendor Approvals ({pendingVendors.length})
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {pendingVendors.map(vendor => {
                const vendorData = {
                  id: vendor.id,
                  name: vendor.name,
                  email: vendor.email,
                  phone: vendor.phone,
                  businessName: vendor.businessName,
                  address: vendor.address?.street || '',
                  city: vendor.address?.city || '',
                  state: vendor.address?.state || '',
                  pincode: vendor.address?.pincode || '',
                  gstNumber: (vendor as any).businessInfo?.gstNumber,
                  fssaiLicense: (vendor as any).businessInfo?.fssaiLicense,
                  documents: vendor.documents ? Object.entries(vendor.documents).map(([type, url]) => ({
                    id: `${vendor.id}-${type}`,
                    type: type as 'aadhar' | 'pan' | 'gst' | 'fssai' | 'shop_license',
                    name: type.charAt(0).toUpperCase() + type.slice(1),
                    url: url || '',
                    verified: false
                  })) : [],
                  businessPhotos: (vendor as any).businessPhotos || [],
                  appliedAt: vendor.joinedAt,
                  status: vendor.status as 'pending' | 'approved' | 'rejected',
                  verificationNotes: (vendor as any).verificationNotes
                };

                return (
                  <VendorApprovalForm
                    key={vendor.id}
                    vendor={vendorData}
                    onApprove={(vendorId, notes) => handleApproveVendor(vendorId, notes)}
                    onReject={(vendorId, reason) => handleRejectVendor(vendorId, reason)}
                    onRequestMoreInfo={(vendorId, message) => handleRequestMoreInfo(vendorId, message)}
                    loading={approvalLoading}
                  />
                );
              })}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button
                onClick={() => setShowApprovalDialog(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Details Dialog */}
      {showVendorDetails && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedVendor.businessName}
                </h2>
                <Badge 
                  variant={getStatusBadgeVariant(selectedVendor.status)}
                  className="flex items-center space-x-1"
                >
                  {getStatusIcon(selectedVendor.status)}
                  <span>{selectedVendor.status}</span>
                </Badge>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Owner:</span>
                      <span className="text-sm font-medium">{selectedVendor.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-medium">{selectedVendor.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm font-medium">{selectedVendor.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="text-sm font-medium">
                        {selectedVendor.address?.city || ''}, {selectedVendor.address?.state || ''}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Joined:</span>
                      <span className="text-sm font-medium">{formatDate(selectedVendor.joinedAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Revenue:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(selectedVendor.financialInfo?.totalRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Transactions:</span>
                      <span className="text-sm font-medium">
                        {selectedVendor.financialInfo?.totalTransactions || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completion Rate:</span>
                      <span className="text-sm font-medium">
                        {selectedVendor.financialInfo?.completionRate || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Rating:</span>
                      <span className="text-sm font-medium">
                        {selectedVendor.financialInfo?.averageRating || 0}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <div className="space-x-3">
                {hasPermission('manage_vendors') && selectedVendor.status === 'active' && (
                  <Button
                    onClick={() => handleVendorAction('suspend', selectedVendor.id)}
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Suspend Vendor
                  </Button>
                )}
                {hasPermission('manage_vendors') && selectedVendor.status === 'suspended' && (
                  <Button
                    onClick={() => handleVendorAction('activate', selectedVendor.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Activate Vendor
                  </Button>
                )}
              </div>
              <Button
                onClick={() => setShowVendorDetails(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
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

export default VendorManagement;
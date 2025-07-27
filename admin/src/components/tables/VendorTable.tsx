import React from 'react';
import { Eye, Ban, CheckCircle, XCircle, Phone, Mail, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { Vendor, VendorStatus } from '../../types/admin';

interface VendorTableProps {
  data: Vendor[];
  loading: boolean;
  onSort: (field: 'name' | 'revenue' | 'joinDate' | 'status') => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onViewVendor: (vendor: Vendor) => void;
  onVendorAction: (action: 'suspend' | 'activate', vendorId: string) => void;
  hasManagePermission: boolean;
  className?: string;
}

const VendorTable: React.FC<VendorTableProps> = ({
  data,
  loading,
  onSort,
  sortBy,
  sortOrder,
  onViewVendor,
  onVendorAction,
  hasManagePermission,
  className = ''
}) => {
  const getStatusBadge = (status: VendorStatus) => {
    const config = {
      active: {
        className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      },
      pending: {
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      suspended: {
        className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
        icon: <Ban className="h-3 w-3 mr-1" />
      },
      rejected: {
        className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
        icon: <XCircle className="h-3 w-3 mr-1" />
      }
    };

    const statusConfig = config[status as keyof typeof config];
    return (
      <Badge className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
        {statusConfig.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRatingStars = (rating: number = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">☆</span>);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">☆</span>);
    }

    return (
      <div className="flex items-center gap-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-500 ml-1">({rating})</span>
      </div>
    );
  };

  const handleSort = (field: 'name' | 'revenue' | 'joinDate' | 'status') => {
    onSort(field);
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
        <p className="text-gray-500">No vendors match your current filters.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => handleSort('name')}
            >
              Business {getSortIcon('name')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Location
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => handleSort('status')}
            >
              Status {getSortIcon('status')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Rating
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Orders
            </th>
            <th 
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => handleSort('revenue')}
            >
              Revenue {getSortIcon('revenue')}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => handleSort('joinDate')}
            >
              Join Date {getSortIcon('joinDate')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((vendor) => (
            <tr 
              key={vendor.id} 
              className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => onViewVendor(vendor)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {vendor.businessName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {vendor.ownerName}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {vendor.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {vendor.phone}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {vendor.location}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(vendor.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {getRatingStars(vendor.averageRating)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className="font-medium">
                  {vendor.totalOrders || 0}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className="font-medium">
                  ₹{(vendor.totalRevenue || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {new Date(vendor.joinDate).toLocaleDateString()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewVendor(vendor)}
                    className="p-1"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {hasManagePermission && (
                    <>
                      {vendor.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onVendorAction('suspend', vendor.id)}
                          className="p-1 text-red-600 border-red-600 hover:bg-red-50"
                          title="Suspend Vendor"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {vendor.status === 'suspended' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onVendorAction('activate', vendor.id)}
                          className="p-1 text-green-600 border-green-600 hover:bg-green-50"
                          title="Activate Vendor"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VendorTable;
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  documents: {
    gstNumber?: string;
    fssaiLicense?: string;
    businessLicense?: string;
    idProof: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active';
  verificationStatus: {
    documents: 'pending' | 'verified' | 'rejected';
    business: 'pending' | 'verified' | 'rejected';
    bank: 'pending' | 'verified' | 'rejected';
  };
  businessDetails: {
    category: string;
    description: string;
    operatingHours: {
      open: string;
      close: string;
      days: string[];
    };
    capacity: number;
    specializations: string[];
  };
  financialInfo: {
    bankAccount: {
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      accountHolder: string;
    };
    totalTransactions: number;
    totalRevenue: number;
    averageRating: number;
    completionRate: number;
  };
  joinedAt: string;
  lastActive: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  notes: string[];
}

interface VendorFilter {
  status?: string[];
  verificationStatus?: string[];
  city?: string[];
  category?: string[];
  rating?: [number, number];
  joinedAfter?: string;
  joinedBefore?: string;
}

interface VendorState {
  // Data state
  vendors: Vendor[];
  totalVendors: number;
  loading: boolean;
  error: string | null;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  
  // Filtering and sorting
  filters: VendorFilter;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  searchQuery: string;
  
  // Selection
  selectedVendors: string[];
  bulkActionLoading: boolean;
  
  // Individual vendor details
  selectedVendor: Vendor | null;
  vendorLoading: boolean;
  
  // Statistics
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
    active: number;
  };
  statsLoading: boolean;

  // Actions
  loadVendors: () => Promise<void>;
  loadVendorStats: () => Promise<void>;
  loadVendorById: (id: string) => Promise<void>;
  
  // CRUD operations
  approveVendor: (id: string, notes?: string) => Promise<void>;
  rejectVendor: (id: string, reason: string) => Promise<void>;
  suspendVendor: (id: string, reason: string) => Promise<void>;
  activateVendor: (id: string) => Promise<void>;
  updateVendor: (id: string, data: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  
  // Bulk operations
  bulkApproveVendors: (ids: string[]) => Promise<void>;
  bulkRejectVendors: (ids: string[], reason: string) => Promise<void>;
  bulkSuspendVendors: (ids: string[], reason: string) => Promise<void>;
  
  // Filter and search actions
  setFilters: (filters: Partial<VendorFilter>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  
  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // Selection actions
  selectVendor: (id: string) => void;
  selectMultipleVendors: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Export actions
  exportVendors: (format: 'csv' | 'excel') => Promise<void>;
  
  // Real-time updates
  updateVendorActivity: (activity: any) => void;
}

export const useVendorStore = create<VendorState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    vendors: [],
    totalVendors: 0,
    loading: false,
    error: null,
    currentPage: 1,
    pageSize: 20,
    totalPages: 0,
    filters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc',
    searchQuery: '',
    selectedVendors: [],
    bulkActionLoading: false,
    selectedVendor: null,
    vendorLoading: false,
    stats: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
      active: 0,
    },
    statsLoading: false,

    // Load vendors with filters and pagination
    loadVendors: async () => {
      set({ loading: true, error: null });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const { currentPage, pageSize, filters, sortBy, sortOrder, searchQuery } = get();
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          sortBy,
          sortOrder,
          ...(searchQuery && { search: searchQuery }),
          ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) })
        });

        const response = await fetch(`/api/admin/vendors?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load vendors');
        }

        const data = await response.json();
        set({ 
          vendors: data.vendors,
          totalVendors: data.total,
          totalPages: data.totalPages,
          loading: false 
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load vendors';
        set({ loading: false, error: message });
      }
    },

    // Load vendor statistics
    loadVendorStats: async () => {
      set({ statsLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/vendors/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load vendor stats');
        }

        const stats = await response.json();
        set({ stats, statsLoading: false });

      } catch (error) {
        set({ statsLoading: false });
        console.error('Failed to load vendor stats:', error);
      }
    },

    // Load individual vendor details
    loadVendorById: async (id: string) => {
      set({ vendorLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/vendors/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load vendor details');
        }

        const vendor = await response.json();
        set({ selectedVendor: vendor, vendorLoading: false });

      } catch (error) {
        set({ vendorLoading: false });
        console.error('Failed to load vendor details:', error);
      }
    },

    // Approve vendor
    approveVendor: async (id: string, notes?: string) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/vendors/${id}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ notes }),
        });

        if (!response.ok) {
          throw new Error('Failed to approve vendor');
        }

        // Update vendor in the list
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            vendor.id === id 
              ? { ...vendor, status: 'approved', approvedAt: new Date().toISOString() }
              : vendor
          )
        }));

        // Refresh stats
        get().loadVendorStats();

      } catch (error) {
        console.error('Failed to approve vendor:', error);
        throw error;
      }
    },

    // Reject vendor
    rejectVendor: async (id: string, reason: string) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/vendors/${id}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) {
          throw new Error('Failed to reject vendor');
        }

        // Update vendor in the list
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            vendor.id === id 
              ? { ...vendor, status: 'rejected', rejectionReason: reason }
              : vendor
          )
        }));

        // Refresh stats
        get().loadVendorStats();

      } catch (error) {
        console.error('Failed to reject vendor:', error);
        throw error;
      }
    },

    // Suspend vendor
    suspendVendor: async (id: string, reason: string) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/vendors/${id}/suspend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) {
          throw new Error('Failed to suspend vendor');
        }

        // Update vendor in the list
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            vendor.id === id 
              ? { ...vendor, status: 'suspended' }
              : vendor
          )
        }));

        // Refresh stats
        get().loadVendorStats();

      } catch (error) {
        console.error('Failed to suspend vendor:', error);
        throw error;
      }
    },

    // Activate vendor
    activateVendor: async (id: string) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/vendors/${id}/activate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to activate vendor');
        }

        // Update vendor in the list
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            vendor.id === id 
              ? { ...vendor, status: 'active' }
              : vendor
          )
        }));

        // Refresh stats
        get().loadVendorStats();

      } catch (error) {
        console.error('Failed to activate vendor:', error);
        throw error;
      }
    },

    // Update vendor
    updateVendor: async (id: string, data: Partial<Vendor>) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/vendors/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update vendor');
        }

        const updatedVendor = await response.json();

        // Update vendor in the list
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            vendor.id === id ? updatedVendor : vendor
          ),
          selectedVendor: state.selectedVendor?.id === id ? updatedVendor : state.selectedVendor
        }));

      } catch (error) {
        console.error('Failed to update vendor:', error);
        throw error;
      }
    },

    // Delete vendor
    deleteVendor: async (id: string) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/vendors/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete vendor');
        }

        // Remove vendor from the list
        set((state) => ({
          vendors: state.vendors.filter(vendor => vendor.id !== id),
          totalVendors: state.totalVendors - 1,
          selectedVendor: state.selectedVendor?.id === id ? null : state.selectedVendor
        }));

        // Refresh stats
        get().loadVendorStats();

      } catch (error) {
        console.error('Failed to delete vendor:', error);
        throw error;
      }
    },

    // Bulk approve vendors
    bulkApproveVendors: async (ids: string[]) => {
      set({ bulkActionLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/vendors/bulk/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ vendorIds: ids }),
        });

        if (!response.ok) {
          throw new Error('Failed to bulk approve vendors');
        }

        // Update vendors in the list
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            ids.includes(vendor.id) 
              ? { ...vendor, status: 'approved', approvedAt: new Date().toISOString() }
              : vendor
          ),
          selectedVendors: [],
          bulkActionLoading: false
        }));

        // Refresh stats
        get().loadVendorStats();

      } catch (error) {
        set({ bulkActionLoading: false });
        console.error('Failed to bulk approve vendors:', error);
        throw error;
      }
    },

    // Bulk reject vendors
    bulkRejectVendors: async (ids: string[], reason: string) => {
      set({ bulkActionLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/vendors/bulk/reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ vendorIds: ids, reason }),
        });

        if (!response.ok) {
          throw new Error('Failed to bulk reject vendors');
        }

        // Update vendors in the list
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            ids.includes(vendor.id) 
              ? { ...vendor, status: 'rejected', rejectionReason: reason }
              : vendor
          ),
          selectedVendors: [],
          bulkActionLoading: false
        }));

        // Refresh stats
        get().loadVendorStats();

      } catch (error) {
        set({ bulkActionLoading: false });
        console.error('Failed to bulk reject vendors:', error);
        throw error;
      }
    },

    // Bulk suspend vendors
    bulkSuspendVendors: async (ids: string[], reason: string) => {
      set({ bulkActionLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/vendors/bulk/suspend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ vendorIds: ids, reason }),
        });

        if (!response.ok) {
          throw new Error('Failed to bulk suspend vendors');
        }

        // Update vendors in the list
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            ids.includes(vendor.id) 
              ? { ...vendor, status: 'suspended' }
              : vendor
          ),
          selectedVendors: [],
          bulkActionLoading: false
        }));

        // Refresh stats
        get().loadVendorStats();

      } catch (error) {
        set({ bulkActionLoading: false });
        console.error('Failed to bulk suspend vendors:', error);
        throw error;
      }
    },

    // Filter and search actions
    setFilters: (filters) => {
      set((state) => ({
        filters: { ...state.filters, ...filters },
        currentPage: 1 // Reset to first page when filters change
      }));
      get().loadVendors();
    },

    clearFilters: () => {
      set({ filters: {}, currentPage: 1 });
      get().loadVendors();
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query, currentPage: 1 });
      // Debounce the search
      const timeoutId = setTimeout(() => {
        get().loadVendors();
      }, 300);
      
      // Clear previous timeout
      const prevTimeoutId = (get() as any).searchTimeoutId;
      if (prevTimeoutId) {
        clearTimeout(prevTimeoutId);
      }
      (get() as any).searchTimeoutId = timeoutId;
    },

    setSorting: (sortBy, sortOrder) => {
      set({ sortBy, sortOrder });
      get().loadVendors();
    },

    // Pagination actions
    setPage: (page) => {
      set({ currentPage: page });
      get().loadVendors();
    },

    setPageSize: (size) => {
      set({ pageSize: size, currentPage: 1 });
      get().loadVendors();
    },

    // Selection actions
    selectVendor: (id) => {
      set((state) => ({
        selectedVendors: state.selectedVendors.includes(id)
          ? state.selectedVendors.filter(vendorId => vendorId !== id)
          : [...state.selectedVendors, id]
      }));
    },

    selectMultipleVendors: (ids) => {
      set({ selectedVendors: ids });
    },

    clearSelection: () => {
      set({ selectedVendors: [] });
    },

    selectAll: () => {
      const { vendors } = get();
      set({ selectedVendors: vendors.map(vendor => vendor.id) });
    },

    // Export vendors
    exportVendors: async (format) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const { filters, searchQuery } = get();
        const queryParams = new URLSearchParams({
          format,
          ...(searchQuery && { search: searchQuery }),
          ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) })
        });

        const response = await fetch(`/api/admin/vendors/export?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to export vendors');
        }

        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendors-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

      } catch (error) {
        console.error('Failed to export vendors:', error);
        throw error;
      }
    },

    // Real-time updates
    updateVendorActivity: (activity) => {
      // Update vendor activity in real-time
      // For example, update lastActive timestamp if the activity is for a specific vendor
      if (activity.vendorId) {
        set((state) => ({
          vendors: state.vendors.map(vendor =>
            vendor.id === activity.vendorId 
              ? { ...vendor, lastActive: new Date().toISOString() }
              : vendor
          )
        }));
      }
    },
  }))
);

// Selectors for optimized component subscriptions
export const useVendorList = () => useVendorStore((state) => ({
  vendors: state.vendors,
  loading: state.loading,
  error: state.error,
  totalVendors: state.totalVendors,
  loadVendors: state.loadVendors,
}));

export const useVendorPagination = () => useVendorStore((state) => ({
  currentPage: state.currentPage,
  pageSize: state.pageSize,
  totalPages: state.totalPages,
  setPage: state.setPage,
  setPageSize: state.setPageSize,
}));

export const useVendorFilters = () => useVendorStore((state) => ({
  filters: state.filters,
  searchQuery: state.searchQuery,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  setFilters: state.setFilters,
  clearFilters: state.clearFilters,
  setSearchQuery: state.setSearchQuery,
  setSorting: state.setSorting,
}));

export const useVendorSelection = () => useVendorStore((state) => ({
  selectedVendors: state.selectedVendors,
  bulkActionLoading: state.bulkActionLoading,
  selectVendor: state.selectVendor,
  selectMultipleVendors: state.selectMultipleVendors,
  clearSelection: state.clearSelection,
  selectAll: state.selectAll,
  bulkApproveVendors: state.bulkApproveVendors,
  bulkRejectVendors: state.bulkRejectVendors,
  bulkSuspendVendors: state.bulkSuspendVendors,
}));

export const useVendorActions = () => useVendorStore((state) => ({
  approveVendor: state.approveVendor,
  rejectVendor: state.rejectVendor,
  suspendVendor: state.suspendVendor,
  activateVendor: state.activateVendor,
  updateVendor: state.updateVendor,
  deleteVendor: state.deleteVendor,
}));

export const useVendorStats = () => useVendorStore((state) => ({
  stats: state.stats,
  loading: state.statsLoading,
  loadVendorStats: state.loadVendorStats,
}));

export const useVendorDetails = () => useVendorStore((state) => ({
  selectedVendor: state.selectedVendor,
  loading: state.vendorLoading,
  loadVendorById: state.loadVendorById,
}));
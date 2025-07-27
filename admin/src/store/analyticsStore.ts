import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  AnalyticsData, 
  DateRange, 
  MetricCard, 
  ChartData,
  AnalyticsFilter,
  ComparisonData 
} from '../types/analytics';

interface AnalyticsState {
  // Data state
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Filter state
  dateRange: DateRange;
  filters: AnalyticsFilter[];
  compareWith: DateRange | null;
  
  // Real-time state
  realTimeEnabled: boolean;
  autoRefreshInterval: number;
  
  // Chart state
  chartData: Record<string, ChartData>;
  chartLoading: Record<string, boolean>;
  
  // Metrics state
  metrics: MetricCard[];
  metricsLoading: boolean;
  
  // Comparison state
  comparisonData: ComparisonData | null;
  comparisonLoading: boolean;

  // Actions
  loadAnalytics: () => Promise<void>;
  loadMetrics: () => Promise<void>;
  loadChartData: (chartId: string) => Promise<void>;
  loadComparison: () => Promise<void>;
  
  // Filter actions
  setDateRange: (range: DateRange) => void;
  addFilter: (filter: AnalyticsFilter) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  setCompareWith: (range: DateRange | null) => void;
  
  // Real-time actions
  enableRealTime: () => void;
  disableRealTime: () => void;
  setAutoRefreshInterval: (interval: number) => void;
  refreshData: () => Promise<void>;
  
  // Export actions
  exportData: (format: 'csv' | 'excel' | 'pdf') => Promise<void>;

  // Additional utility actions
  updateMetrics: (metrics: MetricCard[]) => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      period: 'last30days'
    },
    filters: [],
    compareWith: null,
    realTimeEnabled: false,
    autoRefreshInterval: 60000,
    chartData: {},
    chartLoading: {},
    metrics: [],
    metricsLoading: false,
    comparisonData: null,
    comparisonLoading: false,

    // Load main analytics data
    loadAnalytics: async () => {
      set({ loading: true, error: null });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const { dateRange, filters } = get();
        const queryParams = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          filters: JSON.stringify(filters.map(f => ({ [f.key]: f.value })))
        });

        const response = await fetch(`/api/admin/analytics?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load analytics data');
        }

        const data = await response.json();
        set({ 
          data, 
          loading: false, 
          lastUpdated: new Date().toISOString() 
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load analytics';
        set({ 
          loading: false, 
          error: message 
        });
      }
    },

    // Load metrics cards
    loadMetrics: async () => {
      set({ metricsLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const { dateRange, filters } = get();
        const queryParams = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          filters: JSON.stringify(filters.map(f => ({ [f.key]: f.value })))
        });

        const response = await fetch(`/api/admin/analytics/metrics?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load metrics');
        }

        const metrics = await response.json();
        set({ metrics, metricsLoading: false });

      } catch (error) {
        set({ metricsLoading: false });
        console.error('Failed to load metrics:', error);
      }
    },

    // Load specific chart data
    loadChartData: async (chartId: string) => {
      set((state) => ({
        chartLoading: { ...state.chartLoading, [chartId]: true }
      }));
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const { dateRange, filters } = get();
        const queryParams = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          filters: JSON.stringify(filters.map(f => ({ [f.key]: f.value })))
        });

        const response = await fetch(`/api/admin/analytics/charts/${chartId}?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load chart data for ${chartId}`);
        }

        const chartData = await response.json();
        set((state) => ({
          chartData: { ...state.chartData, [chartId]: chartData },
          chartLoading: { ...state.chartLoading, [chartId]: false }
        }));

      } catch (error) {
        set((state) => ({
          chartLoading: { ...state.chartLoading, [chartId]: false }
        }));
        console.error(`Failed to load chart data for ${chartId}:`, error);
      }
    },

    // Load comparison data
    loadComparison: async () => {
      const { compareWith } = get();
      if (!compareWith) return;

      set({ comparisonLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const { dateRange, filters } = get();
        const queryParams = new URLSearchParams({
          currentStartDate: dateRange.startDate,
          currentEndDate: dateRange.endDate,
          compareStartDate: compareWith.startDate,
          compareEndDate: compareWith.endDate,
          filters: JSON.stringify(filters.map(f => ({ [f.key]: f.value })))
        });

        const response = await fetch(`/api/admin/analytics/compare?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load comparison data');
        }

        const comparisonData = await response.json();
        set({ comparisonData, comparisonLoading: false });

      } catch (error) {
        set({ comparisonLoading: false });
        console.error('Failed to load comparison data:', error);
      }
    },

    // Filter actions
    setDateRange: (range) => {
      set({ dateRange: range });
      get().loadAnalytics();
      get().loadMetrics();
      if (get().compareWith) {
        get().loadComparison();
      }
    },

    addFilter: (filter) => {
      set((state) => ({
        filters: [...state.filters, filter]
      }));
      get().loadAnalytics();
      get().loadMetrics();
    },

    removeFilter: (filterId) => {
      set((state) => ({
        filters: state.filters.filter(f => f.id !== filterId)
      }));
      get().loadAnalytics();
      get().loadMetrics();
    },

    clearFilters: () => {
      set({ filters: [] });
      get().loadAnalytics();
      get().loadMetrics();
    },

    setCompareWith: (range) => {
      set({ compareWith: range });
      if (range) {
        get().loadComparison();
      } else {
        set({ comparisonData: null });
      }
    },

    // Real-time actions
    enableRealTime: () => {
      set({ realTimeEnabled: true });
      
      const interval = setInterval(() => {
        if (get().realTimeEnabled) {
          get().refreshData();
        }
      }, get().autoRefreshInterval);

      (get() as any).refreshIntervalId = interval;
    },

    disableRealTime: () => {
      set({ realTimeEnabled: false });
      
      const intervalId = (get() as any).refreshIntervalId;
      if (intervalId) {
        clearInterval(intervalId);
      }
    },

    setAutoRefreshInterval: (interval) => {
      set({ autoRefreshInterval: interval });
      
      if (get().realTimeEnabled) {
        get().disableRealTime();
        get().enableRealTime();
      }
    },

    refreshData: async () => {
      await Promise.all([
        get().loadAnalytics(),
        get().loadMetrics()
      ]);

      if (get().compareWith) {
        await get().loadComparison();
      }
    },

    // Export data
    exportData: async (format) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const { dateRange, filters } = get();
        const queryParams = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          filters: JSON.stringify(filters.map(f => ({ [f.key]: f.value }))),
          format
        });

        const response = await fetch(`/api/admin/analytics/export?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to export data');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${dateRange.startDate}-${dateRange.endDate}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

      } catch (error) {
        console.error('Failed to export data:', error);
        throw error;
      }
    },

    // Utility actions
    updateMetrics: (metrics) => {
      set({ metrics });
    },
  }))
);

// Selectors for optimized component subscriptions
export const useAnalyticsData = () => useAnalyticsStore((state) => ({
  data: state.data,
  loading: state.loading,
  error: state.error,
  lastUpdated: state.lastUpdated,
  loadAnalytics: state.loadAnalytics,
  refreshData: state.refreshData,
}));

export const useAnalyticsFilters = () => useAnalyticsStore((state) => ({
  dateRange: state.dateRange,
  filters: state.filters,
  compareWith: state.compareWith,
  setDateRange: state.setDateRange,
  addFilter: state.addFilter,
  removeFilter: state.removeFilter,
  clearFilters: state.clearFilters,
  setCompareWith: state.setCompareWith,
}));

export const useAnalyticsMetrics = () => useAnalyticsStore((state) => ({
  metrics: state.metrics,
  loading: state.metricsLoading,
  loadMetrics: state.loadMetrics,
}));

export const useAnalyticsCharts = () => useAnalyticsStore((state) => ({
  chartData: state.chartData,
  chartLoading: state.chartLoading,
  loadChartData: state.loadChartData,
}));

export const useAnalyticsComparison = () => useAnalyticsStore((state) => ({
  comparisonData: state.comparisonData,
  loading: state.comparisonLoading,
  loadComparison: state.loadComparison,
}));

export const useAnalyticsRealTime = () => useAnalyticsStore((state) => ({
  realTimeEnabled: state.realTimeEnabled,
  autoRefreshInterval: state.autoRefreshInterval,
  enableRealTime: state.enableRealTime,
  disableRealTime: state.disableRealTime,
  setAutoRefreshInterval: state.setAutoRefreshInterval,
}));
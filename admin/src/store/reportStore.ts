import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ReportTemplate, ReportJob, ReportSchedule } from '../types/reports';

// interface LocalReportTemplate {
//   id: string;
//   name: string;
//   description: string;
//   category: 'financial' | 'operational' | 'vendor' | 'inventory' | 'custom';
//   config: ReportTemplate;
//   isDefault: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

interface ReportState {
  // Reports data
  reports: ReportJob[];
  loading: boolean;
  error: string | null;
  
  // Templates
  templates: ReportTemplate[];
  templatesLoading: boolean;
  
  // Scheduled reports
  scheduledReports: ReportJob[];
  scheduledLoading: boolean;
  
  // Current report being generated/viewed
  currentReport: ReportJob | null;
  currentReportLoading: boolean;
  
  // Report generation
  generationQueue: Array<{
    id: string;
    name: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    progress: number;
    startedAt: string;
    completedAt?: string;
    error?: string;
  }>;

  // Actions
  loadReports: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  loadScheduledReports: () => Promise<void>;
  
  // Report generation
  generateReport: (config: ReportTemplate) => Promise<string>;
  getReport: (id: string) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  
  // Template management
  createTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemplate: (id: string, template: Partial<ReportTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  
  // Scheduled reports
  createScheduledReport: (report: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateScheduledReport: (id: string, report: Partial<ReportSchedule>) => Promise<void>;
  deleteScheduledReport: (id: string) => Promise<void>;
  toggleScheduledReport: (id: string, enabled: boolean) => Promise<void>;
  
  // Export actions
  exportReport: (id: string, format: 'pdf' | 'excel' | 'csv') => Promise<void>;
  emailReport: (id: string, recipients: string[]) => Promise<void>;
  
  // Queue management
  clearGenerationQueue: () => void;
  removeFromQueue: (id: string) => void;
}

export const useReportStore = create<ReportState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    reports: [],
    loading: false,
    error: null,
    templates: [],
    templatesLoading: false,
    scheduledReports: [],
    scheduledLoading: false,
    currentReport: null,
    currentReportLoading: false,
    generationQueue: [],

    // Load all reports
    loadReports: async () => {
      set({ loading: true, error: null });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/reports', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load reports');
        }

        const reports = await response.json();
        set({ reports, loading: false });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load reports';
        set({ loading: false, error: message });
      }
    },

    // Load report templates
    loadTemplates: async () => {
      set({ templatesLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/reports/templates', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load templates');
        }

        const templates = await response.json();
        set({ templates, templatesLoading: false });

      } catch (error) {
        set({ templatesLoading: false });
        console.error('Failed to load templates:', error);
      }
    },

    // Load scheduled reports
    loadScheduledReports: async () => {
      set({ scheduledLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/reports/scheduled', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load scheduled reports');
        }

        const scheduledReports = await response.json();
        set({ scheduledReports, scheduledLoading: false });

      } catch (error) {
        set({ scheduledLoading: false });
        console.error('Failed to load scheduled reports:', error);
      }
    },

    // Generate new report
    generateReport: async (config: ReportTemplate) => {
      const queueItem = {
        id: `report-${Date.now()}`,
        name: config.name,
        status: 'pending' as const,
        progress: 0,
        startedAt: new Date().toISOString()
      };

      // Add to generation queue
      set((state) => ({
        generationQueue: [...state.generationQueue, queueItem]
      }));

      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        // Update queue status to generating
        set((state) => ({
          generationQueue: state.generationQueue.map(item =>
            item.id === queueItem.id 
              ? { ...item, status: 'generating', progress: 10 }
              : item
          )
        }));

        const response = await fetch('/api/admin/reports/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          throw new Error('Failed to generate report');
        }

        const result = await response.json();
        
        // Update queue status to completed
        set((state) => ({
          generationQueue: state.generationQueue.map(item =>
            item.id === queueItem.id 
              ? { 
                  ...item, 
                  status: 'completed', 
                  progress: 100,
                  completedAt: new Date().toISOString()
                }
              : item
          )
        }));

        // Refresh reports list
        get().loadReports();

        return result.reportId;

      } catch (error) {
        // Update queue status to failed
        set((state) => ({
          generationQueue: state.generationQueue.map(item =>
            item.id === queueItem.id 
              ? { 
                  ...item, 
                  status: 'failed', 
                  error: error instanceof Error ? error.message : 'Generation failed'
                }
              : item
          )
        }));

        throw error;
      }
    },

    // Get specific report
    getReport: async (id: string) => {
      set({ currentReportLoading: true });
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load report');
        }

        const report = await response.json();
        set({ currentReport: report, currentReportLoading: false });

      } catch (error) {
        set({ currentReportLoading: false });
        console.error('Failed to load report:', error);
      }
    },

    // Delete report
    deleteReport: async (id: string) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete report');
        }

        // Remove from reports list
        set((state) => ({
          reports: state.reports.filter(report => report.id !== id),
          currentReport: state.currentReport?.id === id ? null : state.currentReport
        }));

      } catch (error) {
        console.error('Failed to delete report:', error);
        throw error;
      }
    },

    // Create template
    createTemplate: async (template) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/reports/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(template),
        });

        if (!response.ok) {
          throw new Error('Failed to create template');
        }

        const newTemplate = await response.json();
        
        // Add to templates list
        set((state) => ({
          templates: [...state.templates, newTemplate]
        }));

      } catch (error) {
        console.error('Failed to create template:', error);
        throw error;
      }
    },

    // Update template
    updateTemplate: async (id: string, template) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/templates/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(template),
        });

        if (!response.ok) {
          throw new Error('Failed to update template');
        }

        const updatedTemplate = await response.json();
        
        // Update in templates list
        set((state) => ({
          templates: state.templates.map(t => 
            t.id === id ? updatedTemplate : t
          )
        }));

      } catch (error) {
        console.error('Failed to update template:', error);
        throw error;
      }
    },

    // Delete template
    deleteTemplate: async (id: string) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/templates/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete template');
        }

        // Remove from templates list
        set((state) => ({
          templates: state.templates.filter(template => template.id !== id)
        }));

      } catch (error) {
        console.error('Failed to delete template:', error);
        throw error;
      }
    },

    // Create scheduled report
    createScheduledReport: async (report) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('/api/admin/reports/scheduled', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(report),
        });

        if (!response.ok) {
          throw new Error('Failed to create scheduled report');
        }

        const newScheduledReport = await response.json();
        
        // Add to scheduled reports list
        set((state) => ({
          scheduledReports: [...state.scheduledReports, newScheduledReport]
        }));

      } catch (error) {
        console.error('Failed to create scheduled report:', error);
        throw error;
      }
    },

    // Update scheduled report
    updateScheduledReport: async (id: string, report) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/scheduled/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(report),
        });

        if (!response.ok) {
          throw new Error('Failed to update scheduled report');
        }

        const updatedReport = await response.json();
        
        // Update in scheduled reports list
        set((state) => ({
          scheduledReports: state.scheduledReports.map(r => 
            r.id === id ? updatedReport : r
          )
        }));

      } catch (error) {
        console.error('Failed to update scheduled report:', error);
        throw error;
      }
    },

    // Delete scheduled report
    deleteScheduledReport: async (id: string) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/scheduled/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete scheduled report');
        }

        // Remove from scheduled reports list
        set((state) => ({
          scheduledReports: state.scheduledReports.filter(report => report.id !== id)
        }));

      } catch (error) {
        console.error('Failed to delete scheduled report:', error);
        throw error;
      }
    },

    // Toggle scheduled report
    toggleScheduledReport: async (id: string, enabled: boolean) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/scheduled/${id}/toggle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ enabled }),
        });

        if (!response.ok) {
          throw new Error('Failed to toggle scheduled report');
        }

        // Update in scheduled reports list
        set((state) => ({
          scheduledReports: state.scheduledReports.map(report => 
            report.id === id ? { ...report, enabled } : report
          )
        }));

      } catch (error) {
        console.error('Failed to toggle scheduled report:', error);
        throw error;
      }
    },

    // Export report
    exportReport: async (id: string, format: 'pdf' | 'excel' | 'csv') => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/${id}/export?format=${format}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to export report');
        }

        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get report name for filename
        const report = get().reports.find(r => r.id === id) || get().currentReport;
        const filename = report 
          ? `${report.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.${format}`
          : `report-${id}.${format}`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

      } catch (error) {
        console.error('Failed to export report:', error);
        throw error;
      }
    },

    // Email report
    emailReport: async (id: string, recipients: string[]) => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/admin/reports/${id}/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ recipients }),
        });

        if (!response.ok) {
          throw new Error('Failed to email report');
        }

      } catch (error) {
        console.error('Failed to email report:', error);
        throw error;
      }
    },

    // Queue management
    clearGenerationQueue: () => {
      set({ generationQueue: [] });
    },

    removeFromQueue: (id: string) => {
      set((state) => ({
        generationQueue: state.generationQueue.filter(item => item.id !== id)
      }));
    },
  }))
);

// Selectors for optimized component subscriptions
export const useReportList = () => useReportStore((state) => ({
  reports: state.reports,
  loading: state.loading,
  error: state.error,
  loadReports: state.loadReports,
  deleteReport: state.deleteReport,
}));

export const useReportTemplates = () => useReportStore((state) => ({
  templates: state.templates,
  loading: state.templatesLoading,
  loadTemplates: state.loadTemplates,
  createTemplate: state.createTemplate,
  updateTemplate: state.updateTemplate,
  deleteTemplate: state.deleteTemplate,
}));

export const useScheduledReports = () => useReportStore((state) => ({
  scheduledReports: state.scheduledReports,
  loading: state.scheduledLoading,
  loadScheduledReports: state.loadScheduledReports,
  createScheduledReport: state.createScheduledReport,
  updateScheduledReport: state.updateScheduledReport,
  deleteScheduledReport: state.deleteScheduledReport,
  toggleScheduledReport: state.toggleScheduledReport,
}));

export const useReportGeneration = () => useReportStore((state) => ({
  generationQueue: state.generationQueue,
  generateReport: state.generateReport,
  clearGenerationQueue: state.clearGenerationQueue,
  removeFromQueue: state.removeFromQueue,
}));

export const useCurrentReport = () => useReportStore((state) => ({
  currentReport: state.currentReport,
  loading: state.currentReportLoading,
  getReport: state.getReport,
  exportReport: state.exportReport,
  emailReport: state.emailReport,
}));
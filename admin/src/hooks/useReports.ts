import { useState, useEffect, useCallback } from 'react';
import { useReportStore } from '../store/reportStore';
import { reportsService } from '../services/reports';
import { exportService } from '../services/exports';
import {
  ReportType,
  ReportRequest,
  ReportResponse,
  SalesReport,
  WasteReport,
  VendorReport,
  TransactionReport,
  DateRange,
  ReportJob
} from '../types/reports';

interface UseReportsReturn {
  reports: ReportJob[];
  currentReport: ReportJob | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  generateSalesReport: (dateRange: DateRange) => Promise<SalesReport>;
  generateWasteReport: (dateRange: DateRange) => Promise<WasteReport>;
  generateVendorReport: (dateRange: DateRange, vendorId?: string) => Promise<VendorReport>;
  generateTransactionReport: (dateRange: DateRange) => Promise<TransactionReport>;
  generateCustomReport: (request: ReportRequest) => Promise<ReportResponse>;
  getReport: (reportId: string) => Promise<ReportJob>;
  deleteReport: (reportId: string) => Promise<void>;
  exportReport: (reportId: string, format: 'pdf' | 'excel' | 'csv') => Promise<void>;
  scheduleReport: (reportType: ReportType, frequency: 'daily' | 'weekly' | 'monthly', dateRange: DateRange) => Promise<string>;
  getScheduledReports: () => Promise<void>;
  cancelScheduledReport: (scheduleId: string) => Promise<void>;
  getReportSummary: (dateRange: DateRange) => Promise<void>;
  refreshReports: () => Promise<void>;
  clearReports: () => void;
}

export const useReports = (): UseReportsReturn => {
  const {
    reports,
    currentReport,
    loading,
    loadReports,
    loadScheduledReports,
    getReport: getReportFromStore,
    deleteReport: deleteReportFromStore
  } = useReportStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate sales report
  const generateSalesReport = useCallback(async (dateRange: DateRange): Promise<SalesReport> => {
    try {
      setIsGenerating(true);
      setError(null);

      const report = await reportsService.generateSalesReport(dateRange);
      
      // Refresh reports list
      await loadReports();

      return report;
    } catch (err: any) {
      setError(err.message || 'Failed to generate sales report');
      console.error('Sales report generation error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [loadReports]);

  // Generate waste report
  const generateWasteReport = useCallback(async (dateRange: DateRange): Promise<WasteReport> => {
    try {
      setIsGenerating(true);
      setError(null);

      const report = await reportsService.generateWasteReport(dateRange);
      
      await loadReports();

      return report;
    } catch (err: any) {
      setError(err.message || 'Failed to generate waste report');
      console.error('Waste report generation error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [loadReports]);

  // Generate vendor report
  const generateVendorReport = useCallback(async (
    dateRange: DateRange, 
    vendorId?: string
  ): Promise<VendorReport> => {
    try {
      setIsGenerating(true);
      setError(null);

      const report = await reportsService.generateVendorReport(dateRange, vendorId);
      
      await loadReports();

      return report;
    } catch (err: any) {
      setError(err.message || 'Failed to generate vendor report');
      console.error('Vendor report generation error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [loadReports]);

  // Generate transaction report
  const generateTransactionReport = useCallback(async (dateRange: DateRange): Promise<TransactionReport> => {
    try {
      setIsGenerating(true);
      setError(null);

      const report = await reportsService.generateTransactionReport(dateRange);
      
      await loadReports();

      return report;
    } catch (err: any) {
      setError(err.message || 'Failed to generate transaction report');
      console.error('Transaction report generation error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [loadReports]);

  // Generate custom report
  const generateCustomReport = useCallback(async (request: ReportRequest): Promise<ReportResponse> => {
    try {
      setIsGenerating(true);
      setError(null);

      const report = await reportsService.generateCustomReport(request);
      
      await loadReports();

      return report;
    } catch (err: any) {
      setError(err.message || 'Failed to generate custom report');
      console.error('Custom report generation error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [loadReports]);

  // Get specific report
  const getReport = useCallback(async (reportId: string): Promise<ReportJob> => {
    try {
      setIsLoading(true);
      setError(null);

      await getReportFromStore(reportId);
      
      return currentReport as ReportJob;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report');
      console.error('Report fetch error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getReportFromStore, currentReport]);

  // Delete report
  const deleteReport = useCallback(async (reportId: string): Promise<void> => {
    try {
      setError(null);

      await deleteReportFromStore(reportId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete report');
      console.error('Report deletion error:', err);
      throw err;
    }
  }, [deleteReportFromStore]);

  // Export report - Fixed to use downloadExport method
  const exportReport = useCallback(async (
    reportId: string, 
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // First create export job
      const exportId = await exportService.exportData({
        type: 'reports',
        format,
        filters: { reportId }
      });

      // Wait for export to complete (you might want to implement polling)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        const exportStatus = exportService.getExportStatus(exportId);
        
        if (exportStatus?.status === 'completed') {
          await exportService.downloadExport(exportId);
          break;
        } else if (exportStatus?.status === 'failed') {
          throw new Error('Export failed');
        }
        
        // Wait 1 second before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Export timeout');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to export report');
      console.error('Report export error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Schedule report - Fixed to use correct method signature
  const scheduleReport = useCallback(async (): Promise<string> => {
    try {
      setError(null);

      const response = await reportsService.scheduleReport();
      return response.scheduleId;
    } catch (err: any) {
      setError(err.message || 'Failed to schedule report');
      console.error('Report scheduling error:', err);
      throw err;
    }
  }, []);

  // Get scheduled reports - Fixed to use correct method signature
  const getScheduledReports = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await loadScheduledReports();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch scheduled reports');
      console.error('Scheduled reports fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadScheduledReports]);

  // Cancel scheduled report - Fixed to use correct method signature
  const cancelScheduledReport = useCallback(async (scheduleId: string): Promise<void> => {
    try {
      setError(null);

      await reportsService.cancelScheduledReport(scheduleId);
      
      // Refresh scheduled reports list
      await getScheduledReports();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel scheduled report');
      console.error('Report cancellation error:', err);
      throw err;
    }
  }, [getScheduledReports]);

  // Get report summary - Fixed to use correct method signature
  const getReportSummary = useCallback(async (dateRange: DateRange): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await reportsService.getReportSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report summary');
      console.error('Report summary fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh all reports
  const refreshReports = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        loadReports(),
        loadScheduledReports(),
        getReportSummary({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        })
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh reports');
      console.error('Reports refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadReports, loadScheduledReports, getReportSummary]);

  // Clear all reports
  const clearReports = useCallback((): void => {
    // This should be implemented in the store
    setError(null);
  }, []);

  // Initialize reports on mount
  useEffect(() => {
    refreshReports();
  }, []);

  return {
    reports,
    currentReport,
    isLoading: isLoading || loading,
    isGenerating,
    error,
    generateSalesReport,
    generateWasteReport,
    generateVendorReport,
    generateTransactionReport,
    generateCustomReport,
    getReport,
    deleteReport,
    exportReport,
    scheduleReport,
    getScheduledReports,
    cancelScheduledReport,
    getReportSummary,
    refreshReports,
    clearReports
  };
};
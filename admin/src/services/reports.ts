import adminApi from './adminApi';
import {
  ReportType,
  ReportRequest,
  ReportResponse,
  SalesReport,
  WasteReport,
  VendorReport,
  TransactionReport,
  DateRange
} from '../types/reports';

export class ReportsService {
  // Generate sales report
  async generateSalesReport(dateRange: DateRange): Promise<SalesReport> {
    try {
      const reportData = await adminApi.reports.generateReport('sales', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      // You might need to get the actual report data based on your API design
      // This is a placeholder - adjust based on your actual API response
      const response = await adminApi.reports.getReportStatus(reportData.reportId);
      return response as any; // Adjust type casting as needed
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw new Error('Failed to generate sales report');
    }
  }

  // Generate waste reduction report
  async generateWasteReport(dateRange: DateRange): Promise<WasteReport> {
    try {
      const reportData = await adminApi.reports.generateReport('waste', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const response = await adminApi.reports.getReportStatus(reportData.reportId);
      return response as any;
    } catch (error) {
      console.error('Error generating waste report:', error);
      throw new Error('Failed to generate waste report');
    }
  }

  // Generate vendor performance report
  async generateVendorReport(dateRange: DateRange, vendorId?: string): Promise<VendorReport> {
    try {
      const reportData = await adminApi.reports.generateReport('vendors', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        vendorId
      });
      
      const response = await adminApi.reports.getReportStatus(reportData.reportId);
      return response as any;
    } catch (error) {
      console.error('Error generating vendor report:', error);
      throw new Error('Failed to generate vendor report');
    }
  }

  // Generate transaction report
  async generateTransactionReport(dateRange: DateRange): Promise<TransactionReport> {
    try {
      const reportData = await adminApi.reports.generateReport('transactions', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const response = await adminApi.reports.getReportStatus(reportData.reportId);
      return response as any;
    } catch (error) {
      console.error('Error generating transaction report:', error);
      throw new Error('Failed to generate transaction report');
    }
  }

  // Generate custom report
  async generateCustomReport(request: ReportRequest): Promise<ReportResponse> {
    try {
      const reportData = await adminApi.reports.generateReport('custom', request);
      
      const response = await adminApi.reports.getReportStatus(reportData.reportId);
      return {
        id: reportData.reportId,
        type: request.type,
        status: response.status as any,
        url: response.downloadUrl ?? '',
        data: response,
        generatedAt: new Date(),
        executionTime: 0 // You might want to track this
      };
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw new Error('Failed to generate custom report');
    }
  }

  // Get report history (maps to available reports)
  async getAvailableReports(): Promise<string[]> {
    try {
      const response = await adminApi.reports.getReportHistory();
      return response.data.map(report => report.type || report.reportType);
    } catch (error) {
      console.error('Error fetching available reports:', error);
      throw new Error('Failed to fetch available reports');
    }
  }

  // Get report by ID
  async getReportById(reportId: string): Promise<ReportResponse> {
    try {
      const response = await adminApi.reports.getReportStatus(reportId);
      return {
        id: reportId,
        type: 'custom' as ReportType, // Default type, adjust as needed
        status: response.status as any,
        url: response.downloadUrl ?? '',
        data: response,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching report:', error);
      throw new Error('Failed to fetch report');
    }
  }

  // Delete report (not available in current API, placeholder implementation)
  async deleteReport(): Promise<void> {
    try {
      // This endpoint doesn't exist in your current API
      // You might need to add it to your adminApi
      console.warn('Delete report endpoint not implemented in API');
      throw new Error('Delete report functionality not available');
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error('Failed to delete report');
    }
  }

  // Schedule recurring report - Fixed signature
  async scheduleReport(
  ): Promise<{ scheduleId: string }> {
    try {
      // This functionality would need to be added to your API
      console.warn('Schedule report endpoint not implemented in API');
      
      // Placeholder implementation - return a mock schedule ID
      const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In a real implementation, you would make an API call like:
      // const response = await adminApi.reports.scheduleReport({
      //   reportType,
      //   frequency,
      //   dateRange
      // });
      // return { scheduleId: response.scheduleId };
      
      return { scheduleId };
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw new Error('Failed to schedule report');
    }
  }

  // Get scheduled reports (placeholder)
  async getScheduledReports(): Promise<Array<{
    id: string;
    reportType: ReportType;
    frequency: string;
    nextRun: string;
    isActive: boolean;
  }>> {
    try {
      console.warn('Scheduled reports endpoint not implemented in API');
      return [];
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      throw new Error('Failed to fetch scheduled reports');
    }
  }

  // Cancel scheduled report - Fixed signature
  async cancelScheduledReport(scheduleId: string): Promise<void> {
    try {
      console.warn('Cancel scheduled report endpoint not implemented in API');
      
      // In a real implementation, you would make an API call like:
      // await adminApi.reports.cancelScheduledReport(scheduleId);
      
      console.log(`Cancelling scheduled report: ${scheduleId}`);
    } catch (error) {
      console.error('Error canceling scheduled report:', error);
      throw new Error('Failed to cancel scheduled report');
    }
  }

  // Get report summary for dashboard - Fixed signature
  async getReportSummary(): Promise<{
    totalReports: number;
    recentReports: Array<{
      id: string;
      type: ReportType;
      createdAt: string;
      status: 'completed' | 'processing' | 'failed';
    }>;
    popularReports: Array<{
      type: ReportType;
      count: number;
    }>;
  }> {
    try {
      const reportHistory = await adminApi.reports.getReportHistory({
        page: 1,
        limit: 10,
        // You might want to filter by dateRange here
        // startDate: dateRange.startDate,
        // endDate: dateRange.endDate
      });

      return {
        totalReports: reportHistory.pagination?.total || 0,
        recentReports: reportHistory.data.slice(0, 5).map(report => ({
          id: report.id,
          type: (report.type || 'custom') as ReportType,
          createdAt: report.createdAt || new Date().toISOString(),
          status: (report.status || 'completed') as 'completed' | 'processing' | 'failed'
        })),
        popularReports: [] // Would need additional logic to calculate popularity
      };
    } catch (error) {
      console.error('Error fetching report summary:', error);
      throw new Error('Failed to fetch report summary');
    }
  }

  // Get report templates (placeholder)
  async getReportTemplates(): Promise<Array<{
    id: string;
    name: string;
    type: ReportType;
    description: string;
    fields: string[];
    filters: Record<string, any>;
  }>> {
    try {
      // This would need to be implemented in your API
      console.warn('Report templates endpoint not implemented in API');
      return [];
    } catch (error) {
      console.error('Error fetching report templates:', error);
      throw new Error('Failed to fetch report templates');
    }
  }
}

export const reportsService = new ReportsService();
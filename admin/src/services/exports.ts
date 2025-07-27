import adminApi from './adminApi'; // Fixed: Default import instead of named import
import * as dateUtils from '../utils/dateUtils'; // Fixed: Import all exports as dateUtils
// import { dataProcessing } from '../utils/dataProcessing';
import type { 
  ExportOptions, 
  ExportData,
  ReportTemplate,
  ExportJob
} from '../types/admin';

export class ExportService {
  private activeExports = new Map<string, ExportJob>();
  private exportQueue: ExportJob[] = [];
  private isProcessing = false;

  

  // Generate and download exports
  async exportData(options: ExportOptions): Promise<string> {
    try {
      const exportJob: ExportJob = {
        id: this.generateExportId(),
        type: options.type,
        format: options.format,
        filters: options.filters || {}, // Fixed: Provide default empty object
        status: 'pending',
        createdAt: new Date(),
        progress: 0
      };

      this.activeExports.set(exportJob.id, exportJob);
      this.exportQueue.push(exportJob);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processExportQueue();
      }

      return exportJob.id;
    } catch (error) {
      console.error('Error initiating export:', error);
      throw new Error('Failed to initiate export');
    }
  }

  // Process export queue
  private async processExportQueue(): Promise<void> {
    if (this.isProcessing || this.exportQueue.length === 0) return;

    this.isProcessing = true;

    while (this.exportQueue.length > 0) {
      const job = this.exportQueue.shift()!;
      await this.processExportJob(job);
    }

    this.isProcessing = false;
  }

  // Process individual export job
  private async processExportJob(job: ExportJob): Promise<void> {
    try {
      // Update job status
      job.status = 'processing';
      job.progress = 10;
      this.activeExports.set(job.id, { ...job });

      // Fetch data based on export type
      const data = await this.fetchExportData(job);
      job.progress = 50;
      this.activeExports.set(job.id, { ...job });

      // Process and format data
      const processedData = await this.processExportData(data, job);
      job.progress = 75;
      this.activeExports.set(job.id, { ...job });

      // Generate file
      const fileBlob = await this.generateFile(processedData, job);
      job.progress = 90;

      // Upload to temporary storage and get download URL
      const downloadUrl = await this.uploadTempFile(fileBlob, job);
      
      // Complete job
      job.status = 'completed';
      job.progress = 100;
      job.downloadUrl = downloadUrl;
      job.completedAt = new Date();
      
      this.activeExports.set(job.id, { ...job });

    } catch (error) {
      console.error(`Export job ${job.id} failed:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.activeExports.set(job.id, { ...job });
    }
  }

  // Fetch export data based on type
  private async fetchExportData(job: ExportJob): Promise<any> {
    const { type, filters } = job;

    switch (type) {
      case 'vendors':
        return await adminApi.vendors.getVendors(filters); // Fixed: Use adminApi.vendors
      
      case 'orders':
        return await adminApi.orders.getOrders(filters); // Fixed: Use adminApi.orders
      
      case 'transactions':
        return await adminApi.transactions.getTransactions(filters); // Fixed: Use adminApi.transactions
      
      case 'ingredients':
        // You might need to add an ingredients API endpoint
        return await adminApi.orders.getOrders({ ...filters, type: 'ingredients' });
      
      case 'analytics':
        // Ensure filters contains dateFrom and dateTo for AnalyticsParams
        const analyticsParams = {
          dateFrom: filters?.dateFrom ?? new Date(),
          dateTo: filters?.dateTo ?? new Date(),
          ...filters
        };
        return await adminApi.analytics.getDashboardMetrics(analyticsParams); // Fixed: Use adminApi.analytics
      
      case 'users':
        return await adminApi.vendors.getVendors(filters); // Assuming users are vendors
      
      case 'reports':
        return await adminApi.reports.getReportHistory(filters); // Fixed: Use adminApi.reports

      default:
        throw new Error(`Unsupported export type: ${type}`);
    }
  }

  // Process and format export data
  private async processExportData(response: any, job: ExportJob): Promise<ExportData> {
    const rawData = response.data || response; // Handle both API response formats
    
    switch (job.type) {
      case 'vendors':
        return this.processVendorData(rawData);
      
      case 'orders':
        return this.processOrderData(rawData);
      
      case 'transactions':
        return this.processTransactionData(rawData);
      
      case 'ingredients':
        return this.processIngredientData(rawData);
      
      case 'analytics':
        return this.processAnalyticsData(rawData);
      
      case 'users':
        return this.processUserData(rawData);
      
      case 'reports':
        return this.processReportData(rawData);

      default:
        return {
          headers: Object.keys(rawData[0] || {}),
          rows: rawData,
          metadata: {
            exportedAt: new Date(),
            totalRecords: rawData.length,
            exportType: job.type
          }
        };
    }
  }

  // Data processing methods for different types
  private processVendorData(data: any[]): ExportData {
    const headers = [
      'Vendor ID',
      'Name',
      'Email',
      'Phone',
      'Location',
      'Business Type',
      'Registration Date',
      'Status',
      'Total Orders',
      'Total Revenue',
      'Rating',
      'Verification Status'
    ];

    const rows = data.map(vendor => [
      vendor.id,
      vendor.name,
      vendor.email,
      vendor.phone,
      `${vendor.location?.city || vendor.address?.city || ''}, ${vendor.location?.state || vendor.address?.state || ''}`,
      vendor.businessType || vendor.businessName,
      dateUtils.formatDate(vendor.createdAt),
      vendor.status,
      vendor.stats?.totalOrders || vendor.totalOrders || 0,
      `₹${vendor.stats?.totalRevenue || vendor.totalRevenue || 0}`,
      vendor.stats?.rating || vendor.rating || 'N/A',
      vendor.isVerified ? 'Verified' : 'Pending'
    ]);

    return {
      headers,
      rows,
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.length,
        exportType: 'vendors'
      }
    };
  }

  private processOrderData(data: any[]): ExportData {
    const headers = [
      'Order ID',
      'Buyer Name',
      'Seller Name',
      'Ingredient',
      'Quantity',
      'Unit Price',
      'Total Amount',
      'Status',
      'Order Date',
      'Delivery Date',
      'Payment Status',
      'Commission'
    ];

    const rows = data.map(order => [
      order.id,
      order.buyerName,
      order.sellerName,
      order.ingredientName,
      `${order.quantity} ${order.unit}`,
      `₹${order.unitPrice}`,
      `₹${order.totalAmount}`,
      order.status,
      dateUtils.formatDate(order.createdAt, dateUtils.DATE_FORMATS.DATETIME),
      order.deliveryDate ? dateUtils.formatDate(order.deliveryDate) : 'N/A',
      order.paymentStatus,
      `₹${order.commission || 0}`
    ]);

    return {
      headers,
      rows,
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.length,
        exportType: 'orders'
      }
    };
  }

  private processTransactionData(data: any[]): ExportData {
    const headers = [
      'Transaction ID',
      'Order ID',
      'Vendor Name',
      'Amount',
      'Commission',
      'Net Amount',
      'Payment Method',
      'Transaction Date',
      'Status',
      'Reference ID'
    ];

    const rows = data.map(transaction => [
      transaction.id,
      transaction.orderId,
      transaction.vendorName,
      `₹${transaction.amount}`,
      `₹${transaction.commission}`,
      `₹${transaction.netAmount}`,
      transaction.paymentMethod,
      dateUtils.formatDate(transaction.createdAt, dateUtils.DATE_FORMATS.DATETIME),
      transaction.status,
      transaction.referenceId || 'N/A'
    ]);

    return {
      headers,
      rows,
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.length,
        exportType: 'transactions'
      }
    };
  }

  private processIngredientData(data: any[]): ExportData {
    const headers = [
      'Ingredient ID',
      'Name',
      'Category',
      'Vendor Name',
      'Quantity Available',
      'Unit Price',
      'Expiry Date',
      'Status',
      'Listed Date',
      'Total Orders',
      'Location'
    ];

    const rows = data.map(ingredient => [
      ingredient.id,
      ingredient.name,
      ingredient.category,
      ingredient.vendorName,
      `${ingredient.quantity} ${ingredient.unit}`,
      `₹${ingredient.price}`,
      dateUtils.formatDate(ingredient.expiryDate),
      ingredient.status,
      dateUtils.formatDate(ingredient.createdAt),
      ingredient.totalOrders || 0,
      ingredient.location
    ]);

    return {
      headers,
      rows,
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.length,
        exportType: 'ingredients'
      }
    };
  }

  private processAnalyticsData(data: any): ExportData {
    const headers = [
      'Metric',
      'Value',
      'Period',
      'Growth Rate',
      'Previous Value',
      'Date'
    ];

    const rows = Object.entries(data.metrics || data || {}).map(([metric, value]: [string, any]) => [
      metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      typeof value === 'number' ? (metric.includes('revenue') || metric.includes('amount') ? `₹${value}` : value) : value,
      data.period || 'Current',
      data.growthRates?.[metric] ? `${data.growthRates[metric]}%` : 'N/A',
      data.previousValues?.[metric] || 'N/A',
      dateUtils.formatDate(new Date())
    ]);

    return {
      headers,
      rows,
      metadata: {
        exportedAt: new Date(),
        totalRecords: rows.length,
        exportType: 'analytics'
      }
    };
  }

  private processUserData(data: any[]): ExportData {
    const headers = [
      'User ID',
      'Name',
      'Email',
      'Phone',
      'User Type',
      'Location',
      'Registration Date',
      'Last Login',
      'Status',
      'Total Orders',
      'Is Verified'
    ];

    const rows = data.map(user => [
      user.id,
      user.name,
      user.email,
      user.phone,
      user.userType,
      `${user.location?.city || user.address?.city || ''}, ${user.location?.state || user.address?.state || ''}`,
      dateUtils.formatDate(user.createdAt),
      user.lastLogin ? dateUtils.formatDate(user.lastLogin, dateUtils.DATE_FORMATS.DATETIME) : 'Never',
      user.status,
      user.totalOrders || 0,
      user.isVerified ? 'Yes' : 'No'
    ]);

    return {
      headers,
      rows,
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.length,
        exportType: 'users'
      }
    };
  }

  private processReportData(data: any): ExportData {
    return {
      headers: data.headers || [],
      rows: data.rows || [],
      metadata: {
        exportedAt: new Date(),
        totalRecords: data.rows?.length || 0,
        exportType: 'reports',
        reportName: data.reportName,
        reportPeriod: data.period
      }
    };
  }

  // Generate file based on format
  private async generateFile(data: ExportData, job: ExportJob): Promise<Blob> {
    switch (job.format) {
      case 'csv':
        return this.generateCSV(data);
      
      case 'excel':
        return this.generateExcel(data);
      
      case 'pdf':
        return this.generatePDF(data, job);
      
      case 'json':
        return this.generateJSON(data);

      default:
        throw new Error(`Unsupported export format: ${job.format}`);
    }
  }

  private generateCSV(data: ExportData): Blob {
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => 
        row.map(cell => 
          typeof cell === 'string' && cell.includes(',') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private generateExcel(data: ExportData): Blob {
    // Simple Excel generation (would use a library like xlsx in real implementation)
    const csvContent = [
      data.headers.join('\t'),
      ...data.rows.map(row => row.join('\t'))
    ].join('\n');

    return new Blob([csvContent], { type: 'application/vnd.ms-excel' });
  }

  private generatePDF(data: ExportData, job: ExportJob): Blob {
    // PDF generation (would use a library like jspdf in real implementation)
    const content = `
      FreshFlow Export Report
      Export Type: ${job.type}
      Generated: ${dateUtils.formatDate(new Date(), dateUtils.DATE_FORMATS.DATETIME)}
      Total Records: ${data.metadata.totalRecords}
      
      ${data.headers.join(' | ')}
      ${'-'.repeat(data.headers.join(' | ').length)}
      ${data.rows.map(row => row.join(' | ')).join('\n')}
    `;

    return new Blob([content], { type: 'application/pdf' });
  }

  private generateJSON(data: ExportData): Blob {
    const jsonData = {
      metadata: data.metadata,
      data: data.rows.map(row => {
        const obj: any = {};
        data.headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      })
    };

    return new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  }

  // Upload temporary file and get download URL
  private async uploadTempFile(blob: Blob, job: ExportJob): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', blob, `${job.type}_export_${job.id}.${job.format}`);
      formData.append('exportId', job.id);

      // Use the adminApiInstance directly for custom requests
      const { adminApiInstance } = await import('./adminApi');
      const response = await adminApiInstance.post('/export/upload-temp', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.downloadUrl;
    } catch (error) {
      console.error('Error uploading temp file:', error);
      throw new Error('Failed to upload export file');
    }
  }

  // Get export status
  getExportStatus(exportId: string): ExportJob | null {
    return this.activeExports.get(exportId) || null;
  }

  // Get all active exports
  getActiveExports(): ExportJob[] {
    return Array.from(this.activeExports.values());
  }

  // Cancel export
  cancelExport(exportId: string): boolean {
    const job = this.activeExports.get(exportId);
    if (job && job.status === 'pending') {
      job.status = 'cancelled';
      this.activeExports.set(exportId, job);
      
      // Remove from queue
      const queueIndex = this.exportQueue.findIndex(q => q.id === exportId);
      if (queueIndex > -1) {
        this.exportQueue.splice(queueIndex, 1);
      }
      
      return true;
    }
    return false;
  }

  // Download export file
  async downloadExport(exportId: string): Promise<void> {
    const job = this.activeExports.get(exportId);
    
    if (!job || job.status !== 'completed' || !job.downloadUrl) {
      throw new Error('Export not ready for download');
    }

    try {
      const response = await fetch(job.downloadUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.type}_export_${this.formatDateForFilename(new Date())}.${job.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading export:', error);
      throw new Error('Failed to download export file');
    }
  }

  // Helper method for filename formatting
  private formatDateForFilename(date: Date): string {
    return dateUtils.formatDate(date, 'yyyy-MM-dd_HH-mm-ss');
  }

  // Clean up completed exports
  cleanupCompletedExports(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    for (const [id, job] of this.activeExports.entries()) {
      if (job.status === 'completed' && job.completedAt && job.completedAt < cutoffTime) {
        this.activeExports.delete(id);
      }
    }
  }

  // Generate unique export ID
  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get export templates
  async getExportTemplates(): Promise<ReportTemplate[]> {
    try {
      const response = await adminApi.reports.getReportHistory();
      return response.data || [];
    } catch (error) {
      console.error('Error fetching export templates:', error);
      return [];
    }
  }

  // Create custom export template
  async createExportTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt'>): Promise<ReportTemplate> {
    try {
      const response = await adminApi.reports.generateReport('template', template);
      return response as any; // You might need to adjust this based on your actual API response
    } catch (error) {
      console.error('Error creating export template:', error);
      throw new Error('Failed to create export template');
    }
  }

  // Schedule recurring export
  async scheduleRecurringExport(options: ExportOptions & {
    schedule: string; // cron expression
    recipients: string[];
  }): Promise<string> {
    try {
      // Use the adminApiInstance for custom requests
      const { adminApiInstance } = await import('./adminApi');
      const response = await adminApiInstance.post('/export/schedule', options);
      return response.data.scheduleId;
    } catch (error) {
      console.error('Error scheduling recurring export:', error);
      throw new Error('Failed to schedule recurring export');
    }
  }
}

// Create and export singleton instance
export const exportService = new ExportService();
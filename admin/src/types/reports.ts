// Report Generation Types

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  type: ReportOutputType;
  sections: ReportSection[];
  parameters: ReportParameter[];
  styling: ReportStyling;
  isActive: boolean;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportCategory = 
  | 'financial'
  | 'operational'
  | 'vendor_performance'
  | 'market_analysis'
  | 'system_health'
  | 'compliance'
  | 'executive_summary'
  | 'custom';

export type ReportOutputType = 'pdf' | 'xlsx' | 'csv' | 'docx' | 'html' | 'json';

export interface ReportSection {
  id: string;
  type: SectionType;
  title: string;
  description?: string;
  order: number;
  config: SectionConfig;
  isVisible: boolean;
  conditions?: ReportCondition[];
}

export type SectionType = 
  | 'cover_page'
  | 'executive_summary'
  | 'kpi_overview'
  | 'chart'
  | 'table'
  | 'text'
  | 'image'
  | 'page_break'
  | 'appendix';

export interface SectionConfig {
  // Chart section config
  chartConfig?: {
    type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
    dataSource: string;
    xAxis: string;
    yAxis: string[];
    groupBy?: string;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    colors?: string[];
    showLegend: boolean;
    showDataLabels: boolean;
  };
  
  // Table section config
  tableConfig?: {
    dataSource: string;
    columns: TableColumn[];
    sorting?: {
      column: string;
      direction: 'asc' | 'desc';
    };
    grouping?: string[];
    showTotals: boolean;
    maxRows?: number;
    pagination: boolean;
  };
  
  // KPI section config
  kpiConfig?: {
    metrics: KPIMetric[];
    layout: 'grid' | 'list' | 'cards';
    showTrends: boolean;
    showTargets: boolean;
    comparisonPeriod?: string;
  };
  
  // Text section config
  textConfig?: {
    content: string;
    variables?: string[];
    formatting: TextFormatting;
  };
  
  // Image section config
  imageConfig?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    alignment: 'left' | 'center' | 'right';
  };
}

export interface TableColumn {
  key: string;
  title: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'status';
  width?: number;
  alignment: 'left' | 'center' | 'right';
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  isVisible: boolean;
  isSortable: boolean;
}

export interface KPIMetric {
  key: string;
  name: string;
  value: number;
  unit: string;
  format: 'number' | 'currency' | 'percentage';
  target?: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  icon?: string;
}

export interface TextFormatting {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  marginTop: number;
  marginBottom: number;
}

export interface ReportParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean';
  required: boolean;
  defaultValue?: any;
  options?: ParameterOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  description?: string;
}

export interface ParameterOption {
  value: any;
  label: string;
  group?: string;
}

export interface ReportCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ReportStyling {
  theme: 'default' | 'corporate' | 'modern' | 'minimal';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  headerHeight: number;
  footerHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3';
  logoUrl?: string;
  watermarkText?: string;
  customCSS?: string;
}

// Report Generation and Scheduling
export interface ReportJob {
  id: string;
  name: string;
  templateId: string;
  parameters: Record<string, any>;
  schedule?: ReportSchedule;
  recipients: ReportRecipient[];
  status: ReportJobStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdBy: string;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  fileUrl?: string;
  error?: string;
  executionTime?: number;
  fileSize?: number;
}

export type ReportJobStatus = 
  | 'scheduled'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ReportSchedule {
  enabled: boolean;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number;
  startDate: Date;
  endDate?: Date;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  time: string;
  timezone: string;
  lastRun?: Date;
  nextRun?: Date;
}

export interface ReportRecipient {
  type: 'user' | 'group' | 'email';
  identifier: string;
  name: string;
  email: string;
  deliveryMethod: 'email' | 'download' | 'dashboard' | 'api';
  notificationPreferences: {
    onSuccess: boolean;
    onFailure: boolean;
    onSchedule: boolean;
  };
}

// Report Data Sources
export interface ReportDataSource {
  id: string;
  name: string;
  type: DataSourceType;
  connection: DataSourceConnection;
  schema: DataSourceSchema;
  refreshInterval: number;
  lastRefreshed?: Date;
  isActive: boolean;
}

export type DataSourceType = 
  | 'database'
  | 'api'
  | 'file'
  | 'analytics'
  | 'external_service';

export interface DataSourceConnection {
  // Database connection
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  
  // API connection
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  
  // File connection
  filePath?: string;
  fileType?: 'csv' | 'xlsx' | 'json' | 'xml';
  
  // Configuration
  timeout?: number;
  retryAttempts?: number;
  cacheDuration?: number;
}

export interface DataSourceSchema {
  tables: DataTable[];
  relationships: DataRelationship[];
}

export interface DataTable {
  name: string;
  alias?: string;
  columns: DataColumn[];
  filters?: DataFilter[];
  orderBy?: string[];
}

export interface DataColumn {
  name: string;
  alias?: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'json';
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
  description?: string;
}

export interface DataRelationship {
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface DataFilter {
  column: string;
  operator: string;
  value: any;
  condition: 'AND' | 'OR';
}

// Report Analytics and Insights
export interface ReportAnalytics {
  reportId: string;
  templateId: string;
  usage: ReportUsage;
  performance: ReportPerformance;
  insights: ReportInsight[];
  feedback: ReportFeedback[];
}

export interface ReportUsage {
  totalGenerations: number;
  uniqueUsers: number;
  averageGenerationsPerUser: number;
  mostRequestedParameters: ParameterUsage[];
  popularTimeRanges: TimeRangeUsage[];
  generationsByPeriod: TimeSeriesData[];
}

export interface ParameterUsage {
  parameter: string;
  value: any;
  count: number;
  percentage: number;
}

export interface TimeRangeUsage {
  range: string;
  count: number;
  percentage: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export interface ReportPerformance {
  averageExecutionTime: number;
  averageFileSize: number;
  successRate: number;
  errorRate: number;
  commonErrors: string[];
  performanceTrend: TimeSeriesData[];
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  section: string;
  averageTime: number;
  percentage: number;
  suggestions: string[];
}

export interface ReportInsight {
  type: 'optimization' | 'usage' | 'data_quality' | 'performance';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
  automatable: boolean;
  createdAt: Date;
}

export interface ReportFeedback {
  id: string;
  reportJobId: string;
  userId: string;
  rating: number;
  comment?: string;
  issues: string[];
  suggestions: string[];
  createdAt: Date;
}

// Export and Sharing
export interface ReportExport {
  id: string;
  reportJobId: string;
  format: ReportOutputType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  expiresAt?: Date;
  downloadCount: number;
  lastDownloaded?: Date;
  error?: string;
}

export interface ReportShare {
  id: string;
  reportJobId: string;
  shareType: 'public' | 'private' | 'password_protected';
  accessLevel: 'view' | 'download' | 'full';
  expiresAt?: Date;
  password?: string;
  allowedUsers?: string[];
  shareUrl: string;
  accessCount: number;
  lastAccessed?: Date;
  isActive: boolean;
}

// Report Notifications
export interface ReportNotification {
  id: string;
  reportJobId: string;
  recipientId: string;
  type: 'generation_started' | 'generation_completed' | 'generation_failed' | 'schedule_reminder';
  title: string;
  message: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  readAt?: Date;
  error?: string;
}

// Report Audit and Compliance
export interface ReportAudit {
  id: string;
  reportJobId: string;
  action: 'created' | 'updated' | 'deleted' | 'generated' | 'shared' | 'downloaded';
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: 'data_retention' | 'access_control' | 'audit_trail' | 'data_privacy';
  rules: ComplianceRuleDetail[];
  isActive: boolean;
  applicableReports: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceRuleDetail {
  field: string;
  condition: string;
  value: any;
  action: 'allow' | 'deny' | 'require_approval' | 'anonymize' | 'encrypt';
  message?: string;
}

// API Response Types
export interface ReportApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    timestamp: Date;
    requestId: string;
    totalCount?: number;
    pageCount?: number;
  };
}

export interface ReportError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

// Utility Types
export interface ReportValidationResult {
  isValid: boolean;
  errors: ReportError[];
  warnings: string[];
}

export interface ReportPreview {
  sections: PreviewSection[];
  estimatedSize: number;
  estimatedTime: number;
  dataPoints: number;
}

export interface PreviewSection {
  title: string;
  type: SectionType;
  preview: string | Record<string, any>;
  hasData: boolean;
  rowCount?: number;
}

// Missing types that services/report.ts is trying to import
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export type ReportType = 
  | 'sales'
  | 'waste'
  | 'vendor'
  | 'transaction'
  | 'financial'
  | 'operational'
  | 'custom';

export interface ReportRequest {
  type: ReportType;
  dateRange: DateRange;
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
  format?: ReportOutputType;
  templateId?: string;
  userId: string;
}

export interface ReportResponse {
  id: string;
  type: ReportType;
  status: ReportJobStatus;
  url?: string;
  data?: any;
  error?: string;
  generatedAt: Date;
  fileSize?: number;
  executionTime?: number;
}

// Specific Report Types
export interface SalesReport {
  id: string;
  dateRange: DateRange;
  totalSales: number;
  totalTransactions: number;
  averageOrderValue: number;
  topProducts: ProductSalesData[];
  salesByPeriod: TimeSeriesData[];
  salesByCategory: CategorySalesData[];
  paymentMethods: PaymentMethodData[];
  discounts: DiscountData[];
  refunds: RefundData[];
  generatedAt: Date;
}

export interface ProductSalesData {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  margin: number;
}

export interface CategorySalesData {
  category: string;
  sales: number;
  percentage: number;
}

export interface PaymentMethodData {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DiscountData {
  discountType: string;
  totalDiscount: number;
  count: number;
  averageDiscount: number;
}

export interface RefundData {
  totalRefunds: number;
  refundCount: number;
  averageRefund: number;
  refundRate: number;
}

export interface WasteReport {
  id: string;
  dateRange: DateRange;
  totalWaste: number;
  wasteByCategory: WasteCategoryData[];
  wasteByProduct: ProductWasteData[];
  wasteByPeriod: TimeSeriesData[];
  costImpact: number;
  reductionOpportunities: WasteReductionOpportunity[];
  generatedAt: Date;
}

export interface WasteCategoryData {
  category: string;
  amount: number;
  cost: number;
  percentage: number;
}

export interface ProductWasteData {
  productId: string;
  productName: string;
  wasteAmount: number;
  wasteCost: number;
  reason: string;
}

export interface WasteReductionOpportunity {
  area: string;
  potentialSaving: number;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface VendorReport {
  id: string;
  dateRange: DateRange;
  vendors: VendorPerformanceData[];
  totalSpend: number;
  averageDeliveryTime: number;
  qualityMetrics: VendorQualityMetrics;
  costSavings: number;
  generatedAt: Date;
}

export interface VendorPerformanceData {
  vendorId: string;
  vendorName: string;
  totalOrders: number;
  totalSpend: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  costPerUnit: number;
  paymentTerms: string;
}

export interface VendorQualityMetrics {
  averageQualityScore: number;
  defectRate: number;
  returnRate: number;
  complianceScore: number;
}

export interface TransactionReport {
  id: string;
  dateRange: DateRange;
  totalTransactions: number;
  totalVolume: number;
  averageTransactionValue: number;
  transactionsByType: TransactionTypeData[];
  transactionsByPeriod: TimeSeriesData[];
  paymentMethods: PaymentMethodData[];
  failureRate: number;
  generatedAt: Date;
}

export interface TransactionTypeData {
  type: string;
  count: number;
  volume: number;
  percentage: number;
}
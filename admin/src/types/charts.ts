// Chart data structure interfaces
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  category?: string;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface BarChartDataPoint {
  category: string;
  value: number;
  color?: string;
  subCategory?: string;
}

// Chart configuration interfaces
export interface ChartConfig {
  width?: number;
  height?: number;
  responsive?: boolean;
  animation?: boolean;
  theme?: 'light' | 'dark';
  colors?: string[];
}

export interface LineChartConfig extends ChartConfig {
  showGrid?: boolean;
  showLegend?: boolean;
  strokeWidth?: number;
  showPoints?: boolean;
  smooth?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface BarChartConfig extends ChartConfig {
  horizontal?: boolean;
  stacked?: boolean;
  showValues?: boolean;
  barRadius?: number;
  maxBarWidth?: number;
}

export interface PieChartConfig extends ChartConfig {
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  labelFormat?: 'percentage' | 'value' | 'both';
}

export interface AreaChartConfig extends ChartConfig {
  stackId?: string;
  fillOpacity?: number;
  connectNulls?: boolean;
  showGradient?: boolean;
}

// Dashboard specific chart types
export interface DashboardChartData {
  id: string;
  title: string;
  type: ChartType;
  data: ChartDataPoint[] | TimeSeriesDataPoint[] | PieChartDataPoint[] | BarChartDataPoint[];
  config: ChartConfig;
  loading?: boolean;
  error?: string;
  lastUpdated?: string;
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'area' 
  | 'doughnut' 
  | 'scatter' 
  | 'bubble'
  | 'radar'
  | 'polar'
  | 'funnel';

// Analytics chart interfaces
export interface VendorAnalyticsChart {
  totalVendors: DashboardChartData;
  activeVendors: DashboardChartData;
  vendorsByLocation: DashboardChartData;
  vendorGrowth: DashboardChartData;
}

export interface OrderAnalyticsChart {
  orderVolume: DashboardChartData;
  orderValue: DashboardChartData;
  ordersByStatus: DashboardChartData;
  orderTrends: DashboardChartData;
}

export interface TransactionAnalyticsChart {
  transactionVolume: DashboardChartData;
  transactionValue: DashboardChartData;
  paymentMethods: DashboardChartData;
  transactionTrends: DashboardChartData;
}

export interface InventoryAnalyticsChart {
  ingredientDistribution: DashboardChartData;
  expiryAlerts: DashboardChartData;
  stockLevels: DashboardChartData;
  wasteReduction: DashboardChartData;
}

// Chart interaction interfaces
export interface ChartTooltipData {
  label: string;
  value: number | string;
  color?: string;
  formatted?: string;
}

export interface ChartLegendItem {
  label: string;
  color: string;
  value?: number;
  visible: boolean;
}

export interface ChartClickEvent {
  dataIndex: number;
  dataPoint: ChartDataPoint | TimeSeriesDataPoint | PieChartDataPoint | BarChartDataPoint;
  chartType: ChartType;
}

// Chart filter and grouping
export interface ChartFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | [number, number];
}

export interface ChartGroupBy {
  field: string;
  interval?: 'hour' | 'day' | 'week' | 'month' | 'year';
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

// Real-time chart update interfaces
export interface ChartUpdateEvent {
  chartId: string;
  newData: ChartDataPoint[] | TimeSeriesDataPoint[] | PieChartDataPoint[] | BarChartDataPoint[];
  updateType: 'replace' | 'append' | 'prepend' | 'update';
  timestamp: string;
}

export interface LiveChartConfig extends ChartConfig {
  updateInterval: number;
  maxDataPoints?: number;
  autoScroll?: boolean;
  bufferSize?: number;
}

// Chart export interfaces
export interface ChartExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf';
  quality?: number;
  scale?: number;
  backgroundColor?: string;
  filename?: string;
}

// Chart theme interfaces
export interface ChartTheme {
  name: string;
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  colors: string[];
  fontFamily: string;
  fontSize: number;
}

// Dashboard chart layout
export interface ChartLayout {
  id: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  chartId: string;
  resizable?: boolean;
  draggable?: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  charts: ChartLayout[];
  columns: number;
  rowHeight: number;
  isDefault?: boolean;
}
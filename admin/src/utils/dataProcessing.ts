import _ from 'lodash';

// Data interfaces
export interface ProcessedData {
  [key: string]: any;
}

export interface AggregationConfig {
  groupBy: string | string[];
  aggregateFields: {
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias?: string;
  }[];
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// Formatting utilities
export const formatDate = (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MMM DD, YYYY':
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    default:
      return d.toISOString().split('T')[0];
  }
};

export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
  
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  if (typeof value !== 'number' || isNaN(value)) return '0.00%';
  return (value * 100).toFixed(decimals) + '%';
};

// Data cleaning utilities
export const cleanData = (data: any[]): any[] => {
  return data
    .filter(item => item !== null && item !== undefined)
    .map(item => {
      const cleaned: any = {};
      
      Object.keys(item).forEach(key => {
        const value = item[key];
        
        if (value === null || value === undefined || value === '') {
          cleaned[key] = null;
        } else if (typeof value === 'string') {
          cleaned[key] = value.trim();
        } else if (typeof value === 'number' && isNaN(value)) {
          cleaned[key] = null;
        } else {
          cleaned[key] = value;
        }
      });
      
      return cleaned;
    });
};

export const removeOutliers = (
  data: any[],
  field: string,
  method: 'iqr' | 'zscore' = 'iqr'
): any[] => {
  const values = data.map(item => Number(item[field])).filter(val => !isNaN(val));
  
  if (values.length === 0) return data;
  
  let lowerBound: number;
  let upperBound: number;
  
  if (method === 'iqr') {
    const sorted = values.sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    lowerBound = q1 - 1.5 * iqr;
    upperBound = q3 + 1.5 * iqr;
  } else {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    lowerBound = mean - 3 * stdDev;
    upperBound = mean + 3 * stdDev;
  }
  
  return data.filter(item => {
    const value = Number(item[field]);
    return !isNaN(value) && value >= lowerBound && value <= upperBound;
  });
};

// Data aggregation
export const aggregateData = (data: any[], config: AggregationConfig): any[] => {
  const grouped = _.groupBy(data, (item) => {
    if (Array.isArray(config.groupBy)) {
      return config.groupBy.map(field => item[field]).join('|');
    }
    return item[config.groupBy];
  });
  
  const result = Object.entries(grouped).map(([key, group]) => {
    const aggregated: any = {};
    
    // Set group keys
    if (Array.isArray(config.groupBy)) {
      const keyParts = key.split('|');
      config.groupBy.forEach((field, index) => {
        aggregated[field] = keyParts[index];
      });
    } else {
      aggregated[config.groupBy] = key;
    }
    
    // Perform aggregations
    config.aggregateFields.forEach(({ field, operation, alias }) => {
      const fieldName = alias || `${field}_${operation}`;
      const values = group.map(item => Number(item[field])).filter(val => !isNaN(val));
      
      switch (operation) {
        case 'sum':
          aggregated[fieldName] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          aggregated[fieldName] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
          break;
        case 'count':
          aggregated[fieldName] = group.length;
          break;
        case 'min':
          aggregated[fieldName] = values.length > 0 ? Math.min(...values) : 0;
          break;
        case 'max':
          aggregated[fieldName] = values.length > 0 ? Math.max(...values) : 0;
          break;
      }
    });
    
    return aggregated;
  });
  
  return result;
};

// Date-specific aggregation functions
export const aggregateByDate = (data: any[], dateField: string, valueField: string): any[] => {
  const grouped = _.groupBy(data, dateField);
  
  return Object.entries(grouped).map(([date, group]) => ({
    [dateField]: date,
    [valueField]: group.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0),
    count: group.length
  }));
};

export const aggregateByMonth = (data: any[], valueField: string): any[] => {
  const grouped = _.groupBy(data, (item) => {
    const date = new Date(item.timestamp || item.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  
  return Object.entries(grouped).map(([month, group]) => ({
    month,
    [valueField]: group.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0),
    count: group.length
  }));
};

export const groupByCategory = (data: any[], categoryField: string): { [key: string]: any[] } => {
  return _.groupBy(data, categoryField);
};

export const groupByVendor = (data: any[], valueField: string): any[] => {
  const grouped = _.groupBy(data, 'vendorId');
  
  return Object.entries(grouped).map(([vendorId, group]) => ({
    vendorId,
    [valueField]: group.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0),
    count: group.length
  }));
};

// Data filtering
export const filterData = (data: any[], filters: FilterConfig[]): any[] => {
  return data.filter(item => {
    return filters.every(filter => {
      const value = item[filter.field];
      
      switch (filter.operator) {
        case 'eq':
          return value === filter.value;
        case 'ne':
          return value !== filter.value;
        case 'gt':
          return Number(value) > Number(filter.value);
        case 'gte':
          return Number(value) >= Number(filter.value);
        case 'lt':
          return Number(value) < Number(filter.value);
        case 'lte':
          return Number(value) <= Number(filter.value);
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(value);
        case 'contains':
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        default:
          return true;
      }
    });
  });
};

// Data sorting
export const sortData = (data: any[], sorts: SortConfig[]): any[] => {
  return _.orderBy(
    data,
    sorts.map(sort => sort.field),
    sorts.map(sort => sort.direction)
  );
};

// Data transformation
export const transformData = (
  data: any[],
  transformations: { [field: string]: (value: any) => any }
): any[] => {
  return data.map(item => {
    const transformed = { ...item };
    
    Object.entries(transformations).forEach(([field, transformer]) => {
      if (field in transformed) {
        transformed[field] = transformer(transformed[field]);
      }
    });
    
    return transformed;
  });
};

// Data pivoting
export const pivotData = (
  data: any[],
  rowField: string,
  columnField: string,
  valueField: string,
  aggregateFunction: 'sum' | 'avg' | 'count' = 'sum'
): any[] => {
  const grouped = _.groupBy(data, item => `${item[rowField]}|${item[columnField]}`);
  const pivoted = new Map<string, any>();
  
  Object.entries(grouped).forEach(([key, group]) => {
    const [rowValue, columnValue] = key.split('|');
    
    if (!pivoted.has(rowValue)) {
      pivoted.set(rowValue, { [rowField]: rowValue });
    }
    
    const row = pivoted.get(rowValue)!;
    const values = group.map(item => Number(item[valueField])).filter(val => !isNaN(val));
    
    switch (aggregateFunction) {
      case 'sum':
        row[columnValue] = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'avg':
        row[columnValue] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        break;
      case 'count':
        row[columnValue] = values.length;
        break;
    }
  });
  
  return Array.from(pivoted.values());
};

// Statistical calculations
export const calculateStatistics = (data: any[], field: string) => {
  const values = data.map(item => Number(item[field])).filter(val => !isNaN(val));
  
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      median: 0,
      mode: null,
      min: 0,
      max: 0,
      variance: 0,
      standardDeviation: 0
    };
  }
  
  const sorted = values.sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  
  const median = values.length % 2 === 0
    ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
    : sorted[Math.floor(values.length / 2)];
  
  const frequency = new Map<number, number>();
  values.forEach(val => {
    frequency.set(val, (frequency.get(val) || 0) + 1);
  });
  
  const mode = Array.from(frequency.entries()).reduce((a, b) => 
    a[1] > b[1] ? a : b
  )[0];
  
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    count: values.length,
    sum,
    mean,
    median,
    mode,
    min: Math.min(...values),
    max: Math.max(...values),
    variance,
    standardDeviation
  };
};

export const calculateStandardDeviation = (data: number[]): number => {
  if (data.length === 0) return 0;
  
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  
  return Math.sqrt(variance);
};

export const calculateMovingAverage = (data: number[], windowSize: number): number[] => {
  if (data.length < windowSize || windowSize <= 0) return [];
  
  const result: number[] = [];
  
  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
    result.push(average);
  }
  
  return result;
};

export const calculatePercentile = (data: number[], percentile: number): number => {
  if (data.length === 0) return 0;
  
  const sorted = [...data].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  
  if (Number.isInteger(index)) {
    return sorted[index];
  }
  
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

export const findOutliers = (data: number[]): number[] => {
  if (data.length < 4) return [];
  
  const sorted = [...data].sort((a, b) => a - b);
  const q1 = calculatePercentile(sorted, 25);
  const q3 = calculatePercentile(sorted, 75);
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return data.filter(val => val < lowerBound || val > upperBound);
};

export const normalizeData = (data: number[]): number[] => {
  if (data.length === 0) return [];
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  if (range === 0) return data.map(() => 0);
  
  return data.map(val => (val - min) / range);
};

export const applySmoothening = (data: number[], alpha: number = 0.3): number[] => {
  if (data.length === 0) return [];
  
  const smoothed = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    smoothed[i] = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
  }
  
  return smoothed;
};

export const fillMissingDates = (
  data: any[],
  dateField: string,
  valueField: string
): any[] => {
  if (data.length < 2) return data;
  
  const sorted = data.sort((a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime());
  const filled = [];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    filled.push(sorted[i]);
    
    const currentDate = new Date(sorted[i][dateField]);
    const nextDate = new Date(sorted[i + 1][dateField]);
    const dayDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff > 1) {
      for (let j = 1; j < dayDiff; j++) {
        const interpolatedDate = new Date(currentDate);
        interpolatedDate.setDate(currentDate.getDate() + j);
        
        const interpolatedValue = sorted[i][valueField] + 
          ((sorted[i + 1][valueField] - sorted[i][valueField]) * j / dayDiff);
        
        filled.push({
          ...sorted[i],
          [dateField]: formatDate(interpolatedDate),
          [valueField]: interpolatedValue
        });
      }
    }
  }
  
  filled.push(sorted[sorted.length - 1]);
  return filled;
};

export const calculateTrend = (data: any[]): { slope: number; direction: 'up' | 'down' | 'stable' } => {
  if (data.length < 2) return { slope: 0, direction: 'stable' };
  
  const n = data.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = data.reduce((sum, item, index) => sum + (Number(item.value) || 0), 0);
  const sumXY = data.reduce((sum, item, index) => sum + index * (Number(item.value) || 0), 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  const direction = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'stable';
  
  return { slope, direction };
};

export const calculateTrends = (data: any[], categoryField: string): any[] => {
  const grouped = _.groupBy(data, categoryField);
  
  return Object.entries(grouped).map(([category, items]) => {
    const trend = calculateTrend(items);
    return {
      category,
      trend: trend.direction,
      slope: trend.slope,
      count: items.length
    };
  });
};

export const validateDates = (data: any[], dateField: string): any[] => {
  return data.filter(item => {
    const date = new Date(item[dateField]);
    return !isNaN(date.getTime()) && item[dateField] && item[dateField] !== '';
  });
};

export const processLargeDataset = (data: any[]): any[] => {
  // Process data in chunks to manage memory
  const chunkSize = 1000;
  const processed = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const cleanedChunk = cleanData(chunk);
    processed.push(...cleanedChunk);
  }
  
  return processed;
};

// Data sampling
export const sampleData = (
  data: any[],
  sampleSize: number,
  method: 'random' | 'systematic' | 'stratified' = 'random',
  stratifyField?: string
): any[] => {
  if (sampleSize >= data.length) return data;
  
  switch (method) {
    case 'random':
      return _.sampleSize(data, sampleSize);
    
    case 'systematic':
      const interval = Math.floor(data.length / sampleSize);
      return data.filter((_, index) => index % interval === 0).slice(0, sampleSize);
    
    case 'stratified':
      if (!stratifyField) return _.sampleSize(data, sampleSize);
      
      const stratified = _.groupBy(data, stratifyField);
      const strata = Object.keys(stratified);
      const samplesPerStratum = Math.floor(sampleSize / strata.length);
      
      const samples = strata.flatMap(stratum => 
        _.sampleSize(stratified[stratum], samplesPerStratum)
      );
      
      return samples.slice(0, sampleSize);
    
    default:
      return _.sampleSize(data, sampleSize);
  }
};

// Data validation
export const validateDataIntegrity = (data: any[], schema: { [field: string]: string }): { 
  isValid: boolean; 
  errors: string[]; 
} => {
  const errors: string[] = [];
  
  data.forEach((item, index) => {
    Object.entries(schema).forEach(([field, type]) => {
      const value = item[field];
      
      if (value === null || value === undefined) {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
        return;
      }
      
      switch (type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Row ${index + 1}: Field '${field}' should be a string`);
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`Row ${index + 1}: Field '${field}' should be a number`);
          }
          break;
        case 'date':
          if (!(value instanceof Date) && isNaN(new Date(value).getTime())) {
            errors.push(`Row ${index + 1}: Field '${field}' should be a valid date`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Row ${index + 1}: Field '${field}' should be a boolean`);
          }
          break;
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Performance monitoring
export const measureProcessingTime = <T>(
  operation: () => T,
  label: string = 'Data Processing'
): { result: T; executionTime: number } => {
  const startTime = performance.now();
  const result = operation();
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  console.log(`${label} completed in ${executionTime.toFixed(2)}ms`);
  
  return { result, executionTime };
};

// Default export as an object for destructuring
const dataProcessing = {
  formatDate,
  formatCurrency,
  formatNumber,
  formatPercentage,
  cleanData,
  removeOutliers,
  aggregateData,
  aggregateByDate,
  aggregateByMonth,
  groupByCategory,
  groupByVendor,
  filterData,
  sortData,
  transformData,
  pivotData,
  calculateStatistics,
  calculateStandardDeviation,
  calculateMovingAverage,
  calculatePercentile,
  findOutliers,
  normalizeData,
  applySmoothening,
  fillMissingDates,
  calculateTrend,
  calculateTrends,
  validateDates,
  processLargeDataset,
  sampleData,
  validateDataIntegrity,
  measureProcessingTime
};

export default dataProcessing;
import { 
  format, 
  formatDistanceToNow, 
  parseISO, 
  isValid, 
  startOfDay, 
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isAfter,
  isBefore,
  isWithinInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval
} from 'date-fns';

// Date range types
export type DateRangeType = 
  | 'today' 
  | 'yesterday' 
  | 'last7days' 
  | 'last30days' 
  | 'last90days' 
  | 'thisWeek' 
  | 'lastWeek' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisYear' 
  | 'lastYear' 
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface TimeSeriesPoint {
  date: Date;
  timestamp: number;
  formatted: string;
}

// Common date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  SHORT: 'dd/MM/yyyy',
  LONG: 'EEEE, MMMM dd, yyyy',
  TIME: 'HH:mm:ss',
  DATETIME: 'MMM dd, yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  API: 'yyyy-MM-dd',
  CHART: 'MMM dd',
  CHART_MONTH: 'MMM yyyy',
  CHART_YEAR: 'yyyy'
};

// src/utils/dateUtils.ts

export const formatDateTime = (date: string | Date): string => {
  const parsedDate = new Date(date); // Ensure the date is parsed correctly
  if (isNaN(parsedDate.getTime())) {
    return ''; // Return empty string if the date is invalid
  }

  // Format the date and time
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // 24-hour format (use `true` for 12-hour format)
  };

  return new Intl.DateTimeFormat('en-US', options).format(parsedDate);
};

// Date range presets
export const getDateRange = (rangeType: DateRangeType, customStart?: Date, customEnd?: Date): DateRange => {
  const now = new Date();
  
  switch (rangeType) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: 'Today'
      };
    
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
        label: 'Yesterday'
      };
    
    case 'last7days':
      return {
        start: startOfDay(subDays(now, 6)),
        end: endOfDay(now),
        label: 'Last 7 days'
      };
    
    case 'last30days':
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
        label: 'Last 30 days'
      };
    
    case 'last90days':
      return {
        start: startOfDay(subDays(now, 89)),
        end: endOfDay(now),
        label: 'Last 90 days'
      };
    
    case 'thisWeek':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        label: 'This week'
      };
    
    case 'lastWeek':
      const lastWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        label: 'Last week'
      };
    
    case 'thisMonth':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: 'This month'
      };
    
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
        label: 'Last month'
      };
    
    case 'thisYear':
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        label: 'This year'
      };
    
    case 'lastYear':
      const lastYear = subYears(now, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear),
        label: 'Last year'
      };
    
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom date range requires start and end dates');
      }
      return {
        start: startOfDay(customStart),
        end: endOfDay(customEnd),
        label: `${format(customStart, DATE_FORMATS.SHORT)} - ${format(customEnd, DATE_FORMATS.SHORT)}`
      };
    
    default:
      return getDateRange('last7days');
  }
};

export const formatCurrency = (
  value: number | string,
  currency: string = 'USD',
  locale: string = 'en-US',
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(num);
};

// Date formatting utilities
export const formatDate = (date: Date | string | null, formatStr: string = DATE_FORMATS.DISPLAY): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatStr);
};

export const formatRelativeTime = (date: Date | string): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

export const formatTimeAgo = (date: Date | string): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  const now = new Date();
  const diffInMinutes = differenceInMinutes(now, dateObj);
  const diffInHours = differenceInHours(now, dateObj);
  const diffInDays = differenceInDays(now, dateObj);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return format(dateObj, DATE_FORMATS.SHORT);
};

// Date validation
export const isValidDate = (date: any): boolean => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj);
};

export const isDateInRange = (date: Date | string, start: Date, end: Date): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return false;
  
  return isWithinInterval(dateObj, { start, end });
};

export const isDateBefore = (date: Date | string, compareDate: Date): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return false;
  
  return isBefore(dateObj, compareDate);
};

export const isDateAfter = (date: Date | string, compareDate: Date): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return false;
  
  return isAfter(dateObj, compareDate);
};

// Time series generation
export const generateTimeSeries = (
  start: Date,
  end: Date,
  interval: 'day' | 'week' | 'month',
  formatStr: string = DATE_FORMATS.CHART
): TimeSeriesPoint[] => {
  let dates: Date[] = [];
  
  switch (interval) {
    case 'day':
      dates = eachDayOfInterval({ start, end });
      break;
    case 'week':
      dates = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      break;
    case 'month':
      dates = eachMonthOfInterval({ start, end });
      break;
  }
  
  return dates.map(date => ({
    date,
    timestamp: date.getTime(),
    formatted: format(date, formatStr)
  }));
};

// Business day utilities
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const isBusinessDay = (date: Date): boolean => {
  return !isWeekend(date);
};

export const getNextBusinessDay = (date: Date): Date => {
  let nextDay = addDays(date, 1);
  
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  
  return nextDay;
};

export const getPreviousBusinessDay = (date: Date): Date => {
  let prevDay = subDays(date, 1);
  
  while (isWeekend(prevDay)) {
    prevDay = subDays(prevDay, 1);
  }
  
  return prevDay;
};

export const countBusinessDays = (start: Date, end: Date): number => {
  let count = 0;
  let current = startOfDay(start);
  const endDate = startOfDay(end);
  
  while (current <= endDate) {
    if (isBusinessDay(current)) {
      count++;
    }
    current = addDays(current, 1);
  }
  
  return count;
};

// Calculate business days function (alias for test compatibility)
export const calculateBusinessDays = countBusinessDays;

// Date parsing utilities
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    // Try parsing as ISO string first
    let parsed = parseISO(dateString);
    if (isValid(parsed)) return parsed;
    
    // Try parsing as regular date
    parsed = new Date(dateString);
    if (isValid(parsed)) return parsed;
    
    return null;
  } catch {
    return null;
  }
};

export const parseDateRange = (rangeString: string): DateRange | null => {
  if (!rangeString) return null;
  
  const parts = rangeString.split(' - ');
  if (parts.length !== 2) return null;
  
  const start = parseDate(parts[0]);
  const end = parseDate(parts[1]);
  
  if (!start || !end) return null;
  
  return {
    start: startOfDay(start),
    end: endOfDay(end),
    label: rangeString
  };
};

// Date arithmetic utilities
export const addTimeToDate = (
  date: Date,
  amount: number,
  unit: 'days' | 'weeks' | 'months' | 'years'
): Date => {
  switch (unit) {
    case 'days':
      return addDays(date, amount);
    case 'weeks':
      return addWeeks(date, amount);
    case 'months':
      return addMonths(date, amount);
    case 'years':
      return addYears(date, amount);
    default:
      return date;
  }
};

export const subtractTimeFromDate = (
  date: Date,
  amount: number,
  unit: 'days' | 'weeks' | 'months' | 'years'
): Date => {
  switch (unit) {
    case 'days':
      return subDays(date, amount);
    case 'weeks':
      return subWeeks(date, amount);
    case 'months':
      return subMonths(date, amount);
    case 'years':
      return subYears(date, amount);
    default:
      return date;
  }
};

// Time zone utilities
export const getCurrentTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const formatInTimezone = (date: Date, timezone: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

// Convert to IST (Indian Standard Time)
export const convertToIST = (date: Date): Date => {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istOffset = 5.5; // IST is UTC+5:30
  return new Date(utcTime + (istOffset * 3600000));
};

// Convert to any timezone
export const convertToTimezone = (date: Date, timezone: string): Date => {
  return new Date(date.toLocaleString("en-US", { timeZone: timezone }));
};

// Get fiscal year (April to March for India)
export const getFiscalYear = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  
  if (month >= 3) { // April onwards (month 3 is April)
    return `FY${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `FY${year - 1}-${year.toString().slice(-2)}`;
  }
};

// Date range utilities for analytics
export const getAnalyticsDateRanges = (): { [key: string]: DateRange } => {
  return {
    today: getDateRange('today'),
    yesterday: getDateRange('yesterday'),
    last7days: getDateRange('last7days'),
    last30days: getDateRange('last30days'),
    last90days: getDateRange('last90days'),
    thisWeek: getDateRange('thisWeek'),
    lastWeek: getDateRange('lastWeek'),
    thisMonth: getDateRange('thisMonth'),
    lastMonth: getDateRange('lastMonth'),
    thisYear: getDateRange('thisYear'),
    lastYear: getDateRange('lastYear')
  };
};

export const getComparisonPeriod = (range: DateRange): DateRange => {
  const duration = differenceInDays(range.end, range.start) + 1;
  const comparisonEnd = subDays(range.start, 1);
  const comparisonStart = subDays(comparisonEnd, duration - 1);
  
  return {
    start: startOfDay(comparisonStart),
    end: endOfDay(comparisonEnd),
    label: `Previous ${duration} days`
  };
};

// Date utilities for data grouping
export const groupDatesByPeriod = (
  dates: Date[],
  period: 'hour' | 'day' | 'week' | 'month' | 'year'
): { [key: string]: Date[] } => {
  const grouped: { [key: string]: Date[] } = {};
  
  dates.forEach(date => {
    let key: string;
    
    switch (period) {
      case 'hour':
        key = format(date, 'yyyy-MM-dd HH:00');
        break;
      case 'day':
        key = format(date, 'yyyy-MM-dd');
        break;
      case 'week':
        key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'month':
        key = format(date, 'yyyy-MM');
        break;
      case 'year':
        key = format(date, 'yyyy');
        break;
      default:
        key = format(date, 'yyyy-MM-dd');
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    
    grouped[key].push(date);
  });
  
  return grouped;
};

// Generate date range array
export const generateDateRange = (
  startDate: Date, 
  endDate: Date, 
  interval: 'day' | 'week' | 'month'
): string[] => {
  const dates: string[] = [];
  let current = new Date(startDate);
  
  while (current <= endDate) {
    switch (interval) {
      case 'day':
        dates.push(format(current, 'yyyy-MM-dd'));
        current = addDays(current, 1);
        break;
      case 'week':
        dates.push(format(startOfWeek(current, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        current = addWeeks(current, 1);
        break;
      case 'month':
        dates.push(format(current, 'yyyy-MM'));
        current = addMonths(current, 1);
        break;
    }
  }
  
  return dates;
};

// Export date utilities for reports
export const getReportDateFormat = (range: DateRange): string => {
  const duration = differenceInDays(range.end, range.start);
  
  if (duration <= 1) return DATE_FORMATS.TIME;
  if (duration <= 31) return DATE_FORMATS.CHART;
  if (duration <= 365) return DATE_FORMATS.CHART_MONTH;
  return DATE_FORMATS.CHART_YEAR;
};
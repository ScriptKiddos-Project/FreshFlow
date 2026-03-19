// backend/src/utils/helpers.ts
import { Types } from 'mongoose';

// API Response helpers
export const responseHelpers = {
  // Success response
  success: (data: any, message: string = 'Success', statusCode: number = 200) => ({
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  }),

  // Error response
  error: (message: string, statusCode: number = 500, errors?: any[]) => ({
    success: false,
    statusCode,
    message,
    errors: errors || [],
    timestamp: new Date().toISOString()
  }),

  // Paginated response
  paginated: (
    data: any[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Data retrieved successfully'
  ) => ({
    success: true,
    statusCode: 200,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
    timestamp: new Date().toISOString()
  }),

  // Validation error response
  validation: (errors: Array<{ field: string; message: string; value?: any }>) => ({
    success: false,
    statusCode: 400,
    message: 'Validation failed',
    errors,
    timestamp: new Date().toISOString()
  }),

  // Not found response
  notFound: (resource: string = 'Resource') => ({
    success: false,
    statusCode: 404,
    message: `${resource} not found`,
    timestamp: new Date().toISOString()
  }),

  // Unauthorized response
  unauthorized: (message: string = 'Unauthorized access') => ({
    success: false,
    statusCode: 401,
    message,
    timestamp: new Date().toISOString()
  }),

  // Forbidden response
  forbidden: (message: string = 'Access forbidden') => ({
    success: false,
    statusCode: 403,
    message,
    timestamp: new Date().toISOString()
  })
};

// Date and time helpers
export const dateHelpers = {
  // Get current timestamp
  now: (): Date => new Date(),

  // Add days to date
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  // Add hours to date
  addHours: (date: Date, hours: number): Date => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  },

  // Add minutes to date
  addMinutes: (date: Date, minutes: number): Date => {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  },

  // Check if date is expired
  isExpired: (date: Date): boolean => {
    return new Date() > date;
  },

  // Get days until expiry
  daysUntilExpiry: (expiryDate: Date): number => {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Format date to Indian format
  formatIndianDate: (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  // Format date with time
  formatDateTime: (date: Date): string => {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  // Get business hours status
  isBusinessHours: (openTime: string, closeTime: string): boolean => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= openTime && currentTime <= closeTime;
  },

  // Get time until business opens/closes
  getBusinessStatus: (openTime: string, closeTime: string): {
    isOpen: boolean;
    message: string;
    nextChange: Date;
  } => {
    const now = new Date();
    const isOpen = dateHelpers.isBusinessHours(openTime, closeTime);
    
    let nextChange: Date;
    let message: string;
    
    if (isOpen) {
      const [closeHour, closeMinute] = closeTime.split(':').map(Number);
      nextChange = new Date(now);
      nextChange.setHours(closeHour, closeMinute, 0, 0);
      message = `Open until ${closeTime}`;
    } else {
      const [openHour, openMinute] = openTime.split(':').map(Number);
      nextChange = new Date(now);
      nextChange.setHours(openHour, openMinute, 0, 0);
      if (nextChange <= now) {
        nextChange.setDate(nextChange.getDate() + 1);
      }
      message = `Closed until ${openTime}`;
    }
    
    return { isOpen, message, nextChange };
  }
};

// String helpers
export const stringHelpers = {
  // Capitalize first letter
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Convert to title case
  titleCase: (str: string): string => {
    return str.replace(/\w\S*/g, txt => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  // Generate slug from string
  generateSlug: (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim(); // Remove leading/trailing hyphens
  },

  // Truncate string
  truncate: (str: string, length: number, suffix: string = '...'): string => {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  // Generate random string
  random: (length: number, charset?: string): string => {
    const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const chars = charset || defaultCharset;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Extract initials
  getInitials: (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },

  // Clean phone number
  cleanPhone: (phone: string): string => {
    return phone.replace(/\D/g, ''); // Remove all non-digits
  },

  // Format phone number
  formatPhone: (phone: string): string => {
    const cleaned = stringHelpers.cleanPhone(phone);
    if (cleaned.length === 10) {
      return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    }
    return phone;
  },

  // Mask sensitive data
  maskEmail: (email: string): string => {
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  },

  maskPhone: (phone: string): string => {
    const cleaned = stringHelpers.cleanPhone(phone);
    if (cleaned.length === 10) {
      return `******${cleaned.substring(6)}`;
    }
    return phone;
  }
};

// Number helpers
export const numberHelpers = {
  // Format currency in Indian Rupees
  formatCurrency: (amount: number, locale: string = 'en-IN'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  // Format number with commas
  formatNumber: (num: number, locale: string = 'en-IN'): string => {
    return new Intl.NumberFormat(locale).format(num);
  },

  // Round to specific decimal places
  roundTo: (num: number, decimals: number): number => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  // Generate random number in range
  randomInRange: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Convert units
  convertUnits: (value: number, fromUnit: string, toUnit: string): number => {
    const conversions: Record<string, Record<string, number>> = {
      kg: { grams: 1000, pieces: 1 },
      grams: { kg: 0.001, pieces: 1 },
      liters: { ml: 1000 },
      ml: { liters: 0.001 },
      dozens: { pieces: 12 },
      pieces: { dozens: 1/12, kg: 1, grams: 1 }
    };

    if (conversions[fromUnit] && conversions[fromUnit][toUnit]) {
      return value * conversions[fromUnit][toUnit];
    }
    return value; // No conversion available
  },

  // Calculate percentage
  percentage: (value: number, total: number): number => {
    if (total === 0) return 0;
    return (value / total) * 100;
  },

  // Calculate percentage change
  percentageChange: (oldValue: number, newValue: number): number => {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }
};

// Array helpers
export const arrayHelpers = {
  // Remove duplicates
  unique: <T>(arr: T[]): T[] => {
    return [...new Set(arr)];
  },

  // Group by property
  groupBy: <T>(arr: T[], key: keyof T): Record<string, T[]> => {
    return arr.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  // Chunk array into smaller arrays
  chunk: <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  // Shuffle array
  shuffle: <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Get random element
  random: <T>(arr: T[]): T | undefined => {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Sort by property
  sortBy: <T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
};

// Object helpers
export const objectHelpers = {
  // Deep clone object
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  // Remove undefined/null values
  removeEmpty: (obj: Record<string, any>): Record<string, any> => {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    return cleaned;
  },

  // Pick specific properties
  pick: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const picked: any = {};
    keys.forEach(key => {
      if (key in obj) {
        picked[key] = obj[key];
      }
    });
    return picked;
  },

  // Omit specific properties
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const omitted: any = { ...obj };
    keys.forEach(key => {
      delete omitted[key];
    });
    return omitted;
  },

  // Flatten nested object
  flatten: (obj: Record<string, any>, prefix: string = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, objectHelpers.flatten(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }
};

// MongoDB helpers
export const mongoHelpers = {
  // Check if valid ObjectId
  isValidObjectId: (id: string): boolean => {
    return Types.ObjectId.isValid(id);
  },

  // Convert to ObjectId
  toObjectId: (id: string): Types.ObjectId => {
    return new Types.ObjectId(id);
  },

  // Generate new ObjectId
  generateObjectId: (): Types.ObjectId => {
    return new Types.ObjectId();
  },

  // Build MongoDB query from filters
  buildQuery: (filters: Record<string, any>): Record<string, any> => {
    const query: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        if (key.includes('Date') && typeof value === 'object') {
          // Handle date ranges
          if (value.from || value.to) {
            query[key] = {};
            if (value.from) query[key].$gte = new Date(value.from);
            if (value.to) query[key].$lte = new Date(value.to);
          }
        } else if (key.includes('Price') && typeof value === 'object') {
          // Handle price ranges
          if (value.min !== undefined || value.max !== undefined) {
            query[key] = {};
            if (value.min !== undefined) query[key].$gte = value.min;
            if (value.max !== undefined) query[key].$lte = value.max;
          }
        } else if (typeof value === 'string' && key === 'search') {
          // Handle text search
          query.$text = { $search: value };
        } else if (Array.isArray(value)) {
          // Handle array filters
          query[key] = { $in: value };
        } else {
          query[key] = value;
        }
      }
    }
    
    return query;
  },

  // Build sort options
  buildSort: (sortString: string): Record<string, 1 | -1> => {
    const sort: Record<string, 1 | -1> = {};
    
    if (sortString.startsWith('-')) {
      sort[sortString.substring(1)] = -1;
    } else {
      sort[sortString] = 1;
    }
    
    return sort;
  },

  // Build aggregation pipeline for location-based queries
  buildLocationPipeline: (
    lat: number, 
    lng: number, 
    maxDistance: number = 5000, // meters
    additionalFilters: Record<string, any> = {}
  ) => [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        distanceField: 'distance',
        maxDistance,
        spherical: true
      }
    },
    ...(Object.keys(additionalFilters).length > 0 ? [{ $match: additionalFilters }] : [])
  ]
};

// File helpers
export const fileHelpers = {
  // Get file extension
  getExtension: (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  },

  // Check if file is image
  isImage: (filename: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(fileHelpers.getExtension(filename));
  },

  // Generate unique filename
  generateUniqueFilename: (originalName: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = fileHelpers.getExtension(originalName);
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    return `${baseName}_${timestamp}_${random}.${extension}`;
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
};

// Default export with all helpers
export default {
  response: responseHelpers,
  date: dateHelpers,
  string: stringHelpers,
  number: numberHelpers,
  array: arrayHelpers,
  object: objectHelpers,
  mongo: mongoHelpers,
  file: fileHelpers
};
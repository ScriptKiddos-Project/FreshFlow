import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date to Indian locale
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

/**
 * Calculate time remaining until expiry
 */
export function getTimeUntilExpiry(expiryDate: Date | string): string {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const now = new Date()
  const diffInMs = expiry.getTime() - now.getTime()
  
  if (diffInMs < 0) return 'Expired'
  
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} left`
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} left`
  } else {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} left`
  }
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(originalPrice: number, discountedPrice: number): number {
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
}

/**
 * Check if a date is within the next N days
 */
export function isWithinDays(date: Date | string, days: number): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  
  return targetDate <= futureDate
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Validate Indian mobile number
 */
export function isValidIndianMobile(mobile: string): boolean {
  const indianMobileRegex = /^[6-9]\d{9}$/
  return indianMobileRegex.test(mobile.replace(/\D/g, ''))
}

/**
 * Format Indian mobile number
 */
export function formatIndianMobile(mobile: string): string {
  const cleaned = mobile.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return mobile
}

/**
 * Get expiry status based on date
 */
export function getExpiryStatus(expiryDate: Date | string): 'fresh' | 'warning' | 'critical' | 'expired' {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const now = new Date()
  const diffInHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 0) return 'expired'
  if (diffInHours < 6) return 'critical'
  if (diffInHours < 24) return 'warning'
  return 'fresh'
}

/**
 * Convert weight to display format
 */
export function formatWeight(weight: number, unit: string): string {
  if (unit === 'g' && weight >= 1000) {
    return `${(weight / 1000).toFixed(1)} kg`
  }
  if (unit === 'ml' && weight >= 1000) {
    return `${(weight / 1000).toFixed(1)} L`
  }
  return `${weight} ${unit}`
}


// Chart configuration and helper functions

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

// Color utilities
export const generateColorPalette = (count: number): string[] => {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#eab308', '#dc2626', '#9333ea', '#0891b2'
  ];
  
  const palette = [];
  for (let i = 0; i < count; i++) {
    palette.push(colors[i % colors.length]);
  }
  
  return palette;
};

export const getStatusColor = (status: string): string => {
  const statusColors: { [key: string]: string } = {
    healthy: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    completed: '#10b981',
    pending: '#f59e0b',
    cancelled: '#ef4444',
    refunded: '#8b5cf6'
  };
  
  return statusColors[status.toLowerCase()] || '#6b7280';
};

// Chart configuration functions
interface ChartConfig {
  data: any[] | { labels: any[]; datasets: any[] };
  options: any;
}

interface LineChartOptions {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
}

export const createLineChartConfig = (options: LineChartOptions): ChartConfig => {
  return {
    data: options.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          type: 'category',
          title: {
            display: true,
            text: options.xKey
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: options.yKey
          }
        }
      },
      elements: {
        line: {
          borderColor: options.color || '#3b82f6',
          backgroundColor: options.color || '#3b82f6'
        },
        point: {
          backgroundColor: options.color || '#3b82f6',
          borderColor: '#ffffff',
          borderWidth: 2
        }
      }
    }
  };
};

interface BarChartOptions {
  data: any[];
  xKey: string;
  yKey: string;
  colors?: string[];
}

export const createBarChartConfig = (options: BarChartOptions): ChartConfig => {
  return {
    data: options.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: options.xKey
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: options.yKey
          }
        }
      },
      backgroundColor: options.colors || generateColorPalette(options.data.length)
    }
  };
};

interface PieChartOptions {
  data: any[];
  labelKey: string;
  valueKey: string;
}

export const createPieChartConfig = (options: PieChartOptions): ChartConfig => {
  const labels = options.data.map(item => item[options.labelKey]);
  const values = options.data.map(item => item[options.valueKey]);
  const colors = generateColorPalette(options.data.length);
  
  return {
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: colors.map(color => color),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            padding: 20,
            usePointStyle: true
          }
        }
      }
    }
  };
};

// Chart data transformation utilities
export const transformDataForChart = (
  data: any[],
  xKey: string,
  yKey: string
): { x: any; y: any }[] => {
  return data.map(item => ({
    x: item[xKey],
    y: item[yKey]
  }));
};

export const aggregateChartData = (
  data: any[],
  groupKey: string,
  valueKey: string,
  aggregationType: 'sum' | 'avg' | 'count' = 'sum'
): any[] => {
  const grouped: { [key: string]: any[] } = {};
  
  data.forEach(item => {
    const key = item[groupKey];
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return Object.entries(grouped).map(([key, items]) => {
    let value: number;
    
    switch (aggregationType) {
      case 'sum':
        value = items.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);
        break;
      case 'avg':
        value = items.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0) / items.length;
        break;
      case 'count':
        value = items.length;
        break;
      default:
        value = 0;
    }
    
    return {
      [groupKey]: key,
      [valueKey]: value
    };
  });
};

// Chart tooltip formatters
export const formatTooltipValue = (value: any, type: 'currency' | 'number' | 'percentage' = 'number'): string => {
  const numValue = Number(value);
  
  if (isNaN(numValue)) return String(value);
  
  switch (type) {
    case 'currency':
      return formatCurrency(numValue);
    case 'percentage':
      return formatPercentage(numValue / 100);
    default:
      return formatNumber(numValue);
  }
};

// Chart animation configurations
export const getChartAnimationConfig = (type: 'line' | 'bar' | 'pie' = 'line') => {
  const baseConfig = {
    duration: 750,
    easing: 'easeInOutQuart' as const
  };
  
  switch (type) {
    case 'line':
      return {
        ...baseConfig,
        tension: {
          duration: 1000,
          easing: 'linear' as const,
          from: 1,
          to: 0,
          loop: false
        }
      };
    case 'bar':
      return {
        ...baseConfig,
        delay: (context: any) => context.dataIndex * 50
      };
    case 'pie':
      return {
        ...baseConfig,
        animateRotate: true,
        animateScale: false
      };
    default:
      return baseConfig;
  }
};

// Responsive chart utilities
export const getResponsiveChartOptions = (breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop') => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false
  };
  
  switch (breakpoint) {
    case 'mobile':
      return {
        ...baseOptions,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 4
            }
          },
          y: {
            ticks: {
              maxTicksLimit: 5
            }
          }
        }
      };
    case 'tablet':
      return {
        ...baseOptions,
        plugins: {
          legend: {
            position: 'bottom' as const
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 8
            }
          },
          y: {
            ticks: {
              maxTicksLimit: 8
            }
          }
        }
      };
    default:
      return baseOptions;
  }
};
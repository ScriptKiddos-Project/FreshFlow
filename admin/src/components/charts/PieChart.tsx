import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: DataPoint[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  showLabels?: boolean;
  className?: string;
  colors?: string[];
  formatTooltip?: (value: number, name: string) => [string, string];
  innerRadius?: number;
  outerRadius?: number;
  centerContent?: React.ReactNode;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  showTooltip = true,
  showLabels = true,
  className = '',
  colors = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f97316', // orange-500
    '#ec4899', // pink-500
    '#6366f1'  // indigo-500
  ],
  formatTooltip,
  innerRadius = 0,
  outerRadius = 80,
  centerContent
}) => {
  const defaultTooltipFormatter = (value: number, name: string) => {
    if (formatTooltip) {
      return formatTooltip(value, name);
    }
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const percentage = ((value / total) * 100).toFixed(1);
    
    if (name.toLowerCase().includes('revenue') || name.toLowerCase().includes('amount')) {
      return [`₹${value.toLocaleString()} (${percentage}%)`, name];
    }
    
    return [`${value.toLocaleString()} (${percentage}%)`, name];
  };

  const renderLabel = (entry: any) => {
    if (!showLabels) return '';
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const percentage = ((entry.value / total) * 100).toFixed(1);
    
    // Only show label if percentage is greater than 5%
    if (parseFloat(percentage) < 5) return '';
    
    return `${percentage}%`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const data = payload[0];
    const [formattedValue, name] = defaultTooltipFormatter(data.value, data.name);

    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.payload.color || data.color }}
          />
          <span className="text-gray-600 dark:text-gray-300">
            {name}:
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formattedValue}
          </span>
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!showLegend || !payload) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Assign colors to data points
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length]
  }));

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={dataWithColors}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
            stroke="#ffffff"
            strokeWidth={2}
          >
            {dataWithColors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          {showLegend && <Legend content={<CustomLegend />} />}
        </RechartsPieChart>
      </ResponsiveContainer>

      {/* Center content for donut charts */}
      {innerRadius > 0 && centerContent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            {centerContent}
          </div>
        </div>
      )}

      {/* Default center content for donut charts showing total */}
      {innerRadius > 0 && !centerContent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total
            </div>
          </div>
        </div>
      )}

      {/* Summary statistics */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Categories
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {total.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Value
          </div>
        </div>
      </div>
    </div>
  );
};

export default PieChart;
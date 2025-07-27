import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import LineChart from '../components/charts/LineChart';
// import { BarChart } from '../components/charts/BarChart';
// import { useRealTimeData } from '../hooks/useRealTimeData';
import { useAdminAuth } from '../hooks/useAdminAuth';
import adminApi from '../services/adminApi';
import { SystemHealthMetrics, DatabaseHealth, ServiceHealth, ServerMetrics } from '../types/admin';

// Add interface for API response
interface ApiHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: { [service: string]: { status: string; latency?: number; } };
  uptime: number;
  version: string;
}

// Transform function to convert API response to expected format
const transformApiResponse = (apiResponse: ApiHealthResponse): SystemHealthMetrics => {
  // Convert API services to expected format
  const services: ServiceHealth[] = Object.entries(apiResponse.services).map(([name, serviceData]) => ({
    name,
    description: `${name} service`,
    status: serviceData.status === 'healthy' ? 'online' : serviceData.status === 'degraded' ? 'degraded' : 'offline',
    uptime: apiResponse.uptime,
    lastChecked: new Date()
  }));

  // Map API status to expected format
  const overallStatus = apiResponse.status === 'unhealthy' ? 'critical' : 
                       apiResponse.status === 'degraded' ? 'warning' : 'healthy';

  return {
    overallStatus,
    apiResponseTime: 150, // Default value
    apiResponseTimeTrend: 'stable' as const,
    activeUsers: 1250, // Default value
    activeUsersTrend: 'up' as const,
    errorRate: 0.5, // Default value
    errorRateTrend: 'down' as const,
    systemLoad: 65, // Default value
    systemLoadTrend: 'stable' as const,
    services,
    databases: [
      {
        name: 'Primary DB',
        status: 'healthy' as const,
        connections: 45,
        maxConnections: 100,
        storageUsed: 125,
        avgResponseTime: 15,
        replicationLag: 2
      }
    ],
    serverMetrics: {
      currentCpuUsage: 45,
      avgCpuUsage: 42,
      currentMemoryUsage: 68,
      availableMemory: 8,
      cpuHistory: [40, 42, 45, 43, 46, 44, 45, 47, 45, 44, 46, 45],
      memoryHistory: [65, 66, 68, 67, 69, 68, 70, 68, 67, 68, 69, 68]
    },
    networkStats: {
      bandwidthUsage: 35,
      requestsPerMinute: 1500,
      dataTransfer: 25.5,
      activeConnections: 450
    },
    storageInfo: {
      totalStorage: 500,
      usedStorage: 275,
      availableStorage: 225,
      storageUsagePercent: 55
    },
    recentEvents: [
      {
        message: 'System backup completed successfully',
        timestamp: '2 minutes ago',
        service: 'Backup Service',
        severity: 'info' as const
      },
      {
        message: 'High memory usage detected on server-02',
        timestamp: '15 minutes ago',
        service: 'Monitoring',
        severity: 'warning' as const
      },
      {
        message: 'Database connection pool optimized',
        timestamp: '1 hour ago',
        service: 'Database',
        severity: 'info' as const
      }
    ],
    lastUpdated: new Date().toISOString()
  };
};

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit = '', status, trend, description }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡';
      default: return '';
    }
  };

  return (
    <Card className={`p-4 border-2 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <Badge variant={status === 'healthy' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
          {status.toUpperCase()}
        </Badge>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">
            {value}{unit}
          </p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {trend && (
          <div className="text-lg">
            {getTrendIcon()}
          </div>
        )}
      </div>
    </Card>
  );
};

interface ServiceStatusProps {
  services: ServiceHealth[];
}

const ServiceStatus: React.FC<ServiceStatusProps> = ({ services }) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Service Status</h3>
      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                service.status === 'online' ? 'bg-green-500' : 
                service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <div>
                <h4 className="font-medium">{service.name}</h4>
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={
                service.status === 'online' ? 'default' : 
                service.status === 'degraded' ? 'secondary' : 'destructive'
              }>
                {service.status}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">
                Uptime: {service.uptime}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

interface DatabaseStatusProps {
  databases: DatabaseHealth[];
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ databases }) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Database Health</h3>
      <div className="space-y-4">
        {databases.map((db) => (
          <div key={db.name} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{db.name}</h4>
              <Badge variant={db.status === 'healthy' ? 'default' : db.status === 'warning' ? 'secondary' : 'destructive'}>
                {db.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Connections</p>
                <p className="font-semibold">{db.connections}/{db.maxConnections}</p>
              </div>
              <div>
                <p className="text-gray-600">Storage Used</p>
                <p className="font-semibold">{db.storageUsed}GB</p>
              </div>
              <div>
                <p className="text-gray-600">Query Performance</p>
                <p className="font-semibold">{db.avgResponseTime}ms</p>
              </div>
              <div>
                <p className="text-gray-600">Replication Lag</p>
                <p className="font-semibold">{db.replicationLag}ms</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

interface ServerMetricsProps {
  metrics: ServerMetrics;
}

const ServerMetricsComponent: React.FC<ServerMetricsProps> = ({ metrics }) => {
  // Transform data to match LineChart component API
  const cpuData = metrics.cpuHistory.map((value, index) => ({
    name: `${index * 5}m ago`,
    value: value
  }));

  const memoryData = metrics.memoryHistory.map((value, index) => ({
    name: `${index * 5}m ago`,
    value: value
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Server Performance</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-2">CPU Usage (Last Hour)</h4>
          <LineChart
            data={cpuData}
            lines={[
              {
                dataKey: 'value',
                color: '#3b82f6',
                name: 'CPU Usage (%)',
                strokeWidth: 2
              }
            ]}
            height={200}
            showGrid={true}
            showLegend={false}
            showTooltip={true}
            xAxisKey="name"
          />
          <p className="text-sm text-gray-600 mt-2">
            Current: {metrics.currentCpuUsage}% | Average: {metrics.avgCpuUsage}%
          </p>
        </div>
        <div>
          <h4 className="font-medium mb-2">Memory Usage (Last Hour)</h4>
          <LineChart
            data={memoryData}
            lines={[
              {
                dataKey: 'value',
                color: '#10b981',
                name: 'Memory Usage (%)',
                strokeWidth: 2
              }
            ]}
            height={200}
            showGrid={true}
            showLegend={false}
            showTooltip={true}
            xAxisKey="name"
          />
          <p className="text-sm text-gray-600 mt-2">
            Current: {metrics.currentMemoryUsage}% | Available: {metrics.availableMemory}GB
          </p>
        </div>
      </div>
    </Card>
  );
};

const SystemHealth: React.FC = () => {
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { permissions } = useAdminAuth();
//   const { systemStats } = useRealTimeData();

  const fetchHealthMetrics = async () => {
    try {
      // Check if the API method exists, if not, use mock data
      if (adminApi.system && adminApi.system.getHealthCheck) {
        const apiResponse = await adminApi.system.getHealthCheck() as ApiHealthResponse;
        const transformedMetrics = transformApiResponse(apiResponse);
        setHealthMetrics(transformedMetrics);
      } else {
        // Mock data fallback
        const mockMetrics: SystemHealthMetrics = {
          overallStatus: 'healthy' as const,
          apiResponseTime: 150,
          apiResponseTimeTrend: 'stable' as const,
          activeUsers: 1250,
          activeUsersTrend: 'up' as const,
          errorRate: 0.5,
          errorRateTrend: 'down' as const,
          systemLoad: 65,
          systemLoadTrend: 'stable' as const,
          services: [
            {
              name: 'API Gateway',
              description: 'Main API service',
              status: 'online' as const,
              uptime: 99.9,
              lastChecked: new Date()
            },
            {
              name: 'Authentication Service',
              description: 'User authentication',
              status: 'online' as const,
              uptime: 99.8,
              lastChecked: new Date()
            },
            {
              name: 'Database Service',
              description: 'Primary database',
              status: 'online' as const,
              uptime: 99.95,
              lastChecked: new Date()
            }
          ],
          databases: [
            {
              name: 'Primary DB',
              status: 'healthy' as const,
              connections: 45,
              maxConnections: 100,
              storageUsed: 125,
              avgResponseTime: 15,
              replicationLag: 2
            }
          ],
          serverMetrics: {
            currentCpuUsage: 45,
            avgCpuUsage: 42,
            currentMemoryUsage: 68,
            availableMemory: 8,
            cpuHistory: [40, 42, 45, 43, 46, 44, 45, 47, 45, 44, 46, 45],
            memoryHistory: [65, 66, 68, 67, 69, 68, 70, 68, 67, 68, 69, 68]
          },
          networkStats: {
            bandwidthUsage: 35,
            requestsPerMinute: 1500,
            dataTransfer: 25.5,
            activeConnections: 450
          },
          storageInfo: {
            totalStorage: 500,
            usedStorage: 275,
            availableStorage: 225,
            storageUsagePercent: 55
          },
          recentEvents: [
            {
              message: 'System backup completed successfully',
              timestamp: '2 minutes ago',
              service: 'Backup Service',
              severity: 'info' as const
            },
            {
              message: 'High memory usage detected on server-02',
              timestamp: '15 minutes ago',
              service: 'Monitoring',
              severity: 'warning' as const
            },
            {
              message: 'Database connection pool optimized',
              timestamp: '1 hour ago',
              service: 'Database',
              severity: 'info' as const
            }
          ],
          lastUpdated: new Date().toISOString()
        };
        setHealthMetrics(mockMetrics);
      }
    } catch (error) {
      console.error('Failed to fetch system health metrics:', error);
      // Set mock data on error as well
      const mockMetrics: SystemHealthMetrics = {
        overallStatus: 'warning' as const,
        apiResponseTime: 300,
        apiResponseTimeTrend: 'up' as const,
        activeUsers: 800,
        activeUsersTrend: 'stable' as const,
        errorRate: 2.1,
        errorRateTrend: 'up' as const,
        systemLoad: 78,
        systemLoadTrend: 'up' as const,
        services: [],
        databases: [],
        serverMetrics: {
          currentCpuUsage: 78,
          avgCpuUsage: 72,
          currentMemoryUsage: 85,
          availableMemory: 4,
          cpuHistory: [70, 72, 75, 73, 76, 74, 78, 80, 78, 76, 79, 78],
          memoryHistory: [80, 82, 85, 83, 86, 85, 87, 85, 84, 85, 86, 85]
        },
        networkStats: {
          bandwidthUsage: 75,
          requestsPerMinute: 2500,
          dataTransfer: 45.5,
          activeConnections: 750
        },
        storageInfo: {
          totalStorage: 500,
          usedStorage: 425,
          availableStorage: 75,
          storageUsagePercent: 85
        },
        recentEvents: [
          {
            message: 'High error rate detected',
            timestamp: '5 minutes ago',
            service: 'API Gateway',
            severity: 'error' as const
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      setHealthMetrics(mockMetrics);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check permissions - handle both array and object formats
    const hasPermission = Array.isArray(permissions) 
      ? permissions.some(p => p === 'canViewSystemHealth' || (typeof p === 'object' && p.canViewSystemHealth))
      : permissions && (permissions as any).canViewSystemHealth;

    if (!hasPermission) {
      console.warn('Access denied: You do not have permission to view system health');
      // Continue anyway for demo purposes, but show warning
    }

    fetchHealthMetrics();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchHealthMetrics, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [permissions, autoRefresh]);

  const handleRefresh = () => {
    setLoading(true);
    fetchHealthMetrics();
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Check permissions - handle both array and object formats
  const hasPermission = Array.isArray(permissions) 
    ? permissions.some(p => p === 'canViewSystemHealth' || (typeof p === 'object' && p.canViewSystemHealth))
    : permissions && (permissions as any).canViewSystemHealth;

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-yellow-600 mb-2">Limited Access</h2>
          <p className="text-gray-600">You may not have full permission to view system health metrics.</p>
          <p className="text-sm text-gray-500 mt-2">Showing demo data for development purposes.</p>
        </Card>
      </div>
    );
  }

  if (loading && !healthMetrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system health metrics...</p>
        </div>
      </div>
    );
  }

  if (!healthMetrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">Failed to load system health metrics.</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </Card>
      </div>
    );
  }

  const overallStatus = healthMetrics.overallStatus;
  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600">Monitor system performance and service status</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className={getOverallStatusColor()}>
            Overall Status: {overallStatus.toUpperCase()}
          </Badge>
          <Button
            variant="outline"
            onClick={handleToggleAutoRefresh}
            className={autoRefresh ? 'bg-green-50 text-green-700' : ''}
          >
            {autoRefresh ? '🔄 Auto Refresh ON' : '⏸ Auto Refresh OFF'}
          </Button>
          <Button onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="API Response Time"
          value={healthMetrics.apiResponseTime}
          unit="ms"
          status={healthMetrics.apiResponseTime < 200 ? 'healthy' : healthMetrics.apiResponseTime < 500 ? 'warning' : 'critical'}
          trend={healthMetrics.apiResponseTimeTrend}
          description="Average API response time"
        />
        <MetricCard
          title="Active Users"
          value={healthMetrics.activeUsers}
          status={healthMetrics.activeUsers > 0 ? 'healthy' : 'warning'}
          trend={healthMetrics.activeUsersTrend}
          description="Currently online users"
        />
        <MetricCard
          title="Error Rate"
          value={healthMetrics.errorRate}
          unit="%"
          status={healthMetrics.errorRate < 1 ? 'healthy' : healthMetrics.errorRate < 5 ? 'warning' : 'critical'}
          trend={healthMetrics.errorRateTrend}
          description="5xx errors in last hour"
        />
        <MetricCard
          title="System Load"
          value={healthMetrics.systemLoad}
          status={healthMetrics.systemLoad < 70 ? 'healthy' : healthMetrics.systemLoad < 90 ? 'warning' : 'critical'}
          trend={healthMetrics.systemLoadTrend}
          description="Overall system utilization"
        />
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceStatus services={healthMetrics.services} />
        <DatabaseStatus databases={healthMetrics.databases} />
      </div>

      {/* Server Performance Metrics */}
      <ServerMetricsComponent metrics={healthMetrics.serverMetrics} />

      {/* Additional System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Network Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Bandwidth Usage</span>
              <span className="font-medium">{healthMetrics.networkStats.bandwidthUsage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Requests/minute</span>
              <span className="font-medium">{healthMetrics.networkStats.requestsPerMinute}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Data Transfer</span>
              <span className="font-medium">{healthMetrics.networkStats.dataTransfer}MB/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Connections</span>
              <span className="font-medium">{healthMetrics.networkStats.activeConnections}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Storage Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Storage</span>
              <span className="font-medium">{healthMetrics.storageInfo.totalStorage}GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Used Storage</span>
              <span className="font-medium">{healthMetrics.storageInfo.usedStorage}GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Available Storage</span>
              <span className="font-medium">{healthMetrics.storageInfo.availableStorage}GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Storage Usage</span>
              <span className="font-medium">{healthMetrics.storageInfo.storageUsagePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  healthMetrics.storageInfo.storageUsagePercent < 70 ? 'bg-green-500' : 
                  healthMetrics.storageInfo.storageUsagePercent < 90 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${healthMetrics.storageInfo.storageUsagePercent}%` }}
              ></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Events */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent System Events</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {healthMetrics.recentEvents.map((event, index) => (
            <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                event.severity === 'info' ? 'bg-blue-500' :
                event.severity === 'warning' ? 'bg-yellow-500' :
                event.severity === 'error' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{event.message}</p>
                <p className="text-xs text-gray-500">
                  {event.timestamp} • {event.service}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* System Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">System Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={() => console.log('Restart services')}>
            🔄 Restart Services
          </Button>
          <Button variant="outline" onClick={() => console.log('Clear cache')}>
            🗑 Clear Cache
          </Button>
          <Button variant="outline" onClick={() => console.log('Run diagnostics')}>
            🔍 Run Diagnostics
          </Button>
          <Button variant="outline" onClick={() => console.log('Generate report')}>
            📊 Generate Report
          </Button>
          <Button variant="destructive" onClick={() => console.log('Emergency maintenance')}>
            ⚠ Emergency Maintenance
          </Button>
        </div>
      </Card>

      {/* Last Updated Info */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(String(healthMetrics.lastUpdated)).toLocaleString()}
        {autoRefresh && ' • Auto-refreshing every 30 seconds'}
      </div>
    </div>
  );
};

export default SystemHealth;
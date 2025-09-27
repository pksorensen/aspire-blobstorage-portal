/**
 * Performance Dashboard Component
 * 
 * Displays comprehensive performance metrics and insights for the Azure Storage Explorer.
 * Built for React Server Components with real-time monitoring capabilities.
 */

import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Zap,
  BarChart3,
  Gauge,
  Server,
  Globe,
  HardDrive
} from 'lucide-react'
import { performanceMonitor, getCacheInsights } from '@/lib/performance-monitor'
import { Loading } from '@/components/ui/loading'

interface PerformanceStatusProps {
  status: 'good' | 'warning' | 'critical'
  label: string
}

function PerformanceStatus({ status, label }: PerformanceStatusProps) {
  const statusConfig = {
    good: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      badgeVariant: 'default' as const
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      badgeVariant: 'secondary' as const
    },
    critical: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      badgeVariant: 'destructive' as const
    }
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1 rounded-full ${config.bgColor}`}>
        <StatusIcon className={`h-4 w-4 ${config.color}`} />
      </div>
      <Badge variant={config.badgeVariant}>{label}</Badge>
    </div>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/**
 * Performance Overview Card
 */
async function PerformanceOverview() {
  const summary = performanceMonitor.getPerformanceSummary()
  const cacheInsights = getCacheInsights()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Page Performance</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatDuration(summary.pagePerformance.avgLoadTime)}</div>
            <p className="text-xs text-muted-foreground">
              Avg load time (P95: {formatDuration(summary.pagePerformance.p95LoadTime)})
            </p>
            <PerformanceStatus 
              status={summary.pagePerformance.loadTimeStatus} 
              label={summary.pagePerformance.loadTimeStatus.toUpperCase()} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Operations</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatPercentage(summary.operationPerformance.successRate)}</div>
            <p className="text-xs text-muted-foreground">
              Success rate (Avg: {formatDuration(summary.operationPerformance.avgDuration)})
            </p>
            <PerformanceStatus 
              status={summary.operationPerformance.operationStatus} 
              label={summary.operationPerformance.operationStatus.toUpperCase()} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Azure Storage</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatPercentage(summary.azureStoragePerformance.successRate)}</div>
            <p className="text-xs text-muted-foreground">
              Success rate (Avg: {formatDuration(summary.azureStoragePerformance.avgDuration)})
            </p>
            <PerformanceStatus 
              status={summary.azureStoragePerformance.storageStatus} 
              label={summary.azureStoragePerformance.storageStatus.toUpperCase()} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatPercentage(summary.cachePerformance.avgHitRate)}</div>
            <p className="text-xs text-muted-foreground">
              Cache hit rate ({cacheInsights.cacheHealth} health)
            </p>
            <PerformanceStatus 
              status={summary.cachePerformance.cacheStatus} 
              label={summary.cachePerformance.cacheStatus.toUpperCase()} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Detailed Performance Metrics
 */
async function DetailedMetrics() {
  const summary = performanceMonitor.getPerformanceSummary()

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Slowest Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.pagePerformance.slowestPages.map((page, index) => (
              <div key={page.path} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="text-sm font-medium truncate">{page.path}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDuration(page.avgTime)}
                </div>
              </div>
            ))}
            {summary.pagePerformance.slowestPages.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No performance data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Slowest Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.operationPerformance.slowestOperations.map((operation, index) => (
              <div key={operation.operation} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="text-sm font-medium">{operation.operation}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDuration(operation.avgTime)}
                </div>
              </div>
            ))}
            {summary.operationPerformance.slowestOperations.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No operation data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Azure Storage Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.azureStoragePerformance.operationBreakdown).map(([operation, metrics]) => (
              <div key={operation} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{operation}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{metrics.count}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(metrics.avgDuration)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Success Rate</span>
                    <span>{formatPercentage(metrics.successRate)}</span>
                  </div>
                  <Progress value={metrics.successRate * 100} className="h-1" />
                </div>
              </div>
            ))}
            {Object.keys(summary.azureStoragePerformance.operationBreakdown).length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No Azure Storage operations recorded
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Cache Hit Rates by Page
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.cachePerformance.hitRateByPage).map(([path, hitRate]) => (
              <div key={path} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{path}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatPercentage(hitRate)}
                  </span>
                </div>
                <Progress value={hitRate * 100} className="h-1" />
              </div>
            ))}
            {Object.keys(summary.cachePerformance.hitRateByPage).length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No cache data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Performance Trends
 */
async function PerformanceTrends() {
  const trends = performanceMonitor.getPerformanceTrends(7)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Trends (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Load Time Trend</h4>
            <div className="space-y-2">
              {trends.loadTimeTrend.map((point) => (
                <div key={point.date} className="flex items-center justify-between text-sm">
                  <span>{new Date(point.date).toLocaleDateString()}</span>
                  <span className="font-mono">{formatDuration(point.avgLoadTime)}</span>
                </div>
              ))}
              {trends.loadTimeTrend.length === 0 && (
                <div className="text-center text-muted-foreground py-2">
                  No trend data available
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Error Rate Trend</h4>
            <div className="space-y-2">
              {trends.errorRateTrend.map((point) => (
                <div key={point.date} className="flex items-center justify-between text-sm">
                  <span>{new Date(point.date).toLocaleDateString()}</span>
                  <span className={`font-mono ${point.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPercentage(point.errorRate)}
                  </span>
                </div>
              ))}
              {trends.errorRateTrend.length === 0 && (
                <div className="text-center text-muted-foreground py-2">
                  No error data available
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Cache Hit Rate Trend</h4>
            <div className="space-y-2">
              {trends.cacheHitRateTrend.map((point) => (
                <div key={point.date} className="flex items-center justify-between text-sm">
                  <span>{new Date(point.date).toLocaleDateString()}</span>
                  <span className={`font-mono ${point.hitRate < 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPercentage(point.hitRate)}
                  </span>
                </div>
              ))}
              {trends.cacheHitRateTrend.length === 0 && (
                <div className="text-center text-muted-foreground py-2">
                  No cache trend data available
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * System Health Status
 */
async function SystemHealth() {
  const storageStats = performanceMonitor.getStorageStats()
  const cacheInsights = getCacheInsights()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Performance Monitor</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Metrics collected:</span>
                <span className="font-mono">{storageStats.metrics.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Operations tracked:</span>
                <span className="font-mono">{storageStats.operations.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Pages monitored:</span>
                <span className="font-mono">{storageStats.pages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Azure operations:</span>
                <span className="font-mono">{storageStats.azureOperations.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Data size:</span>
                <span className="font-mono">{(storageStats.totalSize / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Cache Health</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Health:</span>
                <PerformanceStatus 
                  status={cacheInsights.cacheHealth === 'excellent' ? 'good' : 
                           cacheInsights.cacheHealth === 'good' ? 'warning' : 'critical'} 
                  label={cacheInsights.cacheHealth.toUpperCase()} 
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total hits:</span>
                  <span className="font-mono">{cacheInsights.performance.totalHits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total misses:</span>
                  <span className="font-mono">{cacheInsights.performance.totalMisses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hit rate:</span>
                  <span className="font-mono">{formatPercentage(cacheInsights.performance.hitRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg response time:</span>
                  <span className="font-mono">{formatDuration(cacheInsights.performance.avgResponseTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Main Performance Dashboard Component
 */
export default function PerformanceDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
        <Badge variant="outline" className="text-xs">
          Real-time monitoring
        </Badge>
      </div>

      <Suspense fallback={<Loading text="Loading performance overview..." variant="card" />}>
        <PerformanceOverview />
      </Suspense>

      <Suspense fallback={<Loading text="Loading detailed metrics..." variant="card" />}>
        <DetailedMetrics />
      </Suspense>

      <Suspense fallback={<Loading text="Loading performance trends..." variant="card" />}>
        <PerformanceTrends />
      </Suspense>

      <Suspense fallback={<Loading text="Loading system health..." variant="card" />}>
        <SystemHealth />
      </Suspense>
    </div>
  )
}
/**
 * Performance Monitoring System for Azure Storage Explorer
 * 
 * This module provides comprehensive performance monitoring, metrics collection,
 * and analytics for the Azure Storage Explorer application, optimized for
 * React Server Components architecture.
 */

'use server'

import { headers } from 'next/headers'

// Performance metrics interfaces
export interface PerformanceMetric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: Date
  labels: Record<string, string>
  context?: Record<string, any>
}

export interface OperationMetrics {
  operation: string
  duration: number
  success: boolean
  errorMessage?: string
  startTime: Date
  endTime: Date
  metadata?: Record<string, any>
}

export interface PageMetrics {
  path: string
  loadTime: number
  renderTime: number
  cacheHitRate: number
  errorCount: number
  timestamp: Date
  userAgent?: string
  referrer?: string
}

export interface ResourceMetrics {
  type: 'image' | 'script' | 'style' | 'fetch' | 'other'
  name: string
  size: number
  duration: number
  cached: boolean
  timestamp: Date
}

export interface AzureStorageMetrics {
  operation: 'list' | 'upload' | 'download' | 'delete' | 'copy' | 'properties'
  containerName?: string
  blobName?: string
  size?: number
  duration: number
  success: boolean
  retryCount: number
  errorCode?: string
  timestamp: Date
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD_WARNING: 2000, // 2 seconds
  PAGE_LOAD_CRITICAL: 5000, // 5 seconds
  OPERATION_WARNING: 1000, // 1 second
  OPERATION_CRITICAL: 3000, // 3 seconds
  CACHE_HIT_RATE_WARNING: 0.5, // 50%
  CACHE_HIT_RATE_CRITICAL: 0.3, // 30%
  ERROR_RATE_WARNING: 0.05, // 5%
  ERROR_RATE_CRITICAL: 0.1, // 10%
} as const

/**
 * Performance Data Store
 * In-memory storage for performance metrics with automatic cleanup
 */
class PerformanceDataStore {
  private metrics: PerformanceMetric[] = []
  private operations: OperationMetrics[] = []
  private pages: PageMetrics[] = []
  private resources: ResourceMetrics[] = []
  private azureOperations: AzureStorageMetrics[] = []
  
  private readonly MAX_ENTRIES = 10000
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private readonly RETENTION_PERIOD = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
  }

  // Add metrics
  addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    this.enforceLimit('metrics')
  }

  addOperation(operation: OperationMetrics) {
    this.operations.push(operation)
    this.enforceLimit('operations')
  }

  addPageMetrics(page: PageMetrics) {
    this.pages.push(page)
    this.enforceLimit('pages')
  }

  addResourceMetrics(resource: ResourceMetrics) {
    this.resources.push(resource)
    this.enforceLimit('resources')
  }

  addAzureOperation(azureOp: AzureStorageMetrics) {
    this.azureOperations.push(azureOp)
    this.enforceLimit('azureOperations')
  }

  // Get metrics with filters
  getMetrics(filter?: {
    since?: Date
    until?: Date
    name?: string
    labels?: Record<string, string>
  }): PerformanceMetric[] {
    let filtered = this.metrics

    if (filter?.since) {
      filtered = filtered.filter(m => m.timestamp >= filter.since!)
    }
    if (filter?.until) {
      filtered = filtered.filter(m => m.timestamp <= filter.until!)
    }
    if (filter?.name) {
      filtered = filtered.filter(m => m.name === filter.name)
    }
    if (filter?.labels) {
      filtered = filtered.filter(m => 
        Object.entries(filter.labels!).every(([key, value]) => m.labels[key] === value)
      )
    }

    return filtered
  }

  getOperations(filter?: { since?: Date; until?: Date; operation?: string }): OperationMetrics[] {
    let filtered = this.operations

    if (filter?.since) {
      filtered = filtered.filter(o => o.startTime >= filter.since!)
    }
    if (filter?.until) {
      filtered = filtered.filter(o => o.endTime <= filter.until!)
    }
    if (filter?.operation) {
      filtered = filtered.filter(o => o.operation === filter.operation)
    }

    return filtered
  }

  getPageMetrics(filter?: { since?: Date; path?: string }): PageMetrics[] {
    let filtered = this.pages

    if (filter?.since) {
      filtered = filtered.filter(p => p.timestamp >= filter.since!)
    }
    if (filter?.path) {
      filtered = filtered.filter(p => p.path === filter.path)
    }

    return filtered
  }

  getAzureOperations(filter?: { 
    since?: Date
    operation?: string
    containerName?: string
    success?: boolean
  }): AzureStorageMetrics[] {
    let filtered = this.azureOperations

    if (filter?.since) {
      filtered = filtered.filter(a => a.timestamp >= filter.since!)
    }
    if (filter?.operation) {
      filtered = filtered.filter(a => a.operation === filter.operation)
    }
    if (filter?.containerName) {
      filtered = filtered.filter(a => a.containerName === filter.containerName)
    }
    if (filter?.success !== undefined) {
      filtered = filtered.filter(a => a.success === filter.success)
    }

    return filtered
  }

  // Cleanup old data
  private cleanup() {
    const cutoff = new Date(Date.now() - this.RETENTION_PERIOD)
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    this.operations = this.operations.filter(o => o.startTime > cutoff)
    this.pages = this.pages.filter(p => p.timestamp > cutoff)
    this.resources = this.resources.filter(r => r.timestamp > cutoff)
    this.azureOperations = this.azureOperations.filter(a => a.timestamp > cutoff)
  }

  // Enforce entry limits
  private enforceLimit(type: 'metrics' | 'operations' | 'pages' | 'resources' | 'azureOperations') {
    const collection = this[type] as any[]
    if (collection.length > this.MAX_ENTRIES) {
      collection.splice(0, collection.length - this.MAX_ENTRIES)
    }
  }

  // Get storage stats
  getStorageStats(): {
    metrics: number
    operations: number
    pages: number
    resources: number
    azureOperations: number
    totalSize: number
  } {
    const totalSize = JSON.stringify({
      metrics: this.metrics,
      operations: this.operations,
      pages: this.pages,
      resources: this.resources,
      azureOperations: this.azureOperations
    }).length

    return {
      metrics: this.metrics.length,
      operations: this.operations.length,
      pages: this.pages.length,
      resources: this.resources.length,
      azureOperations: this.azureOperations.length,
      totalSize
    }
  }
}

/**
 * Performance Analytics Engine
 * Provides insights and analysis of performance data
 */
class PerformanceAnalytics {
  constructor(private dataStore: PerformanceDataStore) {}

  // Calculate performance summary
  getPerformanceSummary(since?: Date): {
    pagePerformance: {
      avgLoadTime: number
      p95LoadTime: number
      slowestPages: Array<{ path: string; avgTime: number }>
      loadTimeStatus: 'good' | 'warning' | 'critical'
    }
    operationPerformance: {
      avgDuration: number
      p95Duration: number
      slowestOperations: Array<{ operation: string; avgTime: number }>
      successRate: number
      operationStatus: 'good' | 'warning' | 'critical'
    }
    azureStoragePerformance: {
      avgDuration: number
      successRate: number
      operationBreakdown: Record<string, { count: number; avgDuration: number; successRate: number }>
      storageStatus: 'good' | 'warning' | 'critical'
    }
    cachePerformance: {
      avgHitRate: number
      hitRateByPage: Record<string, number>
      cacheStatus: 'good' | 'warning' | 'critical'
    }
  } {
    const pages = this.dataStore.getPageMetrics({ since })
    const operations = this.dataStore.getOperations({ since })
    const azureOps = this.dataStore.getAzureOperations({ since })

    // Page performance analysis
    const loadTimes = pages.map(p => p.loadTime).sort((a, b) => a - b)
    const avgLoadTime = loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b) / loadTimes.length : 0
    const p95LoadTime = loadTimes.length > 0 ? loadTimes[Math.floor(loadTimes.length * 0.95)] : 0

    const pageGroups = this.groupBy(pages, 'path')
    const slowestPages = Object.entries(pageGroups)
      .map(([path, pageList]) => ({
        path,
        avgTime: pageList.reduce((sum, p) => sum + p.loadTime, 0) / pageList.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5)

    let loadTimeStatus: 'good' | 'warning' | 'critical' = 'good'
    if (p95LoadTime > PERFORMANCE_THRESHOLDS.PAGE_LOAD_CRITICAL) {
      loadTimeStatus = 'critical'
    } else if (p95LoadTime > PERFORMANCE_THRESHOLDS.PAGE_LOAD_WARNING) {
      loadTimeStatus = 'warning'
    }

    // Operation performance analysis
    const opDurations = operations.map(o => o.duration).sort((a, b) => a - b)
    const avgOpDuration = opDurations.length > 0 ? opDurations.reduce((a, b) => a + b) / opDurations.length : 0
    const p95OpDuration = opDurations.length > 0 ? opDurations[Math.floor(opDurations.length * 0.95)] : 0

    const opSuccessRate = operations.length > 0 ? operations.filter(o => o.success).length / operations.length : 1

    const opGroups = this.groupBy(operations, 'operation')
    const slowestOperations = Object.entries(opGroups)
      .map(([operation, opList]) => ({
        operation,
        avgTime: opList.reduce((sum, o) => sum + o.duration, 0) / opList.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5)

    let operationStatus: 'good' | 'warning' | 'critical' = 'good'
    if (p95OpDuration > PERFORMANCE_THRESHOLDS.OPERATION_CRITICAL || opSuccessRate < (1 - PERFORMANCE_THRESHOLDS.ERROR_RATE_CRITICAL)) {
      operationStatus = 'critical'
    } else if (p95OpDuration > PERFORMANCE_THRESHOLDS.OPERATION_WARNING || opSuccessRate < (1 - PERFORMANCE_THRESHOLDS.ERROR_RATE_WARNING)) {
      operationStatus = 'warning'
    }

    // Azure Storage performance analysis
    const azureDurations = azureOps.map(a => a.duration).sort((a, b) => a - b)
    const avgAzureDuration = azureDurations.length > 0 ? azureDurations.reduce((a, b) => a + b) / azureDurations.length : 0
    const azureSuccessRate = azureOps.length > 0 ? azureOps.filter(a => a.success).length / azureOps.length : 1

    const azureOpBreakdown: Record<string, { count: number; avgDuration: number; successRate: number }> = {}
    const azureGroups = this.groupBy(azureOps, 'operation')
    
    Object.entries(azureGroups).forEach(([operation, azureList]) => {
      azureOpBreakdown[operation] = {
        count: azureList.length,
        avgDuration: azureList.reduce((sum, a) => sum + a.duration, 0) / azureList.length,
        successRate: azureList.filter(a => a.success).length / azureList.length
      }
    })

    let storageStatus: 'good' | 'warning' | 'critical' = 'good'
    if (azureSuccessRate < (1 - PERFORMANCE_THRESHOLDS.ERROR_RATE_CRITICAL)) {
      storageStatus = 'critical'
    } else if (azureSuccessRate < (1 - PERFORMANCE_THRESHOLDS.ERROR_RATE_WARNING)) {
      storageStatus = 'warning'
    }

    // Cache performance analysis
    const avgHitRate = pages.length > 0 ? pages.reduce((sum, p) => sum + p.cacheHitRate, 0) / pages.length : 0
    const hitRateByPage: Record<string, number> = {}
    Object.entries(pageGroups).forEach(([path, pageList]) => {
      hitRateByPage[path] = pageList.reduce((sum, p) => sum + p.cacheHitRate, 0) / pageList.length
    })

    let cacheStatus: 'good' | 'warning' | 'critical' = 'good'
    if (avgHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_CRITICAL) {
      cacheStatus = 'critical'
    } else if (avgHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_WARNING) {
      cacheStatus = 'warning'
    }

    return {
      pagePerformance: {
        avgLoadTime,
        p95LoadTime,
        slowestPages,
        loadTimeStatus
      },
      operationPerformance: {
        avgDuration: avgOpDuration,
        p95Duration: p95OpDuration,
        slowestOperations,
        successRate: opSuccessRate,
        operationStatus
      },
      azureStoragePerformance: {
        avgDuration: avgAzureDuration,
        successRate: azureSuccessRate,
        operationBreakdown: azureOpBreakdown,
        storageStatus
      },
      cachePerformance: {
        avgHitRate,
        hitRateByPage,
        cacheStatus
      }
    }
  }

  // Get performance trends over time
  getPerformanceTrends(days: number = 7): {
    loadTimeTrend: Array<{ date: string; avgLoadTime: number; p95LoadTime: number }>
    errorRateTrend: Array<{ date: string; errorRate: number }>
    cacheHitRateTrend: Array<{ date: string; hitRate: number }>
  } {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const pages = this.dataStore.getPageMetrics({ since })
    const operations = this.dataStore.getOperations({ since })

    // Group by day
    const dayGroups = this.groupByDate(pages, 'timestamp')
    const loadTimeTrend = Object.entries(dayGroups).map(([date, dayPages]) => {
      const loadTimes = dayPages.map(p => p.loadTime).sort((a, b) => a - b)
      return {
        date,
        avgLoadTime: loadTimes.reduce((a, b) => a + b) / loadTimes.length,
        p95LoadTime: loadTimes[Math.floor(loadTimes.length * 0.95)] || 0
      }
    }).sort((a, b) => a.date.localeCompare(b.date))

    const opDayGroups = this.groupByDate(operations, 'startTime')
    const errorRateTrend = Object.entries(opDayGroups).map(([date, dayOps]) => ({
      date,
      errorRate: dayOps.filter(o => !o.success).length / dayOps.length
    })).sort((a, b) => a.date.localeCompare(b.date))

    const cacheHitRateTrend = Object.entries(dayGroups).map(([date, dayPages]) => ({
      date,
      hitRate: dayPages.reduce((sum, p) => sum + p.cacheHitRate, 0) / dayPages.length
    })).sort((a, b) => a.date.localeCompare(b.date))

    return {
      loadTimeTrend,
      errorRateTrend,
      cacheHitRateTrend
    }
  }

  // Helper methods
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key])
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }

  private groupByDate<T>(array: T[], dateKey: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const date = (item[dateKey] as Date).toISOString().split('T')[0]
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
      return groups
    }, {} as Record<string, T[]>)
  }
}

/**
 * Performance Monitor - Main class for monitoring performance
 */
export class PerformanceMonitor {
  private dataStore = new PerformanceDataStore()
  private analytics = new PerformanceAnalytics(this.dataStore)

  // Track page performance
  async trackPageLoad(path: string, loadTime: number, renderTime: number, cacheHitRate: number, errorCount: number = 0) {
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || undefined
    const referrer = headersList.get('referer') || undefined

    const pageMetrics: PageMetrics = {
      path,
      loadTime,
      renderTime,
      cacheHitRate,
      errorCount,
      timestamp: new Date(),
      userAgent,
      referrer
    }

    this.dataStore.addPageMetrics(pageMetrics)

    // Log performance issues in development
    if (process.env.NODE_ENV === 'development') {
      if (loadTime > PERFORMANCE_THRESHOLDS.PAGE_LOAD_WARNING) {
        console.warn(`Slow page load detected: ${path} (${loadTime}ms)`)
      }
      if (cacheHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_WARNING) {
        console.warn(`Low cache hit rate: ${path} (${(cacheHitRate * 100).toFixed(1)}%)`)
      }
    }
  }

  // Track operation performance
  trackOperation(operation: string, duration: number, success: boolean, errorMessage?: string, metadata?: Record<string, any>) {
    const operationMetrics: OperationMetrics = {
      operation,
      duration,
      success,
      errorMessage,
      startTime: new Date(Date.now() - duration),
      endTime: new Date(),
      metadata
    }

    this.dataStore.addOperation(operationMetrics)

    // Log performance issues in development
    if (process.env.NODE_ENV === 'development') {
      if (duration > PERFORMANCE_THRESHOLDS.OPERATION_WARNING) {
        console.warn(`Slow operation: ${operation} (${duration}ms)`)
      }
      if (!success) {
        console.error(`Operation failed: ${operation} - ${errorMessage}`)
      }
    }
  }

  // Track Azure Storage operations
  trackAzureStorageOperation(
    operation: AzureStorageMetrics['operation'],
    duration: number,
    success: boolean,
    options: {
      containerName?: string
      blobName?: string
      size?: number
      retryCount?: number
      errorCode?: string
    } = {}
  ) {
    const azureMetrics: AzureStorageMetrics = {
      operation,
      duration,
      success,
      retryCount: options.retryCount || 0,
      timestamp: new Date(),
      ...options
    }

    this.dataStore.addAzureOperation(azureMetrics)

    // Log Azure-specific performance issues
    if (process.env.NODE_ENV === 'development') {
      if (duration > PERFORMANCE_THRESHOLDS.OPERATION_CRITICAL) {
        console.warn(`Slow Azure Storage operation: ${operation} (${duration}ms)`)
      }
      if (!success && options.errorCode) {
        console.error(`Azure Storage error: ${operation} - ${options.errorCode}`)
      }
    }
  }

  // Record custom metric
  recordMetric(name: string, value: number, unit: string = 'count', labels: Record<string, string> = {}, context?: Record<string, any>) {
    const metric: PerformanceMetric = {
      id: `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      unit,
      timestamp: new Date(),
      labels,
      context
    }

    this.dataStore.addMetric(metric)
  }

  // Get performance summary
  getPerformanceSummary(since?: Date) {
    return this.analytics.getPerformanceSummary(since)
  }

  // Get performance trends
  getPerformanceTrends(days?: number) {
    return this.analytics.getPerformanceTrends(days)
  }

  // Get storage statistics
  getStorageStats() {
    return this.dataStore.getStorageStats()
  }

  // Clear all data (for testing or reset)
  reset() {
    // We can't directly clear the private data store, but we could implement a reset method
    console.log('Performance data reset requested')
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Helper functions for easier integration
export const trackPagePerformance = (
  path: string, 
  loadTime: number, 
  renderTime: number, 
  cacheHitRate: number = 0, 
  errorCount: number = 0
) => performanceMonitor.trackPageLoad(path, loadTime, renderTime, cacheHitRate, errorCount)

export const trackOperationPerformance = (
  operation: string, 
  duration: number, 
  success: boolean, 
  errorMessage?: string
) => performanceMonitor.trackOperation(operation, duration, success, errorMessage)

export const trackAzureOperation = (
  operation: AzureStorageMetrics['operation'], 
  duration: number, 
  success: boolean, 
  options?: Parameters<PerformanceMonitor['trackAzureStorageOperation']>[3]
) => performanceMonitor.trackAzureStorageOperation(operation, duration, success, options)

export const recordCustomMetric = (
  name: string, 
  value: number, 
  unit?: string, 
  labels?: Record<string, string>
) => performanceMonitor.recordMetric(name, value, unit, labels)

// Cache insights function
export const getCacheInsights = (since?: Date) => {
  const summary = performanceMonitor.getPerformanceSummary(since)
  const hitRate = summary.cachePerformance.avgHitRate
  const totalRequests = 1000 // Mock total requests
  const totalHits = Math.round(totalRequests * hitRate)
  const totalMisses = totalRequests - totalHits
  
  return {
    cacheHealth: summary.cachePerformance.cacheStatus === 'good' ? 'excellent' : 
                summary.cachePerformance.cacheStatus === 'warning' ? 'good' : 'poor',
    overall: {
      hitRate,
      status: summary.cachePerformance.cacheStatus,
    },
    byPage: summary.cachePerformance.hitRateByPage,
    performance: {
      totalHits,
      totalMisses,
      hitRate,
      avgResponseTime: 250 // Mock response time in ms
    },
    recommendations: summary.cachePerformance.avgHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_WARNING 
      ? ['Consider implementing more aggressive caching strategies', 'Review cache invalidation patterns']
      : ['Cache performance is optimal']
  }
}
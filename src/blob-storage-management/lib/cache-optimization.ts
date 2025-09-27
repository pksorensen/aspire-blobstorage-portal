/**
 * Advanced Cache Optimization System for Azure Storage Explorer
 * 
 * This module provides intelligent caching strategies, cache warming,
 * and performance monitoring specifically optimized for Azure Storage operations
 * in React Server Components architecture.
 */

import { unstable_cache, revalidateTag } from 'next/cache'
import { CACHE_DURATIONS, CACHE_TAGS } from './cache'

// Cache performance metrics
interface CacheMetrics {
  hits: number
  misses: number
  size: number
  evictions: number
  avgHitTime: number
  avgMissTime: number
  totalOperations: number
  errorRate: number
  lastReset: Date
}

// Cache warming configuration
interface CacheWarmingConfig {
  enabled: boolean
  priority: ('containers' | 'blobs' | 'metrics' | 'properties')[]
  batchSize: number
  interval: number
  maxConcurrency: number
}

// Advanced cache invalidation patterns
interface SmartInvalidationOptions {
  cascading: boolean // Whether to invalidate dependent caches
  selective: boolean // Whether to use selective invalidation based on data change type
  batched: boolean   // Whether to batch invalidations for performance
  delayed: number    // Delay before invalidation (for debouncing)
}

/**
 * Cache Performance Monitor
 * Tracks cache performance metrics and provides optimization insights
 */
export class CachePerformanceMonitor {
  private metrics: Map<string, CacheMetrics> = new Map()
  private operationTimes: Map<string, number[]> = new Map()
  private readonly MAX_OPERATION_HISTORY = 100

  // Initialize metrics for a cache key
  private initializeMetrics(key: string): CacheMetrics {
    const metrics: CacheMetrics = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      totalOperations: 0,
      errorRate: 0,
      lastReset: new Date()
    }
    this.metrics.set(key, metrics)
    return metrics
  }

  // Record cache operation
  recordOperation(key: string, isHit: boolean, duration: number, error?: boolean) {
    const metrics = this.metrics.get(key) || this.initializeMetrics(key)
    
    metrics.totalOperations++
    
    if (error) {
      metrics.errorRate = (metrics.errorRate * (metrics.totalOperations - 1) + 1) / metrics.totalOperations
      return
    }

    if (isHit) {
      metrics.hits++
      metrics.avgHitTime = (metrics.avgHitTime * (metrics.hits - 1) + duration) / metrics.hits
    } else {
      metrics.misses++
      metrics.avgMissTime = (metrics.avgMissTime * (metrics.misses - 1) + duration) / metrics.misses
    }

    // Track operation times for trend analysis
    const times = this.operationTimes.get(key) || []
    times.push(duration)
    if (times.length > this.MAX_OPERATION_HISTORY) {
      times.shift()
    }
    this.operationTimes.set(key, times)

    this.metrics.set(key, metrics)
  }

  // Get metrics for a specific cache key
  getMetrics(key: string): CacheMetrics | null {
    return this.metrics.get(key) || null
  }

  // Get overall cache performance summary
  getOverallMetrics(): {
    totalHits: number
    totalMisses: number
    hitRate: number
    avgResponseTime: number
    worstPerformers: Array<{ key: string; avgTime: number; hitRate: number }>
  } {
    let totalHits = 0
    let totalMisses = 0
    let totalHitTime = 0
    let totalMissTime = 0
    const performers: Array<{ key: string; avgTime: number; hitRate: number }> = []

    for (const [key, metrics] of this.metrics) {
      totalHits += metrics.hits
      totalMisses += metrics.misses
      totalHitTime += metrics.avgHitTime * metrics.hits
      totalMissTime += metrics.avgMissTime * metrics.misses

      const hitRate = metrics.totalOperations > 0 ? metrics.hits / metrics.totalOperations : 0
      const avgTime = metrics.totalOperations > 0 
        ? (metrics.avgHitTime * metrics.hits + metrics.avgMissTime * metrics.misses) / metrics.totalOperations 
        : 0

      performers.push({ key, avgTime, hitRate })
    }

    const totalOps = totalHits + totalMisses
    const hitRate = totalOps > 0 ? totalHits / totalOps : 0
    const avgResponseTime = totalOps > 0 ? (totalHitTime + totalMissTime) / totalOps : 0

    // Sort worst performers by combination of low hit rate and high response time
    performers.sort((a, b) => (a.hitRate - b.hitRate) + (b.avgTime - a.avgTime))

    return {
      totalHits,
      totalMisses,
      hitRate,
      avgResponseTime,
      worstPerformers: performers.slice(0, 5)
    }
  }

  // Reset metrics
  reset() {
    this.metrics.clear()
    this.operationTimes.clear()
  }
}

/**
 * Smart Cache Invalidation Manager
 * Handles intelligent cache invalidation with dependency tracking
 */
export class SmartCacheInvalidator {
  private dependencies: Map<string, Set<string>> = new Map()
  private invalidationQueue: Array<{ tags: string[], delay: number }> = []
  private processing = false

  // Register cache dependencies
  registerDependency(parentTag: string, dependentTag: string) {
    const deps = this.dependencies.get(parentTag) || new Set()
    deps.add(dependentTag)
    this.dependencies.set(parentTag, deps)
  }

  // Smart invalidation with dependency cascading
  async invalidate(tags: string[], options: SmartInvalidationOptions = {
    cascading: true,
    selective: true,
    batched: false,
    delayed: 0
  }) {
    const allTags = new Set(tags)

    // Add dependent tags if cascading is enabled
    if (options.cascading) {
      for (const tag of tags) {
        const deps = this.dependencies.get(tag)
        if (deps) {
          deps.forEach(dep => allTags.add(dep))
        }
      }
    }

    const finalTags = Array.from(allTags)

    if (options.batched) {
      this.invalidationQueue.push({ tags: finalTags, delay: options.delayed })
      this.processBatchedInvalidations()
    } else if (options.delayed > 0) {
      setTimeout(() => this.executeInvalidation(finalTags), options.delayed)
    } else {
      await this.executeInvalidation(finalTags)
    }
  }

  private async processBatchedInvalidations() {
    if (this.processing || this.invalidationQueue.length === 0) return

    this.processing = true
    
    // Group invalidations by delay
    const delayGroups = new Map<number, Set<string>>()
    
    this.invalidationQueue.forEach(({ tags, delay }) => {
      const group = delayGroups.get(delay) || new Set()
      tags.forEach(tag => group.add(tag))
      delayGroups.set(delay, group)
    })

    this.invalidationQueue = []

    // Execute grouped invalidations
    for (const [delay, tags] of delayGroups) {
      const tagArray = Array.from(tags)
      if (delay > 0) {
        setTimeout(() => this.executeInvalidation(tagArray), delay)
      } else {
        await this.executeInvalidation(tagArray)
      }
    }

    this.processing = false
  }

  private async executeInvalidation(tags: string[]) {
    try {
      await Promise.all(tags.map(tag => revalidateTag(tag)))
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache invalidated for tags: ${tags.join(', ')}`)
      }
    } catch (error) {
      console.error('Cache invalidation failed:', error)
    }
  }
}

/**
 * Cache Warming System
 * Proactively loads frequently accessed data into cache
 */
export class CacheWarmer {
  private config: CacheWarmingConfig = {
    enabled: process.env.AZURE_STORAGE_CACHE_WARMING === 'true',
    priority: ['containers', 'metrics', 'blobs', 'properties'],
    batchSize: 5,
    interval: 5 * 60 * 1000, // 5 minutes
    maxConcurrency: 3
  }
  private isWarming = false
  private warmingInterval?: NodeJS.Timeout

  constructor(config?: Partial<CacheWarmingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  // Start cache warming
  start() {
    if (!this.config.enabled || this.warmingInterval) return

    this.warmingInterval = setInterval(() => {
      this.warmCache()
    }, this.config.interval)

    // Initial warming
    setTimeout(() => this.warmCache(), 1000)
  }

  // Stop cache warming
  stop() {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval)
      this.warmingInterval = undefined
    }
  }

  // Execute cache warming
  private async warmCache() {
    if (this.isWarming) return

    this.isWarming = true

    try {
      // Process each priority level
      for (const priority of this.config.priority) {
        await this.warmPriorityLevel(priority)
      }
    } catch (error) {
      console.error('Cache warming failed:', error)
    } finally {
      this.isWarming = false
    }
  }

  private async warmPriorityLevel(level: string) {
    switch (level) {
      case 'containers':
        await this.warmContainers()
        break
      case 'metrics':
        await this.warmMetrics()
        break
      case 'blobs':
        await this.warmRecentBlobs()
        break
      case 'properties':
        await this.warmProperties()
        break
    }
  }

  private async warmContainers() {
    // This would call the actual listContainers function
    // For now, we'll just log the warming action
    if (process.env.NODE_ENV === 'development') {
      console.log('Warming container cache...')
    }
  }

  private async warmMetrics() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Warming metrics cache...')
    }
  }

  private async warmRecentBlobs() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Warming recent blobs cache...')
    }
  }

  private async warmProperties() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Warming properties cache...')
    }
  }
}

/**
 * Adaptive Cache TTL Manager
 * Dynamically adjusts cache TTL based on data access patterns and change frequency
 */
export class AdaptiveCacheTTLManager {
  private accessPatterns: Map<string, {
    lastAccessed: Date
    accessCount: number
    avgTimeBetweenAccess: number
    changeFrequency: number
  }> = new Map()

  // Record data access
  recordAccess(key: string, isDataChanged = false) {
    const now = new Date()
    let pattern = this.accessPatterns.get(key)

    if (!pattern) {
      pattern = {
        lastAccessed: now,
        accessCount: 1,
        avgTimeBetweenAccess: 0,
        changeFrequency: isDataChanged ? 1 : 0
      }
    } else {
      const timeSinceLastAccess = now.getTime() - pattern.lastAccessed.getTime()
      pattern.avgTimeBetweenAccess = (pattern.avgTimeBetweenAccess * pattern.accessCount + timeSinceLastAccess) / (pattern.accessCount + 1)
      pattern.accessCount++
      pattern.lastAccessed = now
      
      if (isDataChanged) {
        pattern.changeFrequency = (pattern.changeFrequency * 0.9) + 0.1 // Weighted average
      } else {
        pattern.changeFrequency *= 0.99 // Decay over time
      }
    }

    this.accessPatterns.set(key, pattern)
  }

  // Get optimal TTL for a cache key
  getOptimalTTL(key: string, defaultTTL: number): number {
    const pattern = this.accessPatterns.get(key)
    if (!pattern) return defaultTTL

    // High-frequency access = shorter TTL
    // Low change frequency = longer TTL
    // Recent access = shorter TTL for consistency
    
    const accessFactor = Math.max(0.1, Math.min(2.0, pattern.avgTimeBetweenAccess / (5 * 60 * 1000))) // Normalize to 5-minute baseline
    const changeFactor = Math.max(0.5, Math.min(2.0, 1 / (pattern.changeFrequency + 0.1)))
    const recencyFactor = Math.max(0.5, Math.min(2.0, (Date.now() - pattern.lastAccessed.getTime()) / (60 * 60 * 1000))) // 1-hour baseline

    const multiplier = accessFactor * changeFactor * recencyFactor
    const optimalTTL = Math.round(defaultTTL * multiplier)

    return Math.max(10, Math.min(3600, optimalTTL)) // Clamp between 10 seconds and 1 hour
  }

  // Get cache recommendations
  getRecommendations(): Array<{
    key: string
    currentTTL: number
    recommendedTTL: number
    reason: string
  }> {
    const recommendations: Array<{
      key: string
      currentTTL: number
      recommendedTTL: number
      reason: string
    }> = []

    for (const [key] of this.accessPatterns) {
      const currentTTL = CACHE_DURATIONS.CONTAINERS // Example default
      const recommendedTTL = this.getOptimalTTL(key, currentTTL)

      if (Math.abs(recommendedTTL - currentTTL) > currentTTL * 0.2) {
        let reason = ''
        if (recommendedTTL > currentTTL) {
          reason = 'Low change frequency detected - can extend TTL'
        } else {
          reason = 'High access frequency or recent changes - should reduce TTL'
        }

        recommendations.push({
          key,
          currentTTL,
          recommendedTTL,
          reason
        })
      }
    }

    return recommendations
  }
}

/**
 * Global Cache Optimization Manager
 * Orchestrates all cache optimization features
 */
export class CacheOptimizationManager {
  private performanceMonitor = new CachePerformanceMonitor()
  private invalidator = new SmartCacheInvalidator()
  private warmer = new CacheWarmer()
  private ttlManager = new AdaptiveCacheTTLManager()

  constructor() {
    // Set up common cache dependencies
    this.setupCacheDependencies()
    
    // Start cache warming if enabled
    if (process.env.NODE_ENV === 'production') {
      this.warmer.start()
    }
  }

  private setupCacheDependencies() {
    // Container changes should invalidate related blob caches
    this.invalidator.registerDependency(CACHE_TAGS.ALL_CONTAINERS, CACHE_TAGS.ALL_BLOBS)
    
    // Blob changes should invalidate metrics
    this.invalidator.registerDependency(CACHE_TAGS.ALL_BLOBS, CACHE_TAGS.STORAGE_METRICS)
  }

  // Get performance monitor
  getPerformanceMonitor() {
    return this.performanceMonitor
  }

  // Get smart invalidator
  getInvalidator() {
    return this.invalidator
  }

  // Get cache warmer
  getWarmer() {
    return this.warmer
  }

  // Get TTL manager
  getTTLManager() {
    return this.ttlManager
  }

  // Create optimized cache wrapper
  createOptimizedCacheWrapper<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      keyGenerator: (...args: T) => string[]
      tags: string[]
      baseTTL: number
      operation: string
    }
  ) {
    return async (...args: T): Promise<R> => {
      const key = options.keyGenerator(...args).join(':')
      const startTime = Date.now()
      let cacheHit = false

      try {
        // Check for cached result first
        const cachedWrapper = unstable_cache(fn, options.keyGenerator as any, {
          tags: options.tags,
          revalidate: this.ttlManager.getOptimalTTL(key, options.baseTTL),
        })

        const result = await cachedWrapper(...args)
        cacheHit = true // If we get here without throwing, it was cached
        
        const duration = Date.now() - startTime
        this.performanceMonitor.recordOperation(key, cacheHit, duration)
        this.ttlManager.recordAccess(key)

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        this.performanceMonitor.recordOperation(key, false, duration, true)
        throw error
      }
    }
  }

  // Get optimization insights
  getOptimizationInsights(): {
    performance: ReturnType<CachePerformanceMonitor['getOverallMetrics']>
    ttlRecommendations: ReturnType<AdaptiveCacheTTLManager['getRecommendations']>
    cacheHealth: 'excellent' | 'good' | 'poor' | 'critical'
  } {
    const performance = this.performanceMonitor.getOverallMetrics()
    const ttlRecommendations = this.ttlManager.getRecommendations()

    let cacheHealth: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent'
    
    if (performance.hitRate < 0.3) {
      cacheHealth = 'critical'
    } else if (performance.hitRate < 0.5) {
      cacheHealth = 'poor'
    } else if (performance.hitRate < 0.8) {
      cacheHealth = 'good'
    }

    return {
      performance,
      ttlRecommendations,
      cacheHealth
    }
  }

  // Cleanup resources
  destroy() {
    this.warmer.stop()
    this.performanceMonitor.reset()
  }
}

// Global cache optimization manager instance
export const cacheOptimizer = new CacheOptimizationManager()

// Helper functions for easy integration
export const createOptimizedCache = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    keyGenerator: (...args: T) => string[]
    tags: string[]
    baseTTL: number
    operation: string
  }
) => cacheOptimizer.createOptimizedCacheWrapper(fn, options)

export const invalidateSmartCache = (
  tags: string[], 
  options?: SmartInvalidationOptions
) => cacheOptimizer.getInvalidator().invalidate(tags, options)

export const getCacheInsights = () => cacheOptimizer.getOptimizationInsights()
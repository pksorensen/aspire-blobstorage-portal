/**
 * Cache configuration and utilities for Azure Storage operations
 * 
 * This module provides centralized cache configuration for Next.js
 * caching mechanisms used throughout the Azure Storage integration.
 */

import { unstable_cache } from 'next/cache';

/**
 * Cache configuration constants
 */
export const CACHE_DURATIONS = {
  // Short-term cache for frequently changing data
  BLOBS: 30, // 30 seconds
  BLOB_EXISTS: 30,
  
  // Medium-term cache for container data  
  CONTAINERS: 60, // 1 minute
  CONTAINER_EXISTS: 60,
  BLOB_PROPERTIES: 60,
  
  // Long-term cache for metrics and properties
  STORAGE_METRICS: 300, // 5 minutes
  ACCOUNT_PROPERTIES: 600, // 10 minutes
} as const;

/**
 * Cache tags for organized invalidation
 */
export const CACHE_TAGS = {
  // Global tags
  ALL_CONTAINERS: 'containers',
  ALL_BLOBS: 'blobs',
  STORAGE_METRICS: 'storage-metrics',
  ACCOUNT_INFO: 'account-info',
  
  // Dynamic tags (functions that create tags)
  container: (name: string) => `container:${name}`,
  blob: (name: string) => `blob:${name}`,
  containerBlobs: (containerName: string) => `container-blobs:${containerName}`,
  blobProperties: (containerName: string, blobName: string) => `blob-properties:${containerName}:${blobName}`,
} as const;

/**
 * Cache key generators for consistent cache keys
 */
export const CACHE_KEYS = {
  containers: () => ['azure', 'containers'],
  containerExists: (name: string) => ['azure', 'container-exists', name],
  containerBlobs: (containerName: string, prefix?: string, maxResults?: number) => [
    'azure', 'blobs', containerName, prefix || '', maxResults?.toString() || ''
  ],
  blobExists: (containerName: string, blobName: string) => [
    'azure', 'blob-exists', containerName, blobName
  ],
  blobProperties: (containerName: string, blobName: string) => [
    'azure', 'blob-properties', containerName, blobName
  ],
  storageMetrics: () => ['azure', 'storage-metrics'],
  accountProperties: () => ['azure', 'account-properties'],
} as const;

/**
 * Typed cache wrapper that enforces consistent cache usage
 */
export function createAzureCacheWrapper<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    keyGenerator: (...args: T) => string[];
    tags: string[];
    revalidate: number;
  }
) {
  return unstable_cache(fn, options.keyGenerator as any, {
    tags: options.tags,
    revalidate: options.revalidate,
  });
}

/**
 * Cache invalidation helpers
 */
export interface CacheInvalidationOptions {
  containerName?: string;
  blobName?: string;
  invalidateGlobal?: boolean;
}

export function getCacheTagsToInvalidate(options: CacheInvalidationOptions): string[] {
  const tags: string[] = [];
  
  if (options.invalidateGlobal) {
    tags.push(CACHE_TAGS.ALL_CONTAINERS, CACHE_TAGS.ALL_BLOBS, CACHE_TAGS.STORAGE_METRICS);
  }
  
  if (options.containerName) {
    tags.push(
      CACHE_TAGS.container(options.containerName),
      CACHE_TAGS.containerBlobs(options.containerName)
    );
  }
  
  if (options.blobName && options.containerName) {
    tags.push(
      CACHE_TAGS.blob(options.blobName),
      CACHE_TAGS.blobProperties(options.containerName, options.blobName)
    );
  }
  
  return tags;
}

/**
 * Cache warming utilities for preloading data
 */
export interface CacheWarmingOptions {
  containers?: boolean;
  storageMetrics?: boolean;
  recentContainers?: string[];
}

/**
 * Pre-configured cache functions for common operations
 */
export const createCachedFunction = {
  /**
   * Cache function for container operations
   */
  containers: <T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    keyGenerator: (...args: T) => string[]
  ) => createAzureCacheWrapper(fn, {
    keyGenerator,
    tags: [CACHE_TAGS.ALL_CONTAINERS],
    revalidate: CACHE_DURATIONS.CONTAINERS,
  }),

  /**
   * Cache function for blob operations
   */
  blobs: <T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    keyGenerator: (...args: T) => string[],
    containerName: string
  ) => createAzureCacheWrapper(fn, {
    keyGenerator,
    tags: [CACHE_TAGS.ALL_BLOBS, CACHE_TAGS.container(containerName)],
    revalidate: CACHE_DURATIONS.BLOBS,
  }),

  /**
   * Cache function for storage metrics
   */
  metrics: <T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    keyGenerator: (...args: T) => string[]
  ) => createAzureCacheWrapper(fn, {
    keyGenerator,
    tags: [CACHE_TAGS.STORAGE_METRICS],
    revalidate: CACHE_DURATIONS.STORAGE_METRICS,
  }),
};

/**
 * Cache debugging utilities
 */
export const CacheDebug = {
  /**
   * Log cache hit/miss for debugging
   */
  logCacheAccess: (operation: string, key: string[], hit: boolean) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache ${hit ? 'HIT' : 'MISS'}: ${operation} [${key.join(':')}]`);
    }
  },

  /**
   * Get cache statistics (development only)
   */
  getCacheStats: () => {
    if (process.env.NODE_ENV === 'development') {
      // This would require additional implementation to track cache stats
      return {
        hits: 0,
        misses: 0,
        size: 0,
      };
    }
    return null;
  },
};

/**
 * Cache performance monitoring
 */
export const CacheMonitor = {
  /**
   * Measure cache operation performance
   */
  measureCacheOperation: async <T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache operation '${operation}' took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`Cache operation '${operation}' failed after ${duration}ms:`, error);
      throw error;
    }
  },
};

/**
 * Cache strategy recommendations based on data type
 */
export const CACHE_STRATEGIES = {
  // Frequently accessed, rarely changing data
  STATIC: {
    revalidate: 3600, // 1 hour
    tags: ['static'],
  },
  
  // User-specific data that changes moderately
  DYNAMIC: {
    revalidate: 300, // 5 minutes  
    tags: ['dynamic'],
  },
  
  // Real-time data that changes frequently
  REALTIME: {
    revalidate: 30, // 30 seconds
    tags: ['realtime'],
  },
  
  // Data that should be cached per user session
  SESSION: {
    revalidate: 1800, // 30 minutes
    tags: ['session'],
  },
} as const;

/**
 * Export cache configuration for use in azure-storage.ts
 */
export const AzureCacheConfig = {
  DURATIONS: CACHE_DURATIONS,
  TAGS: CACHE_TAGS,
  KEYS: CACHE_KEYS,
  createWrapper: createAzureCacheWrapper,
  invalidationTags: getCacheTagsToInvalidate,
} as const;
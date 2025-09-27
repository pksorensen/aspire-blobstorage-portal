# Performance Optimization Integration Guide

This document outlines how to integrate and use the comprehensive performance optimizations implemented for the Azure Storage Explorer application.

## Overview

The performance optimization system includes:

1. **Enhanced Error Boundaries** - Smart error categorization and recovery
2. **Advanced Loading States** - Context-aware loading components with progress tracking
3. **Intelligent Caching** - Adaptive TTL management and cache warming
4. **Performance Monitoring** - Real-time metrics and analytics
5. **Bundle Optimization** - Code splitting and tree shaking

## 1. Error Boundary Integration

### Usage Examples

#### Basic Error Boundary
```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'

function MyComponent() {
  return (
    <ErrorBoundary context="User Data Loading">
      <UserDataComponent />
    </ErrorBoundary>
  )
}
```

#### Azure Storage Error Boundary
```tsx
import { AzureStorageErrorBoundary } from '@/components/ui/error-boundary'

function ContainerList() {
  return (
    <AzureStorageErrorBoundary>
      <ContainerDataFetch />
    </AzureStorageErrorBoundary>
  )
}
```

#### Inline Error Display
```tsx
import { InlineError } from '@/components/ui/error-boundary'

function DataComponent({ error, onRetry }) {
  if (error) {
    return (
      <InlineError 
        message="Failed to load data" 
        onRetry={onRetry}
        canRetry={true}
      />
    )
  }
  return <DataDisplay />
}
```

## 2. Enhanced Loading States

### Loading Components

#### Basic Loading
```tsx
import { Loading } from '@/components/ui/loading'

// Simple loading spinner
<Loading size="md" text="Loading containers..." />

// Card variant
<Loading size="lg" text="Processing..." variant="card" />

// Inline variant
<Loading size="sm" text="Saving..." variant="inline" />
```

#### Progress Loading
```tsx
import { ProgressLoading } from '@/components/ui/loading'

<ProgressLoading 
  progress={uploadProgress} 
  text="Uploading files..."
  showPercentage={true}
/>
```

#### Specialized Azure Loading
```tsx
import { AzureStorageLoading, UploadLoading } from '@/components/ui/loading'

// Azure operation loading
<AzureStorageLoading 
  operation="Listing containers"
  containerName="my-container"
  blobCount={150}
/>

// File upload loading
<UploadLoading 
  filename="document.pdf"
  progress={75}
  speed="2.5 MB/s"
/>
```

#### Skeleton Loading
```tsx
import { CardGridSkeleton, TableSkeleton } from '@/components/ui/loading'

// Card grid skeleton
<Suspense fallback={<CardGridSkeleton count={6} />}>
  <ContainerGrid />
</Suspense>

// Table skeleton
<Suspense fallback={<TableSkeleton rows={10} cols={5} />}>
  <BlobTable />
</Suspense>
```

## 3. Optimized Caching Integration

### Cache Optimization Usage

```tsx
import { createOptimizedCache, invalidateSmartCache } from '@/lib/cache-optimization'

// Create optimized cached function
const cachedListContainers = createOptimizedCache(
  listContainersApi,
  {
    keyGenerator: () => ['azure', 'containers'],
    tags: ['containers'],
    baseTTL: 60,
    operation: 'listContainers'
  }
)

// Use in Server Component
export async function ContainerList() {
  const containers = await cachedListContainers()
  return <div>{/* render containers */}</div>
}

// Smart cache invalidation
await invalidateSmartCache(['containers'], {
  cascading: true,
  selective: true,
  batched: true,
  delayed: 1000
})
```

### Cache Insights

```tsx
import { getCacheInsights } from '@/lib/cache-optimization'

export async function CacheHealthComponent() {
  const insights = getCacheInsights()
  
  return (
    <div>
      <p>Cache Health: {insights.cacheHealth}</p>
      <p>Hit Rate: {(insights.performance.hitRate * 100).toFixed(1)}%</p>
      {insights.ttlRecommendations.map(rec => (
        <div key={rec.key}>
          {rec.key}: {rec.reason}
        </div>
      ))}
    </div>
  )
}
```

## 4. Performance Monitoring Integration

### Track Page Performance

```tsx
import { trackPagePerformance } from '@/lib/performance-monitor'

export default async function MyPage() {
  const startTime = Date.now()
  
  // Your page logic here
  const data = await fetchData()
  
  const loadTime = Date.now() - startTime
  await trackPagePerformance('/my-page', loadTime, 0, 0.8) // 80% cache hit rate
  
  return <PageContent data={data} />
}
```

### Track Operations

```tsx
import { trackOperationPerformance, trackAzureOperation } from '@/lib/performance-monitor'

async function uploadFile(file: File) {
  const startTime = Date.now()
  
  try {
    const result = await azureUpload(file)
    const duration = Date.now() - startTime
    
    trackOperationPerformance('fileUpload', duration, true)
    trackAzureOperation('upload', duration, true, {
      containerName: 'uploads',
      size: file.size
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    trackOperationPerformance('fileUpload', duration, false, error.message)
    trackAzureOperation('upload', duration, false, {
      containerName: 'uploads',
      errorCode: error.code
    })
    
    throw error
  }
}
```

### Performance Dashboard

```tsx
import PerformanceDashboard from '@/components/performance-dashboard'

// Add to your admin/monitoring page
export default function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <PerformanceDashboard />
    </div>
  )
}
```

## 5. Bundle Optimization Usage

### Bundle Analysis

```bash
# Analyze bundle size
npm run performance:analyze

# Development with analysis
ANALYZE=true npm run dev

# Run Lighthouse audit
npm run performance:lighthouse
```

### Code Splitting Best Practices

```tsx
import dynamic from 'next/dynamic'

// Lazy load heavy components
const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <Loading text="Loading chart..." />,
  ssr: false // Client-side only if needed
})

// Route-level code splitting is automatic in Next.js App Router
```

### Import Optimization

```tsx
// Good: Tree-shaken imports
import { Database, Upload, Download } from 'lucide-react'

// Avoid: Full library imports
// import * as Icons from 'lucide-react'

// Good: Specific Radix imports
import { DialogContent, DialogTitle } from '@/components/ui/dialog'

// The Next.js config automatically optimizes these imports
```

## 6. Integration Examples

### Complete Page with All Optimizations

```tsx
import { Suspense } from 'react'
import { ErrorBoundary, AzureStorageErrorBoundary } from '@/components/ui/error-boundary'
import { DataFetchLoading, CardGridSkeleton } from '@/components/ui/loading'
import { trackPagePerformance } from '@/lib/performance-monitor'
import { createOptimizedCache } from '@/lib/cache-optimization'

// Optimized data fetching
const cachedGetContainers = createOptimizedCache(
  getContainersFromAzure,
  {
    keyGenerator: () => ['containers', 'list'],
    tags: ['containers'],
    baseTTL: 60,
    operation: 'listContainers'
  }
)

async function ContainerGrid() {
  const containers = await cachedGetContainers()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {containers.map(container => (
        <ContainerCard key={container.name} container={container} />
      ))}
    </div>
  )
}

export default async function ContainersPage() {
  const startTime = Date.now()
  
  // Track page performance
  const loadTime = Date.now() - startTime
  await trackPagePerformance('/containers', loadTime, 0, 0.75)
  
  return (
    <ErrorBoundary context="Containers Page">
      <div className="space-y-6">
        <h1>Blob Containers</h1>
        
        <AzureStorageErrorBoundary>
          <Suspense fallback={<CardGridSkeleton count={6} />}>
            <ContainerGrid />
          </Suspense>
        </AzureStorageErrorBoundary>
      </div>
    </ErrorBoundary>
  )
}

// Enable ISR with optimized revalidation
export const revalidate = 300 // 5 minutes
```

### Error Recovery Pattern

```tsx
'use client'

import { useState } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'

function DataComponent() {
  const [retryKey, setRetryKey] = useState(0)
  
  return (
    <ErrorBoundary 
      context="Data Loading"
      onRetry={() => setRetryKey(prev => prev + 1)}
      key={retryKey} // Force remount on retry
    >
      <DataFetcher />
    </ErrorBoundary>
  )
}
```

## 7. Environment Configuration

Add these environment variables for optimal performance:

```bash
# Cache optimization
AZURE_STORAGE_CACHE_WARMING=true
AZURE_STORAGE_CACHE_TTL=60
AZURE_STORAGE_ENABLE_CACHING=true

# Performance monitoring
AZURE_STORAGE_ENABLE_TELEMETRY=true

# Bundle analysis (development)
ANALYZE=true

# Azure Storage settings
AZURE_STORAGE_MAX_UPLOAD_SIZE=104857600
AZURE_STORAGE_MAX_CONCURRENT_UPLOADS=3
AZURE_STORAGE_TIMEOUT=30000
AZURE_STORAGE_MAX_RETRIES=3
```

## 8. Best Practices

### Error Boundaries
- Use specific error boundaries for different contexts
- Implement retry mechanisms for transient errors
- Provide meaningful error messages to users
- Log errors for debugging in development

### Loading States
- Match loading states to the actual operation
- Show progress for long-running operations
- Use skeleton loading for better perceived performance
- Provide context about what's being loaded

### Caching
- Use appropriate TTL values based on data volatility
- Implement cache warming for critical data
- Monitor cache hit rates and adjust strategies
- Use selective invalidation to avoid over-invalidation

### Performance Monitoring
- Track key user journeys and operations
- Set up alerts for performance degradation
- Regularly review performance trends
- Use real user monitoring data for optimization

### Bundle Optimization
- Regularly analyze bundle sizes
- Use code splitting for large components
- Implement tree shaking for unused code
- Monitor and optimize Core Web Vitals

## 9. Troubleshooting

### Common Issues

1. **High Bundle Size**: Use `npm run performance:analyze` to identify large dependencies
2. **Poor Cache Hit Rate**: Check TTL settings and invalidation patterns
3. **Slow Page Loads**: Review Suspense boundaries and data fetching strategies
4. **Error Boundary Loops**: Ensure proper error recovery and avoid infinite retry loops

### Debugging

```tsx
// Enable performance debugging
if (process.env.NODE_ENV === 'development') {
  console.log('Cache insights:', getCacheInsights())
  console.log('Performance summary:', performanceMonitor.getPerformanceSummary())
}
```

This comprehensive system provides production-ready performance optimizations while maintaining the RSC architecture and ensuring excellent user experience.
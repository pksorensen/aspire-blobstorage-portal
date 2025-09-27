/**
 * Search Performance Optimization Module
 * 
 * This module provides caching, indexing, and performance optimizations
 * for Azure Storage search operations in React Server Components.
 */

import { unstable_cache } from 'next/cache'
import {
  ContainerItem,
  BlobItem,
  BlobSearchCriteria
} from '@/types/azure-types'
import { 
  listContainers,
  listBlobs,
  searchBlobs
} from '@/lib/azure-storage'

/**
 * Enhanced Search Result Types
 */
export interface SearchIndex {
  containers: Map<string, ContainerItem>
  blobs: Map<string, BlobItem & { containerName: string }>
  lastUpdated: Date
}

export interface SearchSuggestion {
  query: string
  type: 'container' | 'blob' | 'metadata' | 'tag'
  frequency: number
  lastUsed: Date
}

export interface SearchStats {
  totalQueries: number
  popularQueries: string[]
  averageResponseTime: number
  cacheHitRate: number
}

/**
 * Search Index Builder
 * Creates an in-memory search index for faster lookups
 */
export async function buildSearchIndex(): Promise<SearchIndex> {
  return await unstable_cache(
    async () => {
      const startTime = Date.now()
      const containers = await listContainers()
      const containerMap = new Map<string, ContainerItem>()
      const blobMap = new Map<string, BlobItem & { containerName: string }>()

      // Index containers
      containers.forEach(container => {
        containerMap.set(container.name.toLowerCase(), container)
      })

      // Index blobs across all containers
      const blobPromises = containers.map(async (container) => {
        try {
          const blobs = await listBlobs(container.name)
          return blobs.map(blob => ({ ...blob, containerName: container.name }))
        } catch (error) {
          console.warn(`Failed to index blobs in container ${container.name}:`, error)
          return []
        }
      })

      const allBlobs = (await Promise.all(blobPromises)).flat()
      allBlobs.forEach(blob => {
        const key = `${blob.containerName}/${blob.name}`.toLowerCase()
        blobMap.set(key, blob)
      })

      const buildTime = Date.now() - startTime
      console.log(`Search index built in ${buildTime}ms: ${containerMap.size} containers, ${blobMap.size} blobs`)

      return {
        containers: containerMap,
        blobs: blobMap,
        lastUpdated: new Date()
      }
    },
    ['search-index'],
    {
      tags: ['search-index', 'containers', 'blobs'],
      revalidate: 300 // Rebuild index every 5 minutes
    }
  )()
}

/**
 * Fast Text Search
 * Uses the search index for rapid text-based searches
 */
export async function performFastTextSearch(
  query: string,
  options: {
    includeContainers?: boolean
    includeBlobs?: boolean
    limit?: number
    fuzzyMatch?: boolean
  } = {}
): Promise<{
  containers: ContainerItem[]
  blobs: Array<BlobItem & { containerName: string }>
  searchTime: number
}> {
  const startTime = Date.now()
  const {
    includeContainers = true,
    includeBlobs = true,
    limit = 100,
    fuzzyMatch = true
  } = options

  const index = await buildSearchIndex()
  const lowerQuery = query.toLowerCase()
  const containers: ContainerItem[] = []
  const blobs: Array<BlobItem & { containerName: string }> = []

  // Search containers
  if (includeContainers) {
    for (const [name, container] of index.containers) {
      if (containers.length >= limit) break
      
      if (fuzzyMatch) {
        // Fuzzy matching: check if query is contained in name or metadata
        const matchesName = name.includes(lowerQuery)
        const matchesMetadata = Object.values(container.metadata).some(value =>
          value.toLowerCase().includes(lowerQuery)
        )
        
        if (matchesName || matchesMetadata) {
          containers.push(container)
        }
      } else {
        // Exact prefix matching
        if (name.startsWith(lowerQuery)) {
          containers.push(container)
        }
      }
    }
  }

  // Search blobs
  if (includeBlobs) {
    for (const [, blob] of index.blobs) {
      if (blobs.length >= limit) break
      
      if (fuzzyMatch) {
        // Check blob name, metadata, and tags
        const matchesName = blob.name.toLowerCase().includes(lowerQuery)
        const matchesMetadata = Object.values(blob.metadata).some(value =>
          value.toLowerCase().includes(lowerQuery)
        )
        const matchesTags = blob.tags && Object.entries(blob.tags).some(([key, value]) =>
          key.toLowerCase().includes(lowerQuery) || value.toLowerCase().includes(lowerQuery)
        )
        
        if (matchesName || matchesMetadata || matchesTags) {
          blobs.push(blob)
        }
      } else {
        // Exact prefix matching
        if (blob.name.toLowerCase().startsWith(lowerQuery)) {
          blobs.push(blob)
        }
      }
    }
  }

  const searchTime = Date.now() - startTime
  
  return {
    containers: containers.slice(0, limit),
    blobs: blobs.slice(0, limit),
    searchTime
  }
}

/**
 * Advanced Multi-Container Search
 * Searches across multiple containers with sophisticated filtering
 */
export async function performAdvancedSearch(
  criteria: BlobSearchCriteria & {
    containerPattern?: string
    includeContainers?: boolean
    includeTags?: boolean
    includeMetadata?: boolean
    sortBy?: 'name' | 'size' | 'modified' | 'relevance'
    sortOrder?: 'asc' | 'desc'
    limit?: number
  }
): Promise<{
  containers: ContainerItem[]
  blobs: Array<BlobItem & { containerName: string; relevanceScore?: number }>
  totalResults: number
  searchTime: number
  fromCache: boolean
}> {
  const cacheKey = JSON.stringify(criteria)
  
  return await unstable_cache(
    async () => {
      const startTime = Date.now()
      let containers: ContainerItem[] = []
      let allBlobs: Array<BlobItem & { containerName: string; relevanceScore?: number }> = []
      
      try {
        // Get all containers
        const allContainers = await listContainers()
        
        // Filter containers by pattern if specified
        const targetContainers = criteria.containerPattern
          ? allContainers.filter(c => 
              new RegExp(criteria.containerPattern!, 'i').test(c.name)
            )
          : allContainers

        // Search containers if requested
        if (criteria.includeContainers && criteria.namePattern) {
          containers = targetContainers.filter(container =>
            new RegExp(criteria.namePattern!, 'i').test(container.name)
          )
        }

        // Search blobs across target containers
        const blobPromises = targetContainers.map(async (container) => {
          try {
            const blobs = await searchBlobs(container.name, criteria)
            return blobs.map(blob => {
              // Calculate relevance score
              let relevanceScore = 0
              
              if (criteria.namePattern) {
                const regex = new RegExp(criteria.namePattern, 'i')
                // Exact match gets highest score
                if (blob.name.toLowerCase() === criteria.namePattern.toLowerCase()) {
                  relevanceScore += 100
                }
                // Starts with query gets high score
                else if (blob.name.toLowerCase().startsWith(criteria.namePattern.toLowerCase())) {
                  relevanceScore += 80
                }
                // Contains query gets medium score
                else if (regex.test(blob.name)) {
                  relevanceScore += 50
                }
                
                // Bonus for shorter names (more specific matches)
                relevanceScore += Math.max(0, 20 - blob.name.length / 10)
                
                // Recent files get slight bonus
                const daysSinceModified = (Date.now() - blob.properties.lastModified.getTime()) / (1000 * 60 * 60 * 24)
                if (daysSinceModified < 7) {
                  relevanceScore += 5
                }
              }
              
              return { ...blob, containerName: container.name, relevanceScore }
            })
          } catch (error) {
            console.warn(`Search failed in container ${container.name}:`, error)
            return []
          }
        })

        const blobResults = await Promise.all(blobPromises)
        allBlobs = blobResults.flat()

        // Sort results
        if (criteria.sortBy) {
          allBlobs.sort((a, b) => {
            let compareValue = 0
            
            switch (criteria.sortBy) {
              case 'name':
                compareValue = a.name.localeCompare(b.name)
                break
              case 'size':
                compareValue = a.properties.contentLength - b.properties.contentLength
                break
              case 'modified':
                compareValue = a.properties.lastModified.getTime() - b.properties.lastModified.getTime()
                break
              case 'relevance':
                compareValue = (b.relevanceScore || 0) - (a.relevanceScore || 0)
                break
            }
            
            return criteria.sortOrder === 'desc' ? -compareValue : compareValue
          })
        }

        // Apply limit
        if (criteria.limit) {
          allBlobs = allBlobs.slice(0, criteria.limit)
          containers = containers.slice(0, criteria.limit)
        }

        const searchTime = Date.now() - startTime
        const totalResults = containers.length + allBlobs.length

        return {
          containers,
          blobs: allBlobs,
          totalResults,
          searchTime,
          fromCache: false
        }
      } catch (error) {
        console.error('Advanced search failed:', error)
        return {
          containers: [],
          blobs: [],
          totalResults: 0,
          searchTime: Date.now() - startTime,
          fromCache: false
        }
      }
    },
    ['advanced-search', cacheKey],
    {
      tags: ['advanced-search', 'containers', 'blobs'],
      revalidate: 120 // Cache advanced search results for 2 minutes
    }
  )()
}

/**
 * Search Suggestions Generator
 * Generates search suggestions based on container and blob names
 */
export async function generateSearchSuggestions(
  query: string,
  limit: number = 10
): Promise<SearchSuggestion[]> {
  if (query.length < 2) {
    return []
  }

  return await unstable_cache(
    async () => {
      const index = await buildSearchIndex()
      const suggestions: SearchSuggestion[] = []
      const lowerQuery = query.toLowerCase()

      // Generate suggestions from container names
      for (const [name, container] of index.containers) {
        if (suggestions.length >= limit) break
        
        if (name.includes(lowerQuery)) {
          suggestions.push({
            query: container.name,
            type: 'container',
            frequency: 1,
            lastUsed: new Date()
          })
        }
      }

      // Generate suggestions from blob names
      for (const [, blob] of index.blobs) {
        if (suggestions.length >= limit) break
        
        if (blob.name.toLowerCase().includes(lowerQuery)) {
          suggestions.push({
            query: blob.name,
            type: 'blob',
            frequency: 1,
            lastUsed: new Date()
          })
        }
      }

      // Sort by relevance (exact matches first, then alphabetical)
      suggestions.sort((a, b) => {
        const aExact = a.query.toLowerCase().startsWith(lowerQuery) ? 1 : 0
        const bExact = b.query.toLowerCase().startsWith(lowerQuery) ? 1 : 0
        
        if (aExact !== bExact) {
          return bExact - aExact
        }
        
        return a.query.localeCompare(b.query)
      })

      return suggestions.slice(0, limit)
    },
    ['search-suggestions', query.slice(0, 50)], // Limit cache key length
    {
      tags: ['search-suggestions'],
      revalidate: 300 // Cache suggestions for 5 minutes
    }
  )()
}

/**
 * Search Statistics Tracking
 * Tracks search performance and usage patterns
 */
export function trackSearchQuery(query: string, responseTime: number, resultsCount: number) {
  // This would typically write to a logging service or analytics system
  // For now, we'll just log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Search: "${query}" - ${responseTime}ms - ${resultsCount} results`)
  }
}

/**
 * Cache Warming Function
 * Pre-loads search index and common queries for better performance
 */
export async function warmSearchCache() {
  try {
    console.log('Warming search cache...')
    
    // Build search index
    await buildSearchIndex()
    
    // Pre-generate common search suggestions
    const commonQueries = ['', 'log', 'image', 'config', 'backup', 'data']
    await Promise.all(
      commonQueries.map(query => 
        generateSearchSuggestions(query).catch(error => 
          console.warn(`Failed to warm cache for query "${query}":`, error)
        )
      )
    )
    
    console.log('Search cache warmed successfully')
  } catch (error) {
    console.error('Failed to warm search cache:', error)
  }
}
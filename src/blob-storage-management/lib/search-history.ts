/**
 * Search History and Suggestions Management
 * 
 * This module provides client-side search history tracking
 * and intelligent suggestions for Azure Storage search.
 */

import { unstable_cache } from 'next/cache'

export interface SearchHistoryEntry {
  query: string
  timestamp: Date
  results: number
  type: 'global' | 'container' | 'blob'
  metadata?: {
    containerName?: string
    filters?: Record<string, any>
    responseTime?: number
  }
}

export interface SearchSuggestion {
  text: string
  type: 'history' | 'container' | 'blob' | 'quick-action'
  frequency: number
  lastUsed: Date
  metadata?: {
    containerName?: string
    description?: string
    icon?: string
  }
}

/**
 * Search History Manager
 * Manages search history in localStorage for client-side persistence
 */
class SearchHistoryManager {
  private readonly HISTORY_KEY = 'azure-storage-search-history'
  private readonly MAX_HISTORY_ITEMS = 100
  private readonly SUGGESTION_CACHE_KEY = 'search-suggestions'
  
  /**
   * Add a search query to history
   */
  addToHistory(entry: SearchHistoryEntry): void {
    if (typeof window === 'undefined') return
    
    try {
      const history = this.getHistory()
      
      // Remove duplicate queries (keep most recent)
      const filteredHistory = history.filter(h => h.query !== entry.query)
      
      // Add new entry at beginning
      const newHistory = [entry, ...filteredHistory].slice(0, this.MAX_HISTORY_ITEMS)
      
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(newHistory))
    } catch (error) {
      console.warn('Failed to save search history:', error)
    }
  }
  
  /**
   * Get search history
   */
  getHistory(): SearchHistoryEntry[] {
    if (typeof window === 'undefined') return []
    
    try {
      const historyJson = localStorage.getItem(this.HISTORY_KEY)
      if (!historyJson) return []
      
      const history = JSON.parse(historyJson)
      
      // Convert timestamp strings back to Date objects
      return history.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }))
    } catch (error) {
      console.warn('Failed to load search history:', error)
      return []
    }
  }
  
  /**
   * Clear all search history
   */
  clearHistory(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(this.HISTORY_KEY)
    } catch (error) {
      console.warn('Failed to clear search history:', error)
    }
  }
  
  /**
   * Get popular search queries
   */
  getPopularQueries(limit: number = 10): SearchHistoryEntry[] {
    const history = this.getHistory()
    
    // Group by query and count frequency
    const queryFrequency = new Map<string, { count: number; entry: SearchHistoryEntry }>()
    
    history.forEach(entry => {
      const existing = queryFrequency.get(entry.query)
      if (existing) {
        existing.count += 1
        // Keep the most recent entry
        if (entry.timestamp > existing.entry.timestamp) {
          existing.entry = entry
        }
      } else {
        queryFrequency.set(entry.query, { count: 1, entry })
      }
    })
    
    // Sort by frequency and recency
    return Array.from(queryFrequency.values())
      .sort((a, b) => {
        if (a.count !== b.count) {
          return b.count - a.count // Higher frequency first
        }
        return b.entry.timestamp.getTime() - a.entry.timestamp.getTime() // More recent first
      })
      .slice(0, limit)
      .map(item => item.entry)
  }
  
  /**
   * Get recent queries
   */
  getRecentQueries(limit: number = 10): SearchHistoryEntry[] {
    return this.getHistory()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }
  
  /**
   * Generate search suggestions based on current query
   */
  generateSuggestions(currentQuery: string, limit: number = 8): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = []
    const lowerQuery = currentQuery.toLowerCase()
    
    if (currentQuery.length < 2) {
      // Return popular queries when no query
      const popular = this.getPopularQueries(5)
      return popular.map(entry => ({
        text: entry.query,
        type: 'history' as const,
        frequency: 1,
        lastUsed: entry.timestamp,
        metadata: entry.metadata
      }))
    }
    
    // Get matching historical queries
    const history = this.getHistory()
    const matchingHistory = history
      .filter(entry => entry.query.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
    
    matchingHistory.forEach(entry => {
      suggestions.push({
        text: entry.query,
        type: 'history',
        frequency: 1,
        lastUsed: entry.timestamp,
        metadata: entry.metadata
      })
    })
    
    // Add common search patterns
    const patterns = this.getSearchPatterns(currentQuery)
    patterns.forEach(pattern => {
      if (suggestions.length < limit && !suggestions.some(s => s.text === pattern.text)) {
        suggestions.push(pattern)
      }
    })
    
    return suggestions.slice(0, limit)
  }
  
  /**
   * Get search patterns and quick actions
   */
  private getSearchPatterns(query: string): SearchSuggestion[] {
    const patterns: SearchSuggestion[] = []
    const lowerQuery = query.toLowerCase()
    
    // File extension patterns
    if (lowerQuery.includes('.')) {
      const extension = lowerQuery.split('.').pop()
      if (extension && extension.length > 0) {
        patterns.push({
          text: `*.${extension}`,
          type: 'quick-action',
          frequency: 0,
          lastUsed: new Date(),
          metadata: {
            description: `All ${extension.toUpperCase()} files`,
            icon: 'file'
          }
        })
      }
    }
    
    // Common file type patterns
    const fileTypes = [
      { pattern: 'log', description: 'Log files' },
      { pattern: 'config', description: 'Configuration files' },
      { pattern: 'backup', description: 'Backup files' },
      { pattern: 'image', description: 'Image files' },
      { pattern: 'data', description: 'Data files' },
      { pattern: 'temp', description: 'Temporary files' }
    ]
    
    fileTypes.forEach(type => {
      if (type.pattern.includes(lowerQuery) || lowerQuery.includes(type.pattern)) {
        patterns.push({
          text: type.pattern,
          type: 'quick-action',
          frequency: 0,
          lastUsed: new Date(),
          metadata: {
            description: type.description,
            icon: 'folder'
          }
        })
      }
    })
    
    return patterns
  }
}

// Export singleton instance
export const searchHistory = new SearchHistoryManager()

/**
 * Server Action to track search queries
 */
export async function trackSearchQuery(
  query: string,
  results: number,
  type: 'global' | 'container' | 'blob',
  metadata?: SearchHistoryEntry['metadata']
) {
  'use server'
  
  // This would typically be sent to an analytics service
  // For now, we'll just log it for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Search tracked: "${query}" - ${results} results - ${type}`, metadata)
  }
  
  // In a real implementation, you might:
  // - Send to Application Insights
  // - Store in a database
  // - Send to a logging service
  // - Update user preferences
}

/**
 * Get trending searches across all users (server-side)
 * This would typically come from a centralized analytics system
 */
export async function getTrendingSearches(limit: number = 10): Promise<SearchSuggestion[]> {
  return await unstable_cache(
    async () => {
      // Mock trending searches - in a real implementation,
      // this would come from analytics data
      const trending = [
        'backup',
        'logs',
        'config.json',
        'images',
        'data',
        '*.pdf',
        'temp',
        'archive'
      ]
      
      return trending.slice(0, limit).map((query, index) => ({
        text: query,
        type: 'quick-action' as const,
        frequency: limit - index,
        lastUsed: new Date(),
        metadata: {
          description: `Popular search: ${query}`,
          icon: 'trending'
        }
      }))
    },
    ['trending-searches'],
    {
      tags: ['trending-searches'],
      revalidate: 3600 // Update hourly
    }
  )()
}

/**
 * Search suggestion utilities for UI components
 */
export function formatSearchSuggestion(suggestion: SearchSuggestion): string {
  switch (suggestion.type) {
    case 'history':
      return `Recent: ${suggestion.text}`
    case 'container':
      return `Container: ${suggestion.text}`
    case 'blob':
      return `Blob: ${suggestion.text}`
    case 'quick-action':
      return suggestion.metadata?.description || suggestion.text
    default:
      return suggestion.text
  }
}

/**
 * Get search suggestion icon
 */
export function getSearchSuggestionIcon(suggestion: SearchSuggestion): string {
  switch (suggestion.type) {
    case 'history':
      return 'clock'
    case 'container':
      return 'folder'
    case 'blob':
      return 'file'
    case 'quick-action':
      return suggestion.metadata?.icon || 'search'
    default:
      return 'search'
  }
}

/**
 * Search performance analytics
 */
export interface SearchAnalytics {
  totalSearches: number
  averageResponseTime: number
  popularQueries: string[]
  searchTypes: Record<string, number>
  errorRate: number
}

export function getSearchAnalytics(): SearchAnalytics {
  if (typeof window === 'undefined') {
    return {
      totalSearches: 0,
      averageResponseTime: 0,
      popularQueries: [],
      searchTypes: {},
      errorRate: 0
    }
  }
  
  const history = searchHistory.getHistory()
  
  const totalSearches = history.length
  const averageResponseTime = history
    .filter(h => h.metadata?.responseTime)
    .reduce((sum, h) => sum + (h.metadata!.responseTime || 0), 0) / history.length || 0
  
  const popularQueries = searchHistory.getPopularQueries(10).map(h => h.query)
  
  const searchTypes = history.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalSearches,
    averageResponseTime,
    popularQueries,
    searchTypes,
    errorRate: 0 // Would need error tracking implementation
  }
}
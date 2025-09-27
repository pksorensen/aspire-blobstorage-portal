/**
 * Recently viewed items functionality for Azure Storage Explorer
 * 
 * This module provides server-side storage and retrieval of recently viewed
 * containers and blobs. In a production environment, this would typically
 * integrate with a database or user session storage.
 */

import { unstable_cache } from 'next/cache';
import { listContainers } from './azure-storage';
import { ContainerItem } from '@/types/azure-types';

export interface RecentlyViewedItem {
  name: string;
  type: 'container' | 'blob';
  containerName?: string; // For blobs, the parent container
  url: string;
  lastViewed: Date;
  exists: boolean; // Whether the item still exists in storage
}

/**
 * Get recently viewed items with verification of existence
 * This uses a simple in-memory cache for demo purposes.
 * In production, you would use a database or persistent storage.
 */
async function getRecentlyViewedItems(): Promise<RecentlyViewedItem[]> {
  try {
    // Get actual containers from Azure Storage
    const containers = await listContainers();
    const containerNames = new Set(containers.map(c => c.name));
    
    // Mock recently viewed data based on actual containers
    // In production, this would come from user session/database
    const mockRecentItems: Omit<RecentlyViewedItem, 'exists'>[] = [
      {
        name: containers[0]?.name || 'example-container',
        type: 'container' as const,
        url: `/dashboard/containers/${containers[0]?.name || 'example-container'}`,
        lastViewed: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      },
      {
        name: containers[1]?.name || 'backup-container',
        type: 'container' as const, 
        url: `/dashboard/containers/${containers[1]?.name || 'backup-container'}`,
        lastViewed: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
    ].filter(item => item.name !== 'example-container' && item.name !== 'backup-container');

    // Add some actual containers if available
    const actualRecentItems = containers.slice(0, 3).map((container, index) => ({
      name: container.name,
      type: 'container' as const,
      url: `/dashboard/containers/${container.name}`,
      lastViewed: new Date(Date.now() - 1000 * 60 * (index + 1) * 15), // Stagger by 15 minutes each
    }));

    const allItems = [...actualRecentItems, ...mockRecentItems];

    // Verify existence and add status
    const itemsWithStatus = await Promise.all(
      allItems.map(async (item) => {
        let exists = false;
        
        if (item.type === 'container') {
          exists = containerNames.has(item.name);
        }
        // For blobs, we would check blob existence here
        
        return {
          ...item,
          exists,
        };
      })
    );

    // Sort by last viewed (most recent first) and take top 5
    return itemsWithStatus
      .sort((a, b) => b.lastViewed.getTime() - a.lastViewed.getTime())
      .slice(0, 5);

  } catch (error) {
    console.error('Error fetching recently viewed items:', error);
    // Return empty array on error rather than failing the whole page
    return [];
  }
}

/**
 * Get cached recently viewed items
 */
export const getCachedRecentlyViewedItems = unstable_cache(
  getRecentlyViewedItems,
  ['recently-viewed'],
  {
    tags: ['recently-viewed', 'containers'],
    revalidate: 120, // Cache for 2 minutes
  }
);

/**
 * Add item to recently viewed (server action placeholder)
 * This would be implemented as a server action in production
 */
export async function addToRecentlyViewed(item: Omit<RecentlyViewedItem, 'lastViewed' | 'exists'>) {
  // In production, this would:
  // 1. Store in database/session
  // 2. Revalidate the recently viewed cache
  // 3. Limit to recent N items per user
  
  console.log('Would add to recently viewed:', item);
  
  // For demo purposes, we don't actually store anything
  // In a real implementation:
  // - Store in database with user ID
  // - Use revalidateTag to invalidate recently-viewed cache
}

/**
 * Get recently viewed containers for quick access
 */
export async function getRecentlyViewedContainers(): Promise<ContainerItem[]> {
  try {
    const recentItems = await getCachedRecentlyViewedItems();
    const containerItems: ContainerItem[] = [];
    
    for (const item of recentItems) {
      if (item.type === 'container' && item.exists) {
        // Get container details - this will use the cached container data
        const containers = await listContainers();
        const container = containers.find(c => c.name === item.name);
        
        if (container) {
          containerItems.push(container);
        }
      }
    }
    
    return containerItems;
  } catch (error) {
    console.error('Error fetching recently viewed containers:', error);
    return [];
  }
}

/**
 * Format last viewed time for display
 */
export function formatLastViewed(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Get icon for recently viewed item type
 */
export function getItemTypeIcon(type: RecentlyViewedItem['type']) {
  switch (type) {
    case 'container':
      return 'folder';
    case 'blob':
      return 'file';
    default:
      return 'item';
  }
}

/**
 * Cache configuration for recently viewed functionality
 */
export const RECENTLY_VIEWED_CACHE = {
  DURATION: 120, // 2 minutes
  TAGS: ['recently-viewed', 'containers'],
  MAX_ITEMS: 5,
} as const;
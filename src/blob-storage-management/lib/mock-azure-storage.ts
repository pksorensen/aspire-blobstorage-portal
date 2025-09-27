/**
 * Mock Azure Storage service for development and testing
 * 
 * This provides a fallback when Azure Storage emulator is not available
 * and creates mock data to allow the application to function during development.
 */

import {
  ContainerItem,
  BlobItem,
  StorageMetrics,
  BlobDownloadResponse,
  AzureStorageError,
  BlobListOptions,
  ContainerListOptions,
  BatchDeleteResult,
  BatchOperationResult,
  ContainerMetrics,
  StorageAccountInfo,
  PaginatedContainers,
  PaginatedBlobs,
  BlobSearchCriteria
} from '../types/azure-types';

// Mock data for development
const mockContainers: ContainerItem[] = [
  {
    name: 'documents',
    properties: {
      lastModified: new Date('2024-01-01'),
      etag: '"0x8DC123456789"',
      leaseStatus: 'unlocked',
      leaseState: 'available',
      publicAccess: 'none',
      hasImmutabilityPolicy: false,
      hasLegalHold: false,
    },
    metadata: {},
  },
  {
    name: 'images',
    properties: {
      lastModified: new Date('2024-01-02'),
      etag: '"0x8DC123456790"',
      leaseStatus: 'unlocked',
      leaseState: 'available',
      publicAccess: 'blob',
      hasImmutabilityPolicy: false,
      hasLegalHold: false,
    },
    metadata: { category: 'media' },
  },
  {
    name: 'backups',
    properties: {
      lastModified: new Date('2024-01-03'),
      etag: '"0x8DC123456791"',
      leaseStatus: 'unlocked',
      leaseState: 'available',
      publicAccess: 'none',
      hasImmutabilityPolicy: false,
      hasLegalHold: false,
    },
    metadata: {},
  },
];

const mockBlobs: Record<string, BlobItem[]> = {
  documents: [
    {
      name: 'report.pdf',
      properties: {
        lastModified: new Date('2024-01-01T10:00:00Z'),
        etag: '"0x8DC123456792"',
        contentLength: 1024000,
        contentType: 'application/pdf',
        blobType: 'BlockBlob',
        accessTier: 'Hot',
        accessTierInferred: false,
        leaseStatus: 'unlocked',
        leaseState: 'available',
        serverEncrypted: true,
      },
      metadata: { category: 'report' },
      tags: { project: 'q1-2024' },
    },
    {
      name: 'presentation.pptx',
      properties: {
        lastModified: new Date('2024-01-02T14:30:00Z'),
        etag: '"0x8DC123456793"',
        contentLength: 2048000,
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        blobType: 'BlockBlob',
        accessTier: 'Hot',
        accessTierInferred: false,
        leaseStatus: 'unlocked',
        leaseState: 'available',
        serverEncrypted: true,
      },
      metadata: { category: 'presentation' },
      tags: { project: 'q1-2024' },
    },
  ],
  images: [
    {
      name: 'logo.png',
      properties: {
        lastModified: new Date('2024-01-01T12:00:00Z'),
        etag: '"0x8DC123456794"',
        contentLength: 102400,
        contentType: 'image/png',
        blobType: 'BlockBlob',
        accessTier: 'Hot',
        accessTierInferred: false,
        leaseStatus: 'unlocked',
        leaseState: 'available',
        serverEncrypted: true,
      },
      metadata: { category: 'logo' },
      tags: { type: 'branding' },
    },
    {
      name: 'banner.jpg',
      properties: {
        lastModified: new Date('2024-01-03T09:15:00Z'),
        etag: '"0x8DC123456795"',
        contentLength: 512000,
        contentType: 'image/jpeg',
        blobType: 'BlockBlob',
        accessTier: 'Hot',
        accessTierInferred: false,
        leaseStatus: 'unlocked',
        leaseState: 'available',
        serverEncrypted: true,
      },
      metadata: { category: 'marketing' },
      tags: { type: 'banner', campaign: '2024' },
    },
  ],
  backups: [
    {
      name: 'database-backup-2024-01-01.bak',
      properties: {
        lastModified: new Date('2024-01-01T02:00:00Z'),
        etag: '"0x8DC123456796"',
        contentLength: 10485760,
        contentType: 'application/octet-stream',
        blobType: 'BlockBlob',
        accessTier: 'Cool',
        accessTierInferred: false,
        leaseStatus: 'unlocked',
        leaseState: 'available',
        serverEncrypted: true,
      },
      metadata: { type: 'database-backup' },
      tags: { backup: 'daily', year: '2024' },
    },
  ],
};

export class MockAzureStorageService {
  private isHealthy = true;
  private lastConnectionCheck = new Date();

  async listContainers(): Promise<ContainerItem[]> {
    console.log('[MOCK] Listing containers');
    return mockContainers;
  }

  async listBlobs(containerName: string, prefix?: string, maxResults?: number): Promise<BlobItem[]> {
    console.log(`[MOCK] Listing blobs in container: ${containerName}`);
    const blobs = mockBlobs[containerName] || [];
    
    let filteredBlobs = blobs;
    if (prefix) {
      filteredBlobs = blobs.filter(blob => blob.name.startsWith(prefix));
    }
    
    if (maxResults) {
      filteredBlobs = filteredBlobs.slice(0, maxResults);
    }
    
    return filteredBlobs;
  }

  async getBlobProperties(containerName: string, blobName: string): Promise<BlobItem> {
    console.log(`[MOCK] Getting blob properties: ${containerName}/${blobName}`);
    const blobs = mockBlobs[containerName] || [];
    const blob = blobs.find(b => b.name === blobName);
    
    if (!blob) {
      throw new AzureStorageError(
        `Blob '${blobName}' not found in container '${containerName}'`,
        404,
        'BLOB_NOT_FOUND'
      );
    }
    
    return blob;
  }

  async downloadBlob(containerName: string, blobName: string): Promise<BlobDownloadResponse> {
    console.log(`[MOCK] Downloading blob: ${containerName}/${blobName}`);
    const blob = await this.getBlobProperties(containerName, blobName);
    
    // Generate mock content based on content type
    let content: Buffer;
    if (blob.properties.contentType === 'text/plain') {
      content = Buffer.from(`Mock content for ${blobName}`);
    } else {
      content = Buffer.alloc(Math.min(blob.properties.contentLength, 1024), 0);
    }
    
    return {
      content,
      contentType: blob.properties.contentType,
      contentLength: blob.properties.contentLength,
      etag: blob.properties.etag,
      lastModified: blob.properties.lastModified,
      metadata: blob.metadata,
    };
  }

  async getStorageMetrics(): Promise<StorageMetrics> {
    console.log('[MOCK] Getting storage metrics');
    const totalBlobCount = Object.values(mockBlobs).reduce((sum, blobs) => sum + blobs.length, 0);
    const totalSize = Object.values(mockBlobs)
      .flat()
      .reduce((sum, blob) => sum + blob.properties.contentLength, 0);

    return {
      containerCount: mockContainers.length,
      blobCount: totalBlobCount,
      totalSize,
      usedCapacity: totalSize,
      lastUpdated: new Date(),
    };
  }

  async containerExists(containerName: string): Promise<boolean> {
    console.log(`[MOCK] Checking if container exists: ${containerName}`);
    return mockContainers.some(c => c.name === containerName);
  }

  async blobExists(containerName: string, blobName: string): Promise<boolean> {
    console.log(`[MOCK] Checking if blob exists: ${containerName}/${blobName}`);
    const blobs = mockBlobs[containerName] || [];
    return blobs.some(b => b.name === blobName);
  }

  async getContainerProperties(containerName: string): Promise<ContainerItem> {
    console.log(`[MOCK] Getting container properties: ${containerName}`);
    const container = mockContainers.find(c => c.name === containerName);
    
    if (!container) {
      throw new AzureStorageError(
        `Container '${containerName}' not found`,
        404,
        'CONTAINER_NOT_FOUND'
      );
    }
    
    return container;
  }

  async getContainerMetrics(containerName: string): Promise<ContainerMetrics> {
    console.log(`[MOCK] Getting container metrics: ${containerName}`);
    const container = await this.getContainerProperties(containerName);
    const blobs = mockBlobs[containerName] || [];
    const totalSize = blobs.reduce((sum, blob) => sum + blob.properties.contentLength, 0);

    return {
      name: containerName,
      blobCount: blobs.length,
      totalSize,
      lastModified: container.properties.lastModified,
      publicAccessLevel: container.properties.publicAccess,
      hasMetadata: Object.keys(container.metadata).length > 0,
    };
  }

  async searchBlobs(containerName: string, criteria: BlobSearchCriteria): Promise<BlobItem[]> {
    console.log(`[MOCK] Searching blobs in container: ${containerName}`);
    const blobs = mockBlobs[containerName] || [];
    
    return blobs.filter(blob => {
      if (criteria.namePattern) {
        const regex = new RegExp(criteria.namePattern, 'i');
        if (!regex.test(blob.name)) return false;
      }
      
      if (criteria.contentType && blob.properties.contentType !== criteria.contentType) {
        return false;
      }
      
      return true;
    });
  }

  async listContainersPaginated(options: ContainerListOptions = {}): Promise<PaginatedContainers> {
    console.log('[MOCK] Listing containers (paginated)');
    let containers = mockContainers;
    
    if (options.prefix) {
      containers = containers.filter(c => c.name.startsWith(options.prefix!));
    }
    
    if (options.maxResults) {
      containers = containers.slice(0, options.maxResults);
    }
    
    return {
      items: containers,
      pagination: {
        hasMore: false,
        pageSize: containers.length,
        currentPage: 1,
        totalItems: containers.length,
      },
    };
  }

  async listBlobsPaginated(containerName: string, options: BlobListOptions = {}): Promise<PaginatedBlobs> {
    console.log(`[MOCK] Listing blobs (paginated) in container: ${containerName}`);
    let blobs = mockBlobs[containerName] || [];
    
    if (options.prefix) {
      blobs = blobs.filter(b => b.name.startsWith(options.prefix!));
    }
    
    if (options.maxResults) {
      blobs = blobs.slice(0, options.maxResults);
    }
    
    return {
      items: blobs,
      pagination: {
        hasMore: false,
        pageSize: blobs.length,
        currentPage: 1,
        totalItems: blobs.length,
      },
    };
  }

  async batchDeleteBlobs(containerName: string, blobNames: string[]): Promise<BatchDeleteResult> {
    console.log(`[MOCK] Batch deleting blobs from container: ${containerName}`);
    
    const results: BatchOperationResult[] = blobNames.map(blobName => ({
      success: true,
      itemName: blobName,
    }));
    
    return {
      totalRequested: blobNames.length,
      successCount: blobNames.length,
      failureCount: 0,
      results,
    };
  }

  async getStorageAccountInfo(): Promise<StorageAccountInfo | null> {
    console.log('[MOCK] Getting storage account info');
    return {
      accountName: 'mockstorage',
      accountType: 'StorageV2',
      kind: 'StorageV2',
      location: 'East US',
      resourceGroup: 'mock-rg',
      subscriptionId: 'mock-subscription-id',
      sku: {
        name: 'Standard_RAGRS',
        tier: 'Standard',
      },
      properties: {
        creationTime: new Date('2024-01-01'),
        primaryEndpoints: {
          blob: 'https://mockstorage.blob.core.windows.net',
        },
        encryption: {
          services: {
            blob: { enabled: true },
          },
        },
      },
    };
  }

  async getConnectionHealth(): Promise<{
    isHealthy: boolean;
    lastChecked: Date;
    error?: string;
  }> {
    console.log('[MOCK] Getting connection health');
    return {
      isHealthy: this.isHealthy,
      lastChecked: this.lastConnectionCheck,
    };
  }

  resetCache(): void {
    console.log('[MOCK] Cache reset requested');
  }

  getConfigInfo() {
    return {
      accountName: 'mockstorage',
      blobEndpoint: 'https://mockstorage.blob.core.windows.net',
      defaultTimeout: 30000,
      maxRetryAttempts: 3,
      retryDelayInMs: 1000,
    };
  }
}

export const mockAzureStorage = new MockAzureStorageService();
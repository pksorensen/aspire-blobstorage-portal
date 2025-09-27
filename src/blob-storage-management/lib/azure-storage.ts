/**
 * Azure Storage SDK wrapper for React Server Components
 * 
 * This module provides a clean interface for Azure Blob Storage operations
 * designed specifically for use in React Server Components. All functions
 * are async and designed to be called directly from RSCs.
 * 
 * Security: Connection strings and credentials are server-side only.
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobBatchClient
} from '@azure/storage-blob';
import { unstable_cache } from 'next/cache';
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
  AzureStorageConfig,
  EnvironmentConfig,
  PaginatedContainers,
  PaginatedBlobs,
  BlobSearchCriteria
} from '../types/azure-types';
import { mockAzureStorage } from './mock-azure-storage';

// Configuration and Environment
const getEnvironmentConfig = (): EnvironmentConfig => {
  return {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    enableTelemetry: process.env.AZURE_STORAGE_ENABLE_TELEMETRY === 'true',
    enableCaching: process.env.AZURE_STORAGE_ENABLE_CACHING !== 'false',
    defaultCacheTTL: parseInt(process.env.AZURE_STORAGE_CACHE_TTL || '60'),
    maxUploadSizeBytes: parseInt(process.env.AZURE_STORAGE_MAX_UPLOAD_SIZE || '104857600'), // 100MB default
    allowedFileTypes: process.env.AZURE_STORAGE_ALLOWED_FILE_TYPES?.split(','),
    maxConcurrentUploads: parseInt(process.env.AZURE_STORAGE_MAX_CONCURRENT_UPLOADS || '3'),
  };
};

const getAzureStorageConfig = (): AzureStorageConfig => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
  const blobEndpoint = process.env.AZURE_STORAGE_BLOB_ENDPOINT;

  return {
    connectionString: connectionString || '',
    accountName,
    accountKey,
    sasToken,
    blobEndpoint,
    defaultTimeout: parseInt(process.env.AZURE_STORAGE_TIMEOUT || '30000'),
    maxRetryAttempts: parseInt(process.env.AZURE_STORAGE_MAX_RETRIES || '3'),
    retryDelayInMs: parseInt(process.env.AZURE_STORAGE_RETRY_DELAY || '1000'),
  };
};

/**
 * Azure Storage client singleton
 * Enhanced with comprehensive error handling, connection management, and performance monitoring
 */
class AzureStorageService {
  private blobServiceClient: BlobServiceClient | null = null;
  private blobBatchClient: BlobBatchClient | null = null;
  private config: AzureStorageConfig;
  private envConfig: EnvironmentConfig;
  private connectionHealthy: boolean = true;
  private lastConnectionCheck: Date = new Date();
  private readonly CONNECTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.config = getAzureStorageConfig();
    this.envConfig = getEnvironmentConfig();
  }

  private async checkConnection(): Promise<boolean> {
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - this.lastConnectionCheck.getTime();

    if (timeSinceLastCheck < this.CONNECTION_CHECK_INTERVAL && this.connectionHealthy) {
      return this.connectionHealthy;
    }

    try {
      const client = this.getBlobServiceClient();
      await client.getAccountInfo();
      this.connectionHealthy = true;
      this.lastConnectionCheck = now;
      return true;
    } catch (error) {
      this.connectionHealthy = false;
      this.lastConnectionCheck = now;
      console.error('Azure Storage connection check failed:', error);
      return false;
    }
  }

  private getBlobServiceClient(): BlobServiceClient {
    if (!this.blobServiceClient) {
      const { connectionString, accountName, accountKey, sasToken, blobEndpoint } = this.config;
      
      if (!connectionString && (!accountName || (!accountKey && !sasToken))) {
        throw new AzureStorageError(
          'Azure Storage configuration missing. Please provide either connection string or account name with key/SAS token.',
          500,
          'MISSING_CONFIGURATION'
        );
      }
console.log("Creating blob storage client: " + connectionString);
      try {
        if (connectionString) {
          
          this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        } else if (accountName && accountKey) {
          const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
          const serviceURL = blobEndpoint || `https://${accountName}.blob.core.windows.net`;
          this.blobServiceClient = new BlobServiceClient(serviceURL, sharedKeyCredential);
        } else if (accountName && sasToken) {
          const serviceURL = blobEndpoint || `https://${accountName}.blob.core.windows.net`;
          this.blobServiceClient = new BlobServiceClient(`${serviceURL}?${sasToken}`);
        } else {
          throw new Error('Invalid configuration combination');
        }

        // Initialize batch client
        this.blobBatchClient = this.blobServiceClient.getBlobBatchClient();
      } catch (error: any) {
        throw new AzureStorageError(
          `Failed to initialize Azure Storage client: ${error.message}`,
          500,
          'CLIENT_INITIALIZATION_ERROR',
          undefined,
          { originalError: error }
        );
      }
    }

    return this.blobServiceClient;
  }

  private getBlobBatchClient(): BlobBatchClient {
    if (!this.blobBatchClient) {
      this.getBlobServiceClient(); // This will initialize both clients
    }
    return this.blobBatchClient!;
  }

  private handleError(error: any, operation: string, resource?: string): AzureStorageError {
    const statusCode = error.statusCode || error.status || 500;
    const code = error.code || error.name || 'UNKNOWN_ERROR';
    const requestId = error.requestId || error.request?.requestId;
    
    const message = error.message || `Failed to ${operation}`;
    const enhancedMessage = resource 
      ? `${message} for resource '${resource}'`
      : message;

    return new AzureStorageError(
      enhancedMessage,
      statusCode,
      code,
      requestId,
      {
        operation,
        resource,
        timestamp: new Date().toISOString(),
        originalError: error
      }
    );
  }

  /**
   * List all containers in the storage account
   * Optimized for RSC with caching
   */
  async listContainers(): Promise<ContainerItem[]> {
    console.log('listContainers called', this);
    const client = this.getBlobServiceClient();
    return await unstable_cache(
      async () => {
        try {
         
          const containers: ContainerItem[] = [];

          for await (const container of client.listContainers({ includeMetadata: true })) {
            containers.push({
              name: container.name,
              properties: {
                lastModified: container.properties.lastModified,
                etag: container.properties.etag,
                leaseStatus: container.properties.leaseStatus as 'locked' | 'unlocked',
                leaseState: container.properties.leaseState as any,
                publicAccess: (container.properties.publicAccess || 'none') as any,
                hasImmutabilityPolicy: container.properties.hasImmutabilityPolicy,
                hasLegalHold: container.properties.hasLegalHold,
              },
              metadata: container.metadata || {},
            });
          }

          return containers;
        } catch (error: any) {
          throw new AzureStorageError(
            `Failed to list containers: ${error.message}`,
            error.statusCode || 500,
            error.code || 'LIST_CONTAINERS_ERROR'
          );
        }
      },
      ['containers'],
      { 
        tags: ['containers'],
        revalidate: 60 // Cache for 60 seconds
      }
    )();
  }

  /**
   * List blobs in a specific container
   * Supports prefix filtering and pagination
   */
  async listBlobs(containerName: string, prefix?: string, maxResults?: number): Promise<BlobItem[]> {
    return await unstable_cache(
      async () => {
        try {
          const client = this.getBlobServiceClient();
          const containerClient = client.getContainerClient(containerName);
          const blobs: BlobItem[] = [];

          const options: any = {
            includeMetadata: true,
            includeTags: true,
            prefix,
          };

          if (maxResults) {
            options.maxPageSize = maxResults;
          }

          for await (const blob of containerClient.listBlobsFlat(options)) {
            blobs.push({
              name: blob.name,
              deleted: blob.deleted,
              snapshot: blob.snapshot,
              versionId: blob.versionId,
              isCurrentVersion: blob.isCurrentVersion,
              properties: {
                lastModified: blob.properties.lastModified,
                etag: blob.properties.etag,
                contentLength: blob.properties.contentLength || 0,
                contentType: blob.properties.contentType || 'application/octet-stream',
                contentEncoding: blob.properties.contentEncoding,
                contentLanguage: blob.properties.contentLanguage,
                contentMD5: blob.properties.contentMD5,
                cacheControl: blob.properties.cacheControl,
                contentDisposition: blob.properties.contentDisposition,
                blobType: blob.properties.blobType as any,
                accessTier: blob.properties.accessTier as any,
                accessTierInferred: blob.properties.accessTierInferred,
                leaseStatus: blob.properties.leaseStatus as any,
                leaseState: blob.properties.leaseState as any,
                serverEncrypted: blob.properties.serverEncrypted,
                customerProvidedKeySha256: blob.properties.customerProvidedKeySha256,
                encryptionScope: blob.properties.encryptionScope,
                accessTierChangeTime: blob.properties.accessTierChangedOn,
              },
              metadata: blob.metadata || {},
              tags: blob.tags,
            });
          }

          return blobs;
        } catch (error: any) {
          throw new AzureStorageError(
            `Failed to list blobs in container '${containerName}': ${error.message}`,
            error.statusCode || 500,
            error.code || 'LIST_BLOBS_ERROR'
          );
        }
      },
      ['blobs', containerName, prefix || '', maxResults?.toString() || ''],
      {
        tags: ['blobs', `container:${containerName}`],
        revalidate: 30
      }
    )();
  }

  /**
   * Get detailed blob properties
   * Cached for performance
   */
  async getBlobProperties(containerName: string, blobName: string): Promise<BlobItem> {
    return await unstable_cache(
      async () => {
        try {
          const client = this.getBlobServiceClient();
          const blobClient = client.getContainerClient(containerName).getBlobClient(blobName);
          
          const properties = await blobClient.getProperties();
          const tagResponse = await blobClient.getTags().catch(() => null);
          const tags = tagResponse?.tags || {};

          return {
            name: blobName,
            properties: {
              lastModified: properties.lastModified || new Date(),
              etag: properties.etag || '',
              contentLength: properties.contentLength || 0,
              contentType: properties.contentType || 'application/octet-stream',
              contentEncoding: properties.contentEncoding,
              contentLanguage: properties.contentLanguage,
              contentMD5: properties.contentMD5,
              cacheControl: properties.cacheControl,
              contentDisposition: properties.contentDisposition,
              blobType: properties.blobType as any,
              accessTier: properties.accessTier as any,
              accessTierInferred: properties.accessTierInferred,
              leaseStatus: properties.leaseStatus as any,
              leaseState: properties.leaseState as any,
              serverEncrypted: properties.isServerEncrypted,
              customerProvidedKeySha256: (properties as any).customerProvidedKeySha256,
              encryptionScope: properties.encryptionScope,
              accessTierChangeTime: properties.accessTierChangedOn,
            },
            metadata: properties.metadata || {},
            tags,
          };
        } catch (error: any) {
          throw new AzureStorageError(
            `Failed to get blob properties for '${blobName}' in container '${containerName}': ${error.message}`,
            error.statusCode || 500,
            error.code || 'GET_BLOB_PROPERTIES_ERROR'
          );
        }
      },
      ['blob-properties', containerName, blobName],
      {
        tags: ['blob-properties', `container:${containerName}`, `blob:${blobName}`],
        revalidate: 60
      }
    )();
  }

  /**
   * Download blob content as Buffer
   * Not cached due to potentially large size
   */
  async downloadBlob(containerName: string, blobName: string): Promise<BlobDownloadResponse> {
    try {
      const client = this.getBlobServiceClient();
      const blobClient = client.getContainerClient(containerName).getBlobClient(blobName);
      
      const downloadResponse = await blobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new AzureStorageError(
          'No readable stream body in download response',
          500,
          'DOWNLOAD_STREAM_ERROR'
        );
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
      }
      const content = Buffer.concat(chunks);

      return {
        content,
        contentType: downloadResponse.contentType,
        contentLength: downloadResponse.contentLength,
        etag: downloadResponse.etag,
        lastModified: downloadResponse.lastModified,
        metadata: downloadResponse.metadata,
      };
    } catch (error: any) {
      throw new AzureStorageError(
        `Failed to download blob '${blobName}' from container '${containerName}': ${error.message}`,
        error.statusCode || 500,
        error.code || 'DOWNLOAD_BLOB_ERROR'
      );
    }
  }

  /**
   * Get storage account metrics
   * Cached for performance
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    return await unstable_cache(
      async () => {
        try {
          const containers = await this.listContainers();
          let totalBlobCount = 0;
          let totalSize = 0;

          for (const container of containers) {
            const blobs = await this.listBlobs(container.name);
            totalBlobCount += blobs.length;
            totalSize += blobs.reduce((sum, blob) => sum + blob.properties.contentLength, 0);
          }

          return {
            containerCount: containers.length,
            blobCount: totalBlobCount,
            totalSize,
            usedCapacity: totalSize,
            lastUpdated: new Date(),
          };
        } catch (error: any) {
          throw new AzureStorageError(
            `Failed to get storage metrics: ${error.message}`,
            error.statusCode || 500,
            error.code || 'GET_METRICS_ERROR'
          );
        }
      },
      ['storage-metrics'],
      {
        tags: ['storage-metrics'],
        revalidate: 300 // Cache for 5 minutes
      }
    )();
  }

  /**
   * Check if a container exists
   * Cached for performance
   */
  async containerExists(containerName: string): Promise<boolean> {
    return await unstable_cache(
      async () => {
        try {
          const client = this.getBlobServiceClient();
          const containerClient = client.getContainerClient(containerName);
          return await containerClient.exists();
        } catch {
          return false;
        }
      },
      ['container-exists', containerName],
      {
        tags: ['container-exists', `container:${containerName}`],
        revalidate: 60
      }
    )();
  }

  /**
   * Check if a blob exists
   * Cached for performance
   */
  async blobExists(containerName: string, blobName: string): Promise<boolean> {
    return await unstable_cache(
      async () => {
        try {
          const client = this.getBlobServiceClient();
          const blobClient = client.getContainerClient(containerName).getBlobClient(blobName);
          return await blobClient.exists();
        } catch {
          return false;
        }
      },
      ['blob-exists', containerName, blobName],
      {
        tags: ['blob-exists', `container:${containerName}`, `blob:${blobName}`],
        revalidate: 30
      }
    )();
  }

  /**
   * Get detailed container properties
   */
  async getContainerProperties(containerName: string): Promise<ContainerItem> {
    return await unstable_cache(
      async () => {
        try {
          await this.checkConnection();
          const client = this.getBlobServiceClient();
          const containerClient = client.getContainerClient(containerName);
          
          const properties = await containerClient.getProperties();
          const metadata = await containerClient.getAccessPolicy().then(
            result => (result as any).metadata || {}
          ).catch(() => ({}));

          return {
            name: containerName,
            properties: {
              lastModified: properties.lastModified!,
              etag: properties.etag!,
              leaseStatus: properties.leaseStatus as any,
              leaseState: properties.leaseState as any,
              publicAccess: (properties.blobPublicAccess || 'none') as any,
              hasImmutabilityPolicy: properties.hasImmutabilityPolicy,
              hasLegalHold: properties.hasLegalHold,
              defaultEncryptionScope: properties.defaultEncryptionScope,
              preventEncryptionScopeOverride: properties.denyEncryptionScopeOverride,
            },
            metadata,
          };
        } catch (error: any) {
          throw this.handleError(error, 'get container properties', containerName);
        }
      },
      ['container-properties', containerName],
      {
        tags: ['container-properties', `container:${containerName}`],
        revalidate: this.envConfig.defaultCacheTTL
      }
    )();
  }

  /**
   * Get container metrics
   */
  async getContainerMetrics(containerName: string): Promise<ContainerMetrics> {
    return await unstable_cache(
      async () => {
        try {
          await this.checkConnection();
          const containerItem = await this.getContainerProperties(containerName);
          const blobs = await this.listBlobs(containerName);

          const totalSize = blobs.reduce((sum, blob) => sum + blob.properties.contentLength, 0);

          return {
            name: containerName,
            blobCount: blobs.length,
            totalSize,
            lastModified: containerItem.properties.lastModified,
            publicAccessLevel: containerItem.properties.publicAccess,
            hasMetadata: Object.keys(containerItem.metadata).length > 0,
          };
        } catch (error: any) {
          throw this.handleError(error, 'get container metrics', containerName);
        }
      },
      ['container-metrics', containerName],
      {
        tags: ['container-metrics', `container:${containerName}`],
        revalidate: this.envConfig.defaultCacheTTL
      }
    )();
  }

  /**
   * Search blobs with advanced criteria
   */
  async searchBlobs(containerName: string, criteria: BlobSearchCriteria): Promise<BlobItem[]> {
    try {
      await this.checkConnection();
      const allBlobs = await this.listBlobs(containerName);

      return allBlobs.filter(blob => {
        // Name pattern filter
        if (criteria.namePattern) {
          const regex = new RegExp(criteria.namePattern, 'i');
          if (!regex.test(blob.name)) return false;
        }

        // Content type filter
        if (criteria.contentType && blob.properties.contentType !== criteria.contentType) {
          return false;
        }

        // Size filters
        if (criteria.minSize && blob.properties.contentLength < criteria.minSize) {
          return false;
        }
        if (criteria.maxSize && blob.properties.contentLength > criteria.maxSize) {
          return false;
        }

        // Date filters
        if (criteria.modifiedAfter && blob.properties.lastModified < criteria.modifiedAfter) {
          return false;
        }
        if (criteria.modifiedBefore && blob.properties.lastModified > criteria.modifiedBefore) {
          return false;
        }

        // Access tier filter
        if (criteria.accessTier && blob.properties.accessTier !== criteria.accessTier) {
          return false;
        }

        // Tags filter
        if (criteria.tags && blob.tags) {
          for (const [key, value] of Object.entries(criteria.tags)) {
            if (blob.tags[key] !== value) return false;
          }
        }

        // Metadata filter
        if (criteria.metadata) {
          for (const [key, value] of Object.entries(criteria.metadata)) {
            if (blob.metadata[key] !== value) return false;
          }
        }

        return true;
      });
    } catch (error: any) {
      throw this.handleError(error, 'search blobs', containerName);
    }
  }

  /**
   * List containers with pagination
   */
  async listContainersPaginated(options: ContainerListOptions = {}): Promise<PaginatedContainers> {
    try {
      await this.checkConnection();
      const client = this.getBlobServiceClient();
      const containers: ContainerItem[] = [];
      
      const listOptions = {
        includeMetadata: options.includeMetadata ?? true,
        prefix: options.prefix,
      };

      let pageCount = 0;
      const maxPages = options.maxResults ? Math.ceil(options.maxResults / 50) : undefined;

      for await (const page of client.listContainers(listOptions).byPage({ maxPageSize: 50 })) {
        if (maxPages && pageCount >= maxPages) break;
        
        for (const container of page.containerItems) {
          containers.push({
            name: container.name,
            properties: {
              lastModified: container.properties.lastModified,
              etag: container.properties.etag,
              leaseStatus: container.properties.leaseStatus as any,
              leaseState: container.properties.leaseState as any,
              publicAccess: (container.properties.publicAccess || 'none') as any,
              hasImmutabilityPolicy: container.properties.hasImmutabilityPolicy,
              hasLegalHold: container.properties.hasLegalHold,
            },
            metadata: container.metadata || {},
          });
        }
        pageCount++;
      }

      return {
        items: containers,
        pagination: {
          hasMore: maxPages ? pageCount >= maxPages : false,
          pageSize: 50,
          currentPage: 1,
          totalItems: containers.length,
        },
      };
    } catch (error: any) {
      throw this.handleError(error, 'list containers paginated');
    }
  }

  /**
   * List blobs with pagination
   */
  async listBlobsPaginated(containerName: string, options: BlobListOptions = {}): Promise<PaginatedBlobs> {
    try {
      await this.checkConnection();
      const client = this.getBlobServiceClient();
      const containerClient = client.getContainerClient(containerName);
      const blobs: BlobItem[] = [];

      const listOptions = {
        includeMetadata: options.includeMetadata ?? true,
        includeTags: options.includeTags ?? true,
        includeSnapshots: options.includeSnapshots ?? false,
        includeVersions: options.includeVersions ?? false,
        includeDeleted: options.includeDeleted ?? false,
        includeUncommittedBlobs: options.includeUncommittedBlobs ?? false,
        prefix: options.prefix,
      };

      let pageCount = 0;
      const maxPages = options.maxResults ? Math.ceil(options.maxResults / 50) : undefined;

      for await (const page of containerClient.listBlobsFlat(listOptions).byPage({ maxPageSize: 50 })) {
        if (maxPages && pageCount >= maxPages) break;
        
        for (const blob of page.segment.blobItems) {
          blobs.push({
            name: blob.name,
            deleted: blob.deleted,
            snapshot: blob.snapshot,
            versionId: blob.versionId,
            isCurrentVersion: blob.isCurrentVersion,
            properties: {
              lastModified: blob.properties.lastModified,
              etag: blob.properties.etag,
              contentLength: blob.properties.contentLength || 0,
              contentType: blob.properties.contentType || 'application/octet-stream',
              contentEncoding: blob.properties.contentEncoding,
              contentLanguage: blob.properties.contentLanguage,
              contentMD5: blob.properties.contentMD5,
              cacheControl: blob.properties.cacheControl,
              contentDisposition: blob.properties.contentDisposition,
              blobType: blob.properties.blobType as any,
              accessTier: blob.properties.accessTier as any,
              accessTierInferred: blob.properties.accessTierInferred,
              leaseStatus: blob.properties.leaseStatus as any,
              leaseState: blob.properties.leaseState as any,
              serverEncrypted: blob.properties.serverEncrypted,
              customerProvidedKeySha256: blob.properties.customerProvidedKeySha256,
              encryptionScope: blob.properties.encryptionScope,
              accessTierChangeTime: blob.properties.accessTierChangedOn,
            },
            metadata: blob.metadata || {},
            tags: blob.tags,
          });
        }
        pageCount++;
      }

      return {
        items: blobs,
        pagination: {
          hasMore: maxPages ? pageCount >= maxPages : false,
          pageSize: 50,
          currentPage: 1,
          totalItems: blobs.length,
        },
      };
    } catch (error: any) {
      throw this.handleError(error, 'list blobs paginated', containerName);
    }
  }

  /**
   * Batch delete multiple blobs
   */
  async batchDeleteBlobs(containerName: string, blobNames: string[]): Promise<BatchDeleteResult> {
    try {
      await this.checkConnection();
      const batchClient = this.getBlobBatchClient();
      const containerClient = this.getBlobServiceClient().getContainerClient(containerName);
      
      const results: BatchOperationResult[] = [];
      let successCount = 0;
      let failureCount = 0;

      // Process in batches of 256 (Azure limit)
      const batchSize = 256;
      for (let i = 0; i < blobNames.length; i += batchSize) {
        const batch = blobNames.slice(i, i + batchSize);
        const batchDeleteRequest = batchClient.createBatch();

        for (const blobName of batch) {
          const blobClient = containerClient.getBlobClient(blobName);
          batchDeleteRequest.deleteBlob(blobClient);
        }

        try {
          const response = await batchClient.submitBatch(batchDeleteRequest);
          
          for (let j = 0; j < batch.length; j++) {
            const blobName = batch[j];
            const subResponse = response.subResponses[j];
            
            if (subResponse.status >= 200 && subResponse.status < 300) {
              results.push({
                success: true,
                itemName: blobName,
              });
              successCount++;
            } else {
              results.push({
                success: false,
                error: (subResponse as any).errorMessage || `Delete failed with status ${subResponse.status}`,
                itemName: blobName,
              });
              failureCount++;
            }
          }
        } catch (error: any) {
          // If batch fails, mark all items in batch as failed
          for (const blobName of batch) {
            results.push({
              success: false,
              error: error.message || 'Batch delete failed',
              itemName: blobName,
            });
            failureCount++;
          }
        }
      }

      return {
        totalRequested: blobNames.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error: any) {
      throw this.handleError(error, 'batch delete blobs', containerName);
    }
  }

  /**
   * Get storage account information
   */
  async getStorageAccountInfo(): Promise<StorageAccountInfo | null> {
    return await unstable_cache(
      async () => {
        try {
          await this.checkConnection();
          const client = this.getBlobServiceClient();
          const accountInfo = await client.getAccountInfo();
          
          // Basic account info from the SDK is limited, 
          // so we construct what we can from available data
          const serviceURL = client.url;
          const accountName = this.config.accountName || 
            serviceURL.match(/https?:\/\/([^.]+)\.blob\.core\.windows\.net/)?.[1] || 'unknown';

          return {
            accountName,
            accountType: accountInfo.accountKind || 'StorageV2',
            kind: accountInfo.accountKind || 'StorageV2',
            location: 'unknown', // Not available from blob service
            resourceGroup: 'unknown', // Not available from blob service
            subscriptionId: 'unknown', // Not available from blob service
            sku: {
              name: accountInfo.skuName || 'Standard_RAGRS',
              tier: 'Standard',
            },
            properties: {
              creationTime: new Date(), // Placeholder
              primaryEndpoints: {
                blob: serviceURL,
              },
              encryption: {
                services: {
                  blob: { enabled: true },
                },
              },
            },
          };
        } catch (error: any) {
          console.warn('Could not get storage account info:', error.message);
          return null;
        }
      },
      ['storage-account-info'],
      {
        tags: ['storage-account-info'],
        revalidate: 3600 // Cache for 1 hour
      }
    )();
  }

  /**
   * Get connection health status
   */
  async getConnectionHealth(): Promise<{
    isHealthy: boolean;
    lastChecked: Date;
    error?: string;
  }> {
    try {
      const isHealthy = await this.checkConnection();
      return {
        isHealthy,
        lastChecked: this.lastConnectionCheck,
      };
    } catch (error: any) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Clear all cached data
   */
  resetCache(): void {
    // This would be implemented with a proper cache invalidation mechanism
    console.log('Cache reset requested');
  }

  /**
   * Get configuration info (sanitized for client)
   */
  getConfigInfo(): Omit<AzureStorageConfig, 'connectionString' | 'accountKey' | 'sasToken'> {
    return {
      accountName: this.config.accountName,
      blobEndpoint: this.config.blobEndpoint,
      defaultTimeout: this.config.defaultTimeout,
      maxRetryAttempts: this.config.maxRetryAttempts,
      retryDelayInMs: this.config.retryDelayInMs,
    };
  }
}


// Determine which service to use based on configuration and environment
let activeService: AzureStorageService | typeof mockAzureStorage;

try {
  activeService = new AzureStorageService();
  console.log('Azure Storage service initialized');
} catch (error: any) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('Azure Storage service initialization failed, using mock service:', error.message);
    activeService = mockAzureStorage;
  } else {
    throw error;
  }
}

// Export singleton instance
export const azureStorage = activeService;

// Export individual functions for direct import with proper binding
export const listContainers = activeService.listContainers.bind(activeService);
export const listBlobs = activeService.listBlobs.bind(activeService);
export const getBlobProperties = activeService.getBlobProperties.bind(activeService);
export const downloadBlob = activeService.downloadBlob.bind(activeService);
export const getStorageMetrics = activeService.getStorageMetrics.bind(activeService);
export const containerExists = activeService.containerExists.bind(activeService);
export const blobExists = activeService.blobExists.bind(activeService);
export const getContainerProperties = activeService.getContainerProperties.bind(activeService);
export const getContainerMetrics = activeService.getContainerMetrics.bind(activeService);
export const searchBlobs = activeService.searchBlobs.bind(activeService);
export const listContainersPaginated = activeService.listContainersPaginated.bind(activeService);
export const listBlobsPaginated = activeService.listBlobsPaginated.bind(activeService);
export const batchDeleteBlobs = activeService.batchDeleteBlobs.bind(activeService);
export const getStorageAccountInfo = activeService.getStorageAccountInfo.bind(activeService);
export const getConnectionHealth = activeService.getConnectionHealth.bind(activeService);

// Export configuration helpers
export { getEnvironmentConfig, getAzureStorageConfig };
/**
 * Comprehensive TypeScript type definitions for Azure Storage operations
 * 
 * This module provides type definitions that mirror Azure Storage SDK types
 * but are optimized for React Server Components and Next.js applications.
 * 
 * All types are designed to be serializable and suitable for RSC data flow.
 */

import { BlobHTTPHeaders, Metadata } from '@azure/storage-blob';

// Core Azure Storage Entities

export interface ContainerItem {
  name: string;
  properties: ContainerProperties;
  metadata: Record<string, string>;
}

export interface ContainerProperties {
  lastModified: Date;
  etag: string;
  leaseStatus: 'locked' | 'unlocked';
  leaseState: 'available' | 'leased' | 'expired' | 'breaking' | 'broken';
  publicAccess: 'none' | 'blob' | 'container';
  hasImmutabilityPolicy?: boolean;
  hasLegalHold?: boolean;
  defaultEncryptionScope?: string;
  preventEncryptionScopeOverride?: boolean;
}

export interface BlobItem {
  name: string;
  deleted?: boolean;
  snapshot?: string;
  versionId?: string;
  isCurrentVersion?: boolean;
  properties: BlobProperties;
  metadata: Record<string, string>;
  tags?: Record<string, string>;
}

export interface BlobProperties {
  lastModified: Date;
  createdOn?: Date;
  etag: string;
  contentLength: number;
  contentType: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentMD5?: Uint8Array;
  cacheControl?: string;
  contentDisposition?: string;
  blobSequenceNumber?: number;
  blobType: 'BlockBlob' | 'PageBlob' | 'AppendBlob';
  copyCompletionTime?: Date;
  copyStatusDescription?: string;
  copyId?: string;
  copyProgress?: string;
  copySource?: string;
  copyStatus?: 'pending' | 'success' | 'aborted' | 'failed';
  leaseDuration?: 'infinite' | 'fixed';
  leaseState: 'available' | 'leased' | 'expired' | 'breaking' | 'broken';
  leaseStatus: 'locked' | 'unlocked';
  accessTier?: 'Hot' | 'Cool' | 'Archive';
  accessTierInferred?: boolean;
  archiveStatus?: 'rehydrate-pending-to-hot' | 'rehydrate-pending-to-cool';
  customerProvidedKeySha256?: string;
  encryptionScope?: string;
  accessTierChangeTime?: Date;
  tagCount?: number;
  expiresOn?: Date;
  isSealed?: boolean;
  rehydratePriority?: 'High' | 'Standard';
  lastAccessedOn?: Date;
  immutabilityPolicyExpiresOn?: Date;
  immutabilityPolicyMode?: 'Mutable' | 'Unlocked' | 'Locked';
  legalHold?: boolean;
  serverEncrypted?: boolean;
}

// Storage Account and Metrics

export interface StorageAccountInfo {
  accountName: string;
  accountType: string;
  kind: string;
  location: string;
  resourceGroup: string;
  subscriptionId: string;
  sku: {
    name: string;
    tier: string;
  };
  properties: {
    creationTime: Date;
    primaryEndpoints: {
      blob: string;
      queue?: string;
      table?: string;
      file?: string;
    };
    encryption: {
      services: {
        blob: { enabled: boolean };
        file?: { enabled: boolean };
      };
    };
  };
}

export interface StorageMetrics {
  containerCount: number;
  blobCount: number;
  totalSize: number;
  usedCapacity: number;
  lastUpdated: Date;
  storageAccount?: StorageAccountInfo;
}

export interface ContainerMetrics {
  name: string;
  blobCount: number;
  totalSize: number;
  lastModified: Date;
  publicAccessLevel: 'none' | 'blob' | 'container';
  hasMetadata: boolean;
}

// Operation Options

export interface CreateContainerOptions {
  metadata?: Record<string, string>;
  publicAccess?: 'none' | 'blob' | 'container';
  containerEncryptionScope?: {
    defaultEncryptionScope?: string;
    preventEncryptionScopeOverride?: boolean;
  };
}

export interface UploadBlobOptions {
  blobHTTPHeaders?: BlobHTTPHeaders;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  tier?: 'Hot' | 'Cool' | 'Archive';
  conditions?: BlobRequestConditions;
  onProgress?: (progress: TransferProgress) => void;
}

export interface BlobRequestConditions {
  ifModifiedSince?: Date;
  ifUnmodifiedSince?: Date;
  ifMatch?: string;
  ifNoneMatch?: string;
  ifTags?: string;
}

export interface TransferProgress {
  loadedBytes: number;
  totalBytes?: number;
}

// Download and Response Types

export interface BlobDownloadResponse {
  content: Buffer;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  blobType?: string;
  copyCompletionTime?: Date;
  copyStatusDescription?: string;
  copyId?: string;
  copyProgress?: string;
  copySource?: string;
  copyStatus?: string;
  isServerEncrypted?: boolean;
  encryptionKeySha256?: string;
  encryptionScope?: string;
  blobCommittedBlockCount?: number;
  versionId?: string;
  isCurrentVersion?: boolean;
  tagCount?: number;
  objectReplicationPolicyId?: string;
  objectReplicationRules?: Record<string, string>;
  rehydratePriority?: 'High' | 'Standard';
  sealed?: boolean;
  lastAccessedOn?: Date;
  immutabilityPolicyExpiresOn?: Date;
  immutabilityPolicyMode?: 'Mutable' | 'Unlocked' | 'Locked';
  legalHold?: boolean;
}

export interface BlobStreamResponse {
  stream: NodeJS.ReadableStream;
  properties: BlobProperties;
  metadata: Record<string, string>;
  tags?: Record<string, string>;
}

// Search and Filtering

export interface BlobListOptions {
  prefix?: string;
  maxResults?: number;
  includeMetadata?: boolean;
  includeTags?: boolean;
  includeSnapshots?: boolean;
  includeVersions?: boolean;
  includeDeleted?: boolean;
  includeUncommittedBlobs?: boolean;
}

export interface ContainerListOptions {
  prefix?: string;
  maxResults?: number;
  includeMetadata?: boolean;
  includeDeleted?: boolean;
}

export interface BlobSearchCriteria {
  namePattern?: string;
  contentType?: string;
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  accessTier?: 'Hot' | 'Cool' | 'Archive';
  tags?: Record<string, string>;
  metadata?: Record<string, string>;
}

// Batch Operations

export interface BatchOperationResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  itemName: string;
}

export interface BatchDeleteResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BatchOperationResult[];
}

export interface BatchCopyResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BatchOperationResult<{ etag: string; lastModified: Date }>[];
}

export interface BatchMetadataUpdateResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BatchOperationResult[];
}

// Access Control and Security

export interface SharedAccessSignature {
  permissions: string;
  expiresOn: Date;
  startsOn?: Date;
  identifier?: string;
  protocol?: 'https' | 'https,http';
  ipRange?: {
    start: string;
    end?: string;
  };
  resource: 'b' | 'c' | 'bs' | 'bv'; // blob, container, blob snapshot, blob version
}

export interface AccessPolicy {
  id: string;
  permissions: string;
  startsOn?: Date;
  expiresOn?: Date;
}

export interface ContainerAccessPolicy {
  publicAccess?: 'none' | 'blob' | 'container';
  signedIdentifiers?: AccessPolicy[];
}

// Error Handling

export class AzureStorageError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly requestId?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string, 
    statusCode: number, 
    code: string, 
    requestId?: string, 
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AzureStorageError';
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export interface StorageErrorInfo {
  code: string;
  message: string;
  statusCode?: number;
  requestId?: string;
  timestamp: Date;
  operation: string;
  resource?: string;
}

// Server Action Types

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
  requestId?: string;
  duration?: number;
  [key: string]: any;
};

export interface FormUploadProgress {
  loaded: number;
  total: number;
  percent: number;
  speed: number;
  timeRemaining?: number;
}

// Caching and Performance

export interface CacheStrategy {
  ttl: number; // Time to live in seconds
  tags: string[];
  revalidateOnMutation?: boolean;
}

export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
  cacheHit?: boolean;
  bytesTransferred?: number;
}

// Event and Monitoring Types

export interface StorageEvent {
  eventType: 'BlobCreated' | 'BlobDeleted' | 'BlobUpdated' | 'ContainerCreated' | 'ContainerDeleted';
  eventTime: Date;
  subject: string; // Resource path
  data: {
    api: string;
    clientRequestId?: string;
    requestId: string;
    etag: string;
    contentType?: string;
    contentLength?: number;
    blobType?: string;
    url: string;
    sequencer: string;
    identity?: string;
  };
}

export interface TelemetryData {
  operation: string;
  success: boolean;
  duration: number;
  error?: string;
  metadata: Record<string, any>;
}

// UI Component Props Types (for RSC integration)

export interface ContainerListProps {
  containers: ContainerItem[];
  metrics?: StorageMetrics;
  searchQuery?: string;
  sortBy?: 'name' | 'lastModified' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface BlobListProps {
  containerName: string;
  blobs: BlobItem[];
  prefix?: string;
  searchQuery?: string;
  sortBy?: 'name' | 'lastModified' | 'size' | 'type';
  sortOrder?: 'asc' | 'desc';
  showHiddenFiles?: boolean;
}

export interface BlobDetailsProps {
  containerName: string;
  blobName: string;
  blob: BlobItem;
  downloadUrl?: string;
  isPreviewable?: boolean;
}

// Configuration and Environment

export interface AzureStorageConfig {
  connectionString: string;
  accountName?: string;
  accountKey?: string;
  sasToken?: string;
  blobEndpoint?: string;
  defaultTimeout?: number;
  maxRetryAttempts?: number;
  retryDelayInMs?: number;
}

export interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  enableTelemetry: boolean;
  enableCaching: boolean;
  defaultCacheTTL: number;
  maxUploadSizeBytes: number;
  allowedFileTypes?: string[];
  maxConcurrentUploads: number;
}

// Utility Types

export type SortOrder = 'asc' | 'desc';
export type BlobTier = 'Hot' | 'Cool' | 'Archive';
export type PublicAccessLevel = 'none' | 'blob' | 'container';
export type LeaseStatus = 'locked' | 'unlocked';
export type LeaseState = 'available' | 'leased' | 'expired' | 'breaking' | 'broken';
export type BlobType = 'BlockBlob' | 'PageBlob' | 'AppendBlob';
export type CopyStatus = 'pending' | 'success' | 'aborted' | 'failed';

// Type Guards

export function isContainerItem(obj: any): obj is ContainerItem {
  return obj && typeof obj.name === 'string' && obj.properties && obj.metadata;
}

export function isBlobItem(obj: any): obj is BlobItem {
  return obj && typeof obj.name === 'string' && obj.properties && obj.metadata;
}

export function isAzureStorageError(error: any): error is AzureStorageError {
  return error instanceof AzureStorageError;
}

// Helper Types for Form Data

export interface ContainerFormData {
  name: string;
  publicAccess: PublicAccessLevel;
  metadata: Record<string, string>;
}

export interface BlobFormData {
  containerName: string;
  blobName: string;
  file: File;
  contentType?: string;
  tier: BlobTier;
  metadata: Record<string, string>;
  tags: Record<string, string>;
}

export interface BlobUpdateFormData {
  containerName: string;
  blobName: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  tier?: BlobTier;
}

// Pagination Types

export interface PaginationInfo {
  continuationToken?: string;
  hasMore: boolean;
  pageSize: number;
  currentPage: number;
  totalItems?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

export type PaginatedContainers = PaginatedResult<ContainerItem>;
export type PaginatedBlobs = PaginatedResult<BlobItem>;
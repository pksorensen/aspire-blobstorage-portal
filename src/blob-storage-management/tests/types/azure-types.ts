/**
 * Type definitions for Azure Storage testing
 * Mirrors the Azure Storage SDK types for consistent testing
 */

export interface ContainerItem {
  name: string;
  properties: {
    lastModified: Date;
    etag: string;
    leaseStatus: 'locked' | 'unlocked';
    leaseState: 'available' | 'leased' | 'expired' | 'breaking' | 'broken';
    publicAccess: 'none' | 'blob' | 'container';
    hasImmutabilityPolicy?: boolean;
    hasLegalHold?: boolean;
  };
  metadata: Record<string, string>;
}

export interface BlobItem {
  name: string;
  deleted?: boolean;
  snapshot?: string;
  versionId?: string;
  isCurrentVersion?: boolean;
  properties: {
    lastModified: Date;
    etag: string;
    contentLength: number;
    contentType: string;
    contentEncoding?: string;
    contentLanguage?: string;
    contentMD5?: Uint8Array;
    cacheControl?: string;
    contentDisposition?: string;
    blobType: 'BlockBlob' | 'PageBlob' | 'AppendBlob';
    accessTier?: 'Hot' | 'Cool' | 'Archive';
    accessTierInferred?: boolean;
    leaseStatus: 'locked' | 'unlocked';
    leaseState: 'available' | 'leased' | 'expired' | 'breaking' | 'broken';
    serverEncrypted?: boolean;
    customerProvidedKeySha256?: string;
    encryptionScope?: string;
    accessTierChangeTime?: Date;
  };
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

export interface StorageMetrics {
  containerCount: number;
  blobCount: number;
  totalSize: number;
  usedCapacity: number;
  lastUpdated: Date;
}

export interface UploadBlobOptions {
  blobHTTPHeaders?: {
    blobContentType?: string;
    blobContentEncoding?: string;
    blobContentLanguage?: string;
    blobCacheControl?: string;
    blobContentDisposition?: string;
    blobContentMD5?: Uint8Array;
  };
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  tier?: 'Hot' | 'Cool' | 'Archive';
  conditions?: {
    ifModifiedSince?: Date;
    ifUnmodifiedSince?: Date;
    ifMatch?: string;
    ifNoneMatch?: string;
  };
}

export interface CreateContainerOptions {
  metadata?: Record<string, string>;
  publicAccess?: 'none' | 'blob' | 'container';
  containerEncryptionScope?: {
    defaultEncryptionScope?: string;
    preventEncryptionScopeOverride?: boolean;
  };
}

export interface BlobDownloadResponse {
  readableStreamBody?: NodeJS.ReadableStream;
  contentLength?: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export interface BlobDeleteOptions {
  deleteSnapshots?: 'include' | 'only';
  conditions?: {
    ifModifiedSince?: Date;
    ifUnmodifiedSince?: Date;
    ifMatch?: string;
    ifNoneMatch?: string;
  };
}

export interface SetBlobTierOptions {
  rehydratePriority?: 'High' | 'Standard';
  conditions?: {
    ifMatch?: string;
    ifNoneMatch?: string;
    ifTags?: string;
  };
}

export interface BlobSASSignatureValues {
  permissions: string;
  expiresOn: Date;
  startsOn?: Date;
  identifier?: string;
  protocol?: 'https' | 'https,http';
  ipRange?: {
    start: string;
    end?: string;
  };
  resource?: string;
  resourceTypes?: string;
  services?: string;
}

export interface MockAzureError extends Error {
  statusCode: number;
  code: string;
  requestId?: string;
}

export interface TestUploadFile {
  name: string;
  content: Buffer;
  contentType: string;
  size: number;
}

// Test-specific interfaces

export interface MockBlobServiceClientOptions {
  containers?: Map<string, ContainerItem>;
  blobs?: Map<string, Map<string, BlobItem>>;
  simulateErrors?: boolean;
  networkDelay?: number;
}

export interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
}

export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
}

export interface TestDataSet {
  containers: ContainerItem[];
  blobs: Map<string, BlobItem[]>;
  files: TestUploadFile[];
}

// Utility types for test categorization

export type TestCategory = 'happy-path' | 'extended-happy-path' | 'not-so-happy-path' | 'performance';

export interface TestMetadata {
  category: TestCategory;
  description: string;
  timeout?: number;
  retries?: number;
  tags?: string[];
}

// Mock response types

export interface MockListContainersResponse {
  containerItems: ContainerItem[];
  continuationToken?: string;
}

export interface MockListBlobsResponse {
  blobItems: BlobItem[];
  continuationToken?: string;
}

export interface MockUploadResponse {
  etag: string;
  lastModified: Date;
  contentMD5?: Uint8Array;
  requestId: string;
  version: string;
  versionId?: string;
  encryptionKeySha256?: string;
  encryptionScope?: string;
}

export interface MockDeleteResponse {
  requestId: string;
  version: string;
  date: Date;
}

// Configuration types

export interface TestConfiguration {
  baseUrl: string;
  timeout: number;
  retries: number;
  parallel: boolean;
  categories: TestCategory[];
  storage: {
    connectionString: string;
    containerPrefix: string;
    cleanup: boolean;
  };
}

export interface MockServiceConfiguration {
  enableNetworkDelay: boolean;
  defaultDelay: number;
  errorRate: number;
  maxContainers: number;
  maxBlobsPerContainer: number;
  maxFileSize: number;
}
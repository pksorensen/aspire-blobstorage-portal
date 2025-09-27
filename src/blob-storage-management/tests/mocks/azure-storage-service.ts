import { 
  ContainerItem, 
  BlobItem, 
  BlobProperties,
  ContainerProperties,
  StorageMetrics,
  UploadBlobOptions,
  CreateContainerOptions,
  BlobDownloadResponse,
  MockAzureError,
  MockBlobServiceClientOptions,
  MockListContainersResponse,
  MockListBlobsResponse,
  MockUploadResponse,
  MockDeleteResponse
} from '../types/azure-types';

/**
 * Mock implementation of Azure Storage Blob service
 * Provides realistic behavior for testing without requiring actual Azure Storage
 */
export class MockAzureStorageService {
  private static instance: MockAzureStorageService;
  
  private containers: Map<string, ContainerItem> = new Map();
  private blobs: Map<string, Map<string, BlobItem>> = new Map();
  private simulateErrors: boolean = false;
  private networkDelay: number = 0;
  private errorRate: number = 0;

  private constructor(options: MockBlobServiceClientOptions = {}) {
    this.containers = options.containers || new Map();
    this.blobs = options.blobs || new Map();
    this.simulateErrors = options.simulateErrors || false;
    this.networkDelay = options.networkDelay || 0;
  }

  static getInstance(options?: MockBlobServiceClientOptions): MockAzureStorageService {
    if (!MockAzureStorageService.instance) {
      MockAzureStorageService.instance = new MockAzureStorageService(options);
    }
    return MockAzureStorageService.instance;
  }

  static reset(): void {
    MockAzureStorageService.instance = new MockAzureStorageService();
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing MockAzureStorageService');
    // Reset state
    this.containers.clear();
    this.blobs.clear();
    this.simulateErrors = false;
    this.networkDelay = 0;
    this.errorRate = 0;
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up MockAzureStorageService');
    this.containers.clear();
    this.blobs.clear();
  }

  // Configuration methods

  enableErrorSimulation(errorRate: number = 0.1): void {
    this.simulateErrors = true;
    this.errorRate = errorRate;
  }

  setNetworkDelay(delayMs: number): void {
    this.networkDelay = delayMs;
  }

  // Container operations

  async listContainers(prefix?: string): Promise<MockListContainersResponse> {
    await this.simulateDelay();
    this.throwIfSimulateError('ContainerListError', 'Failed to list containers');

    let containers = Array.from(this.containers.values());
    
    if (prefix) {
      containers = containers.filter(c => c.name.startsWith(prefix));
    }

    return {
      containerItems: containers,
      continuationToken: undefined // Simplify for testing
    };
  }

  async createContainer(name: string, options: CreateContainerOptions = {}): Promise<void> {
    await this.simulateDelay();
    this.throwIfSimulateError('ContainerAlreadyExists', `Container '${name}' already exists`);

    if (this.containers.has(name)) {
      throw this.createAzureError('ContainerAlreadyExists', `Container '${name}' already exists`, 409);
    }

    const container: ContainerItem = {
      name,
      properties: {
        lastModified: new Date(),
        etag: this.generateETag(),
        leaseStatus: 'unlocked',
        leaseState: 'available',
        publicAccess: options.publicAccess || 'none',
      },
      metadata: options.metadata || {}
    };

    this.containers.set(name, container);
    this.blobs.set(name, new Map());
  }

  async deleteContainer(name: string): Promise<MockDeleteResponse> {
    await this.simulateDelay();
    this.throwIfSimulateError('ContainerNotFound', `Container '${name}' not found`);

    if (!this.containers.has(name)) {
      throw this.createAzureError('ContainerNotFound', `Container '${name}' not found`, 404);
    }

    this.containers.delete(name);
    this.blobs.delete(name);

    return {
      requestId: this.generateRequestId(),
      version: '2023-11-03',
      date: new Date()
    };
  }

  async getContainerProperties(name: string): Promise<ContainerProperties> {
    await this.simulateDelay();
    this.throwIfSimulateError('ContainerNotFound', `Container '${name}' not found`);

    const container = this.containers.get(name);
    if (!container) {
      throw this.createAzureError('ContainerNotFound', `Container '${name}' not found`, 404);
    }

    return {
      lastModified: container.properties.lastModified,
      etag: container.properties.etag,
      leaseStatus: container.properties.leaseStatus,
      leaseState: container.properties.leaseState,
      publicAccess: container.properties.publicAccess,
      hasImmutabilityPolicy: container.properties.hasImmutabilityPolicy,
      hasLegalHold: container.properties.hasLegalHold,
    };
  }

  // Blob operations

  async listBlobs(containerName: string, prefix?: string): Promise<MockListBlobsResponse> {
    await this.simulateDelay();
    this.throwIfSimulateError('ContainerNotFound', `Container '${containerName}' not found`);

    if (!this.containers.has(containerName)) {
      throw this.createAzureError('ContainerNotFound', `Container '${containerName}' not found`, 404);
    }

    const containerBlobs = this.blobs.get(containerName) || new Map();
    let blobItems = Array.from(containerBlobs.values());

    if (prefix) {
      blobItems = blobItems.filter(b => b.name.startsWith(prefix));
    }

    return {
      blobItems,
      continuationToken: undefined
    };
  }

  async uploadBlob(
    containerName: string, 
    blobName: string, 
    content: Buffer,
    options: UploadBlobOptions = {}
  ): Promise<MockUploadResponse> {
    await this.simulateDelay();
    this.throwIfSimulateError('ContainerNotFound', `Container '${containerName}' not found`);

    if (!this.containers.has(containerName)) {
      throw this.createAzureError('ContainerNotFound', `Container '${containerName}' not found`, 404);
    }

    const containerBlobs = this.blobs.get(containerName)!;
    const now = new Date();

    const blob: BlobItem = {
      name: blobName,
      properties: {
        lastModified: now,
        etag: this.generateETag(),
        contentLength: content.length,
        contentType: options.blobHTTPHeaders?.blobContentType || 'application/octet-stream',
        contentEncoding: options.blobHTTPHeaders?.blobContentEncoding,
        contentLanguage: options.blobHTTPHeaders?.blobContentLanguage,
        cacheControl: options.blobHTTPHeaders?.blobCacheControl,
        contentDisposition: options.blobHTTPHeaders?.blobContentDisposition,
        blobType: 'BlockBlob',
        accessTier: options.tier || 'Hot',
        leaseStatus: 'unlocked',
        leaseState: 'available',
        serverEncrypted: true,
      },
      metadata: options.metadata || {},
      tags: options.tags || {}
    };

    containerBlobs.set(blobName, blob);

    return {
      etag: blob.properties.etag,
      lastModified: blob.properties.lastModified,
      requestId: this.generateRequestId(),
      version: '2023-11-03',
    };
  }

  async downloadBlob(containerName: string, blobName: string): Promise<BlobDownloadResponse> {
    await this.simulateDelay();
    this.throwIfSimulateError('BlobNotFound', `Blob '${blobName}' not found`);

    if (!this.containers.has(containerName)) {
      throw this.createAzureError('ContainerNotFound', `Container '${containerName}' not found`, 404);
    }

    const containerBlobs = this.blobs.get(containerName)!;
    const blob = containerBlobs.get(blobName);

    if (!blob) {
      throw this.createAzureError('BlobNotFound', `Blob '${blobName}' not found`, 404);
    }

    // In real implementation, this would stream the actual blob content
    // For testing, we'll return a mock readable stream
    const content = Buffer.from(`Mock content for ${blobName}`);
    
    return {
      contentLength: blob.properties.contentLength,
      contentType: blob.properties.contentType,
      etag: blob.properties.etag,
      lastModified: blob.properties.lastModified,
      metadata: blob.metadata,
      readableStreamBody: undefined // In real tests, this would be a stream
    };
  }

  async deleteBlob(containerName: string, blobName: string): Promise<MockDeleteResponse> {
    await this.simulateDelay();
    this.throwIfSimulateError('BlobNotFound', `Blob '${blobName}' not found`);

    if (!this.containers.has(containerName)) {
      throw this.createAzureError('ContainerNotFound', `Container '${containerName}' not found`, 404);
    }

    const containerBlobs = this.blobs.get(containerName)!;
    if (!containerBlobs.has(blobName)) {
      throw this.createAzureError('BlobNotFound', `Blob '${blobName}' not found`, 404);
    }

    containerBlobs.delete(blobName);

    return {
      requestId: this.generateRequestId(),
      version: '2023-11-03',
      date: new Date()
    };
  }

  async getBlobProperties(containerName: string, blobName: string): Promise<BlobProperties> {
    await this.simulateDelay();
    this.throwIfSimulateError('BlobNotFound', `Blob '${blobName}' not found`);

    if (!this.containers.has(containerName)) {
      throw this.createAzureError('ContainerNotFound', `Container '${containerName}' not found`, 404);
    }

    const containerBlobs = this.blobs.get(containerName)!;
    const blob = containerBlobs.get(blobName);

    if (!blob) {
      throw this.createAzureError('BlobNotFound', `Blob '${blobName}' not found`, 404);
    }

    return {
      lastModified: blob.properties.lastModified,
      etag: blob.properties.etag,
      contentLength: blob.properties.contentLength,
      contentType: blob.properties.contentType,
      contentEncoding: blob.properties.contentEncoding,
      contentLanguage: blob.properties.contentLanguage,
      cacheControl: blob.properties.cacheControl,
      contentDisposition: blob.properties.contentDisposition,
      blobType: blob.properties.blobType,
      leaseState: blob.properties.leaseState,
      leaseStatus: blob.properties.leaseStatus,
      accessTier: blob.properties.accessTier,
      accessTierInferred: blob.properties.accessTierInferred,
    };
  }

  async setBlobTier(containerName: string, blobName: string, tier: 'Hot' | 'Cool' | 'Archive'): Promise<void> {
    await this.simulateDelay();
    this.throwIfSimulateError('BlobNotFound', `Blob '${blobName}' not found`);

    if (!this.containers.has(containerName)) {
      throw this.createAzureError('ContainerNotFound', `Container '${containerName}' not found`, 404);
    }

    const containerBlobs = this.blobs.get(containerName)!;
    const blob = containerBlobs.get(blobName);

    if (!blob) {
      throw this.createAzureError('BlobNotFound', `Blob '${blobName}' not found`, 404);
    }

    blob.properties.accessTier = tier;
    blob.properties.accessTierChangeTime = new Date();
  }

  async setBlobMetadata(
    containerName: string, 
    blobName: string, 
    metadata: Record<string, string>
  ): Promise<void> {
    await this.simulateDelay();
    this.throwIfSimulateError('BlobNotFound', `Blob '${blobName}' not found`);

    if (!this.containers.has(containerName)) {
      throw this.createAzureError('ContainerNotFound', `Container '${containerName}' not found`, 404);
    }

    const containerBlobs = this.blobs.get(containerName)!;
    const blob = containerBlobs.get(blobName);

    if (!blob) {
      throw this.createAzureError('BlobNotFound', `Blob '${blobName}' not found`, 404);
    }

    blob.metadata = { ...metadata };
    blob.properties.lastModified = new Date();
    blob.properties.etag = this.generateETag();
  }

  async copyBlob(
    sourceContainer: string,
    sourceBlobName: string,
    targetContainer: string,
    targetBlobName: string
  ): Promise<void> {
    await this.simulateDelay();

    // Verify source exists
    if (!this.containers.has(sourceContainer)) {
      throw this.createAzureError('ContainerNotFound', `Source container '${sourceContainer}' not found`, 404);
    }

    if (!this.containers.has(targetContainer)) {
      throw this.createAzureError('ContainerNotFound', `Target container '${targetContainer}' not found`, 404);
    }

    const sourceBlobs = this.blobs.get(sourceContainer)!;
    const sourceBlob = sourceBlobs.get(sourceBlobName);

    if (!sourceBlob) {
      throw this.createAzureError('BlobNotFound', `Source blob '${sourceBlobName}' not found`, 404);
    }

    // Create copy in target container
    const targetBlobs = this.blobs.get(targetContainer)!;
    const copiedBlob: BlobItem = {
      ...JSON.parse(JSON.stringify(sourceBlob)), // Deep clone
      name: targetBlobName,
      properties: {
        ...sourceBlob.properties,
        lastModified: new Date(),
        etag: this.generateETag(),
      }
    };

    targetBlobs.set(targetBlobName, copiedBlob);
  }

  // Utility methods

  async getStorageMetrics(): Promise<StorageMetrics> {
    await this.simulateDelay();
    
    const containerCount = this.containers.size;
    let blobCount = 0;
    let totalSize = 0;

    for (const containerBlobs of this.blobs.values()) {
      blobCount += containerBlobs.size;
      for (const blob of containerBlobs.values()) {
        totalSize += blob.properties.contentLength;
      }
    }

    return {
      containerCount,
      blobCount,
      totalSize,
      usedCapacity: Math.min(100, Math.round((totalSize / (1024 * 1024 * 1024)) * 10)), // Mock percentage
      lastUpdated: new Date()
    };
  }

  getContainerCount(): number {
    return this.containers.size;
  }

  getBlobCount(): number {
    let total = 0;
    for (const containerBlobs of this.blobs.values()) {
      total += containerBlobs.size;
    }
    return total;
  }

  getTotalSize(): number {
    let total = 0;
    for (const containerBlobs of this.blobs.values()) {
      for (const blob of containerBlobs.values()) {
        total += blob.properties.contentLength;
      }
    }
    return total;
  }

  // Test utility methods

  hasContainer(name: string): boolean {
    return this.containers.has(name);
  }

  hasBlob(containerName: string, blobName: string): boolean {
    const containerBlobs = this.blobs.get(containerName);
    return containerBlobs?.has(blobName) || false;
  }

  clear(): void {
    this.containers.clear();
    this.blobs.clear();
  }

  // Private helper methods

  private async simulateDelay(): Promise<void> {
    if (this.networkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.networkDelay));
    }
  }

  private throwIfSimulateError(code: string, message: string): void {
    if (this.simulateErrors && Math.random() < this.errorRate) {
      throw this.createAzureError(code, message, 500);
    }
  }

  private createAzureError(code: string, message: string, statusCode: number): MockAzureError {
    const error = new Error(message) as MockAzureError;
    error.name = 'RestError';
    error.code = code;
    error.statusCode = statusCode;
    error.requestId = this.generateRequestId();
    return error;
  }

  private generateETag(): string {
    return `"${Math.random().toString(36).substr(2, 16)}"`;
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 32);
  }
}
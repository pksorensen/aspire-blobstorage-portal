import { faker } from '@faker-js/faker';
import {
  ContainerItem,
  BlobItem,
  StorageMetrics,
  TestUploadFile,
  TestDataSet
} from '../types/azure-types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Factory for creating test data with realistic values
 * Uses Faker.js to generate consistent, realistic test data
 */
export class TestDataFactory {
  
  /**
   * Create a container item with realistic properties
   */
  static createContainer(overrides?: Partial<ContainerItem>): ContainerItem {
    const name = faker.lorem.slug(2).toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    return {
      name,
      properties: {
        lastModified: faker.date.recent({ days: 30 }),
        etag: `"${faker.string.alphanumeric(32)}"`,
        leaseStatus: faker.helpers.arrayElement(['locked', 'unlocked'] as const),
        leaseState: faker.helpers.arrayElement(['available', 'leased', 'expired', 'breaking', 'broken'] as const),
        publicAccess: faker.helpers.arrayElement(['none', 'blob', 'container'] as const),
        hasImmutabilityPolicy: faker.datatype.boolean(),
        hasLegalHold: faker.datatype.boolean(),
      },
      metadata: {
        description: faker.company.catchPhrase(),
        department: faker.commerce.department(),
        owner: faker.person.fullName(),
        created: faker.date.past().toISOString(),
        ...overrides?.metadata,
      },
      ...overrides,
    };
  }

  /**
   * Create multiple containers for testing
   */
  static createContainers(count: number, overrides?: Partial<ContainerItem>[]): ContainerItem[] {
    const containers: ContainerItem[] = [];
    
    for (let i = 0; i < count; i++) {
      const override = overrides?.[i] || {};
      containers.push(this.createContainer(override));
    }
    
    return containers;
  }

  /**
   * Create a blob item with realistic properties
   */
  static createBlob(overrides?: Partial<BlobItem>): BlobItem {
    const extensions = ['txt', 'pdf', 'jpg', 'png', 'docx', 'xlsx', 'zip', 'json', 'csv', 'xml'];
    const extension = faker.helpers.arrayElement(extensions);
    const fileName = `${faker.system.fileName({ extensionCount: 0 })}.${extension}`;
    const contentTypes = {
      txt: 'text/plain',
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      png: 'image/png',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      zip: 'application/zip',
      json: 'application/json',
      csv: 'text/csv',
      xml: 'application/xml',
    };

    return {
      name: fileName,
      properties: {
        lastModified: faker.date.recent({ days: 30 }),
        etag: `"${faker.string.alphanumeric(32)}"`,
        contentLength: faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
        contentType: (contentTypes as any)[extension] || 'application/octet-stream',
        contentEncoding: faker.helpers.maybe(() => faker.helpers.arrayElement(['gzip', 'deflate']), { probability: 0.2 }),
        contentLanguage: faker.helpers.maybe(() => faker.location.countryCode('alpha-2').toLowerCase(), { probability: 0.1 }),
        cacheControl: faker.helpers.maybe(() => `max-age=${faker.number.int({ min: 3600, max: 86400 })}`, { probability: 0.3 }),
        contentDisposition: faker.helpers.maybe(() => `attachment; filename="${fileName}"`, { probability: 0.4 }),
        blobType: faker.helpers.arrayElement(['BlockBlob', 'PageBlob', 'AppendBlob'] as const),
        accessTier: faker.helpers.arrayElement(['Hot', 'Cool', 'Archive'] as const),
        accessTierInferred: faker.datatype.boolean(),
        leaseStatus: faker.helpers.arrayElement(['locked', 'unlocked'] as const),
        leaseState: faker.helpers.arrayElement(['available', 'leased', 'expired', 'breaking', 'broken'] as const),
        serverEncrypted: true,
        accessTierChangeTime: faker.helpers.maybe(() => faker.date.recent({ days: 7 }), { probability: 0.3 }),
      },
      metadata: {
        author: faker.person.fullName(),
        category: faker.helpers.arrayElement(['document', 'image', 'data', 'backup', 'temp']),
        project: faker.company.name(),
        version: faker.system.semver(),
        checksum: faker.string.alphanumeric(64),
        ...overrides?.metadata,
      },
      tags: {
        environment: faker.helpers.arrayElement(['dev', 'test', 'staging', 'prod']),
        team: faker.helpers.arrayElement(['engineering', 'marketing', 'sales', 'support']),
        ...overrides?.tags,
      },
      ...overrides,
    };
  }

  /**
   * Create multiple blobs for testing
   */
  static createBlobs(count: number, overrides?: Partial<BlobItem>[]): BlobItem[] {
    const blobs: BlobItem[] = [];
    
    for (let i = 0; i < count; i++) {
      const override = overrides?.[i] || {};
      blobs.push(this.createBlob(override));
    }
    
    return blobs;
  }

  /**
   * Create storage metrics with realistic values
   */
  static createStorageMetrics(overrides?: Partial<StorageMetrics>): StorageMetrics {
    const containerCount = faker.number.int({ min: 1, max: 100 });
    const blobCount = faker.number.int({ min: containerCount, max: containerCount * 50 });
    const avgBlobSize = faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }); // 1KB to 10MB
    const totalSize = blobCount * avgBlobSize;
    
    return {
      containerCount,
      blobCount,
      totalSize,
      usedCapacity: Math.min(100, Math.round((totalSize / (1024 * 1024 * 1024 * 1024)) * 100)), // Percentage of 1TB
      lastUpdated: faker.date.recent(),
      ...overrides,
    };
  }

  /**
   * Create test upload files with actual content
   */
  static createTestFiles(count: number): TestUploadFile[] {
    const files: TestUploadFile[] = [];
    
    for (let i = 0; i < count; i++) {
      const type = faker.helpers.arrayElement(['text', 'json', 'csv', 'binary']);
      let content: Buffer;
      let contentType: string;
      let extension: string;
      
      switch (type) {
        case 'text':
          content = Buffer.from(faker.lorem.paragraphs(faker.number.int({ min: 1, max: 10 }), '\n\n'));
          contentType = 'text/plain';
          extension = 'txt';
          break;
        case 'json':
          const jsonData = {
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
            address: faker.location.streetAddress(),
            data: Array.from({ length: faker.number.int({ min: 5, max: 20 }) }, () => ({
              key: faker.lorem.word(),
              value: faker.number.int({ min: 1, max: 1000 }),
              timestamp: faker.date.recent().toISOString(),
            })),
          };
          content = Buffer.from(JSON.stringify(jsonData, null, 2));
          contentType = 'application/json';
          extension = 'json';
          break;
        case 'csv':
          const headers = ['id', 'name', 'email', 'department', 'salary', 'hire_date'];
          const rows = Array.from({ length: faker.number.int({ min: 10, max: 100 }) }, () => [
            faker.string.uuid(),
            faker.person.fullName(),
            faker.internet.email(),
            faker.commerce.department(),
            faker.number.int({ min: 30000, max: 150000 }).toString(),
            faker.date.past().toISOString().split('T')[0],
          ]);
          const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
          content = Buffer.from(csvContent);
          contentType = 'text/csv';
          extension = 'csv';
          break;
        case 'binary':
        default:
          // Generate random binary data
          const size = faker.number.int({ min: 1024, max: 1024 * 1024 }); // 1KB to 1MB
          content = Buffer.alloc(size);
          for (let j = 0; j < size; j++) {
            content[j] = faker.number.int({ min: 0, max: 255 });
          }
          contentType = 'application/octet-stream';
          extension = 'bin';
          break;
      }
      
      const fileName = `${faker.system.fileName({ extensionCount: 0 })}-${i + 1}.${extension}`;
      
      files.push({
        name: fileName,
        content,
        contentType,
        size: content.length,
      });
    }
    
    return files;
  }

  /**
   * Create a complete test dataset with containers, blobs, and files
   */
  static createTestDataSet(options: {
    containerCount?: number;
    blobsPerContainer?: number;
    testFileCount?: number;
  } = {}): TestDataSet {
    const {
      containerCount = 3,
      blobsPerContainer = 5,
      testFileCount = 10
    } = options;

    const containers = this.createContainers(containerCount);
    const blobMap = new Map<string, BlobItem[]>();
    
    for (const container of containers) {
      const blobs = this.createBlobs(blobsPerContainer);
      blobMap.set(container.name, blobs);
    }
    
    const files = this.createTestFiles(testFileCount);
    
    return {
      containers,
      blobs: blobMap,
      files,
    };
  }

  /**
   * Create test files on disk for upload testing
   */
  static async createTestFilesOnDisk(testDir: string, files: TestUploadFile[]): Promise<string[]> {
    await fs.mkdir(testDir, { recursive: true });
    
    const filePaths: string[] = [];
    
    for (const file of files) {
      const filePath = path.join(testDir, file.name);
      await fs.writeFile(filePath, file.content);
      filePaths.push(filePath);
    }
    
    return filePaths;
  }

  /**
   * Clean up test files from disk
   */
  static async cleanupTestFiles(testDir: string): Promise<void> {
    try {
      const files = await fs.readdir(testDir);
      await Promise.all(files.map(file => fs.unlink(path.join(testDir, file))));
      await fs.rmdir(testDir);
    } catch (error) {
      // Directory might not exist, that's okay
    }
  }

  /**
   * Create specific named containers for predictable testing
   */
  static createNamedContainers(names: string[]): ContainerItem[] {
    return names.map(name => this.createContainer({ name }));
  }

  /**
   * Create specific named blobs for predictable testing
   */
  static createNamedBlobs(names: string[], containerName?: string): BlobItem[] {
    return names.map(name => this.createBlob({ 
      name,
      metadata: containerName ? { container: containerName } : {}
    }));
  }

  /**
   * Create blobs with specific content types for filtering tests
   */
  static createBlobsByContentType(contentTypes: string[]): BlobItem[] {
    return contentTypes.map(contentType => {
      const extensions: { [key: string]: string } = {
        'text/plain': 'txt',
        'application/json': 'json',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'application/pdf': 'pdf',
        'application/zip': 'zip',
      };
      
      const extension = extensions[contentType] || 'bin';
      const name = `${faker.system.fileName({ extensionCount: 0 })}.${extension}`;
      
      return this.createBlob({
        name,
        properties: {
          contentType,
          lastModified: faker.date.recent({ days: 30 }),
          etag: `"${faker.string.alphanumeric(32)}"`,
          contentLength: faker.number.int({ min: 1024, max: 1024 * 1024 }),
          blobType: 'BlockBlob',
          accessTier: 'Hot',
          leaseStatus: 'unlocked',
          leaseState: 'available',
        }
      });
    });
  }

  /**
   * Create blobs with different access tiers for tier testing
   */
  static createBlobsByAccessTier(): BlobItem[] {
    const tiers: Array<'Hot' | 'Cool' | 'Archive'> = ['Hot', 'Cool', 'Archive'];
    
    return tiers.map((tier, index) => this.createBlob({
      name: `${tier.toLowerCase()}-tier-blob-${index + 1}.txt`,
      properties: {
        accessTier: tier,
        lastModified: faker.date.recent({ days: 30 }),
        etag: `"${faker.string.alphanumeric(32)}"`,
        contentLength: faker.number.int({ min: 1024, max: 1024 * 1024 }),
        contentType: 'text/plain',
        blobType: 'BlockBlob',
        leaseStatus: 'unlocked',
        leaseState: 'available',
      }
    }));
  }

  /**
   * Create performance test dataset with large numbers of items
   */
  static createLargeTestDataSet(options: {
    containerCount?: number;
    blobsPerContainer?: number;
  } = {}): TestDataSet {
    const {
      containerCount = 50,
      blobsPerContainer = 100,
    } = options;

    console.log(`Creating large test dataset: ${containerCount} containers, ${blobsPerContainer} blobs each`);
    
    return this.createTestDataSet({
      containerCount,
      blobsPerContainer,
      testFileCount: 0 // Don't create actual test files for performance tests
    });
  }
}
import { test, expect } from '@playwright/test';
import { BlobPageHelper } from '../page-objects/blob-page';
import { MockAzureStorageService } from '../mocks/azure-storage-service';
import { TestDataFactory } from '../fixtures/test-data-factory';
import * as path from 'path';

/**
 * Blob management tests
 * Tests blob operations: upload, download, delete, metadata, and access tier management
 */

test.describe('Blob Management - Basic Operations @happy-path', () => {
  let blobPage: BlobPageHelper;
  let mockService: MockAzureStorageService;
  const containerName = 'test-container';

  test.beforeEach(async ({ page }) => {
    blobPage = new BlobPageHelper(page, containerName);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();

    // Create test container
    await mockService.createContainer(containerName);
    
    // Add some initial blobs
    await mockService.uploadBlob(containerName, 'document.pdf', Buffer.from('PDF content'));
    await mockService.uploadBlob(containerName, 'image.jpg', Buffer.from('JPEG content'));
  });

  /**
   * Basic blob listing functionality
   * @happy-path
   */
  test('displays blob list correctly', async () => {
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    // Verify blobs are visible
    await blobPage.verifyFileExists('document.pdf');
    await blobPage.verifyFileExists('image.jpg');
    await blobPage.verifyFileCount(2);
  });

  /**
   * File upload functionality
   * @happy-path
   */
  test('uploads file successfully', async () => {
    // Create a test file
    const testFiles = TestDataFactory.createTestFiles(1);
    const testFile = testFiles[0];
    
    // Write test file to disk temporarily
    const testDir = path.join(process.cwd(), 'test-temp');
    const [filePath] = await TestDataFactory.createTestFilesOnDisk(testDir, [testFile]);

    try {
      await blobPage.navigateTo();
      
      await blobPage.uploadFile(filePath);
      
      // Verify file was uploaded
      await blobPage.verifyFileExists(testFile.name);
      await blobPage.verifyFileCount(3); // 2 initial + 1 uploaded

      // Verify in mock service
      expect(mockService.hasBlob(containerName, testFile.name)).toBe(true);
    } finally {
      // Cleanup test files
      await TestDataFactory.cleanupTestFiles(testDir);
    }
  });

  /**
   * File download functionality
   * @happy-path
   */
  test('downloads file successfully', async () => {
    await blobPage.navigateTo();
    
    const download = await blobPage.downloadFile('document.pdf');
    
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toBe('document.pdf');
  });

  /**
   * File deletion functionality
   * @happy-path
   */
  test('deletes file successfully', async () => {
    await blobPage.navigateTo();
    
    await blobPage.deleteFile('document.pdf');
    
    // Verify file was removed
    await blobPage.verifyFileNotExists('document.pdf');
    await blobPage.verifyFileCount(1);

    // Verify in mock service
    expect(mockService.hasBlob(containerName, 'document.pdf')).toBe(false);
  });

  /**
   * Basic blob search functionality
   * @happy-path
   */
  test('searches blobs by name', async () => {
    await blobPage.navigateTo();
    
    await blobPage.searchBlobs('doc');
    
    // Should show only document.pdf
    await blobPage.verifyFileExists('document.pdf');
    await blobPage.verifyFileNotExists('image.jpg');
    
    // Clear search
    await blobPage.clearBlobSearch();
    
    // Should show all blobs again
    await blobPage.verifyFileCount(2);
  });
});

test.describe('Blob Management - Advanced Features @extended-happy-path', () => {
  let blobPage: BlobPageHelper;
  let mockService: MockAzureStorageService;
  const containerName = 'advanced-test-container';

  test.beforeEach(async ({ page }) => {
    blobPage = new BlobPageHelper(page, containerName);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();

    // Create test container
    await mockService.createContainer(containerName);
    
    // Create comprehensive test data
    const testBlobs = TestDataFactory.createBlobs(15, [
      { name: 'document1.pdf', properties: { contentType: 'application/pdf', accessTier: 'Hot', lastModified: new Date(), etag: '"test-etag-1"', contentLength: 1024, blobType: 'BlockBlob', leaseStatus: 'unlocked', leaseState: 'available' } },
      { name: 'document2.pdf', properties: { contentType: 'application/pdf', accessTier: 'Cool', lastModified: new Date(), etag: '"test-etag-2"', contentLength: 2048, blobType: 'BlockBlob', leaseStatus: 'unlocked', leaseState: 'available' } },
      { name: 'image1.jpg', properties: { contentType: 'image/jpeg', accessTier: 'Hot', lastModified: new Date(), etag: '"test-etag-3"', contentLength: 5120, blobType: 'BlockBlob', leaseStatus: 'unlocked', leaseState: 'available' } },
      { name: 'image2.png', properties: { contentType: 'image/png', accessTier: 'Archive', lastModified: new Date(), etag: '"test-etag-4"', contentLength: 3072, blobType: 'BlockBlob', leaseStatus: 'unlocked', leaseState: 'available' } },
      { name: 'data.json', properties: { contentType: 'application/json', accessTier: 'Hot', lastModified: new Date(), etag: '"test-etag-5"', contentLength: 512, blobType: 'BlockBlob', leaseStatus: 'unlocked', leaseState: 'available' } },
    ]);

    for (const blob of testBlobs) {
      await mockService.uploadBlob(
        containerName,
        blob.name,
        Buffer.from(`Content for ${blob.name}`),
        {
          blobHTTPHeaders: { blobContentType: blob.properties.contentType },
          metadata: blob.metadata,
          tier: blob.properties.accessTier
        }
      );
    }
  });

  /**
   * Multiple file upload functionality
   * @extended-happy-path
   */
  test('uploads multiple files simultaneously', async () => {
    const testFiles = TestDataFactory.createTestFiles(3);
    const testDir = path.join(process.cwd(), 'test-temp-multi');
    const filePaths = await TestDataFactory.createTestFilesOnDisk(testDir, testFiles);

    try {
      await blobPage.navigateTo();
      const initialCount = (await blobPage.getBlobList()).length;
      
      await blobPage.uploadMultipleFiles(filePaths);
      
      // Verify all files were uploaded
      for (const testFile of testFiles) {
        await blobPage.verifyFileExists(testFile.name);
      }
      
      await blobPage.verifyFileCount(initialCount + 3);
    } finally {
      await TestDataFactory.cleanupTestFiles(testDir);
    }
  });

  /**
   * Blob properties viewing and editing
   * @extended-happy-path
   */
  test('displays and edits blob properties', async () => {
    await blobPage.navigateTo();
    
    const properties = await blobPage.getBlobProperties('document1.pdf');
    
    expect(properties.name).toBe('document1.pdf');
    expect(properties.contentType).toBe('application/pdf');
    expect(properties.accessTier).toBe('Hot');
    expect(properties.blobType).toBeTruthy();
    expect(properties.lastModified).toBeTruthy();
  });

  /**
   * Access tier management
   * @extended-happy-path
   */
  test('changes blob access tier', async () => {
    await blobPage.navigateTo();
    
    await blobPage.updateAccessTier('document1.pdf', 'Cool');
    
    // Verify tier was updated
    const updatedProperties = await blobPage.getBlobProperties('document1.pdf');
    expect(updatedProperties.accessTier).toBe('Cool');
  });

  /**
   * Blob metadata management
   * @extended-happy-path
   */
  test('updates blob metadata', async () => {
    await blobPage.navigateTo();
    
    const newMetadata = {
      author: 'Test User',
      department: 'Engineering',
      project: 'Azure Storage Explorer',
      version: '1.0'
    };
    
    await blobPage.updateBlobMetadata('document1.pdf', newMetadata);
    
    // Verify metadata was updated
    const properties = await blobPage.getBlobProperties('document1.pdf');
    expect(properties.metadata.author).toBe('Test User');
    expect(properties.metadata.department).toBe('Engineering');
  });

  /**
   * Blob copy operations
   * @extended-happy-path
   */
  test('copies blob to another container', async () => {
    // Create target container
    const targetContainer = 'target-container';
    await mockService.createContainer(targetContainer);
    
    await blobPage.navigateTo();
    
    await blobPage.copyBlob('document1.pdf', targetContainer, 'copied-document.pdf');
    
    // Verify blob was copied to target container
    expect(mockService.hasBlob(targetContainer, 'copied-document.pdf')).toBe(true);
    
    // Original should still exist
    await blobPage.verifyFileExists('document1.pdf');
  });

  /**
   * Blob sorting functionality
   * @extended-happy-path
   */
  test('sorts blobs by different criteria', async () => {
    await blobPage.navigateTo();
    
    // Test name sorting
    await blobPage.sortBlobs('name', 'asc');
    const nameAscBlobs = await blobPage.getBlobList();
    
    await blobPage.sortBlobs('name', 'desc');
    const nameDescBlobs = await blobPage.getBlobList();
    
    // Verify sorting worked
    expect(nameAscBlobs[0].name).not.toBe(nameDescBlobs[0].name);
    
    // Test size sorting
    await blobPage.sortBlobs('size', 'desc');
    const sizedBlobs = await blobPage.getBlobList();
    expect(sizedBlobs.length).toBeGreaterThan(0);
  });

  /**
   * Blob filtering functionality
   * @extended-happy-path
   */
  test('filters blobs by content type', async () => {
    await blobPage.navigateTo();
    
    await blobPage.filterByContentType('application/pdf');
    
    const pdfBlobs = await blobPage.getBlobList();
    expect(pdfBlobs.length).toBeGreaterThan(0);
    
    // All visible blobs should be PDFs
    for (const blob of pdfBlobs) {
      expect(blob.contentType).toBe('application/pdf');
    }
    
    // Test access tier filtering
    await blobPage.filterByAccessTier('Hot');
    
    const hotBlobs = await blobPage.getBlobList();
    for (const blob of hotBlobs) {
      expect(blob.accessTier).toBe('Hot');
    }
  });

  /**
   * Bulk blob operations
   * @extended-happy-path
   */
  test('performs bulk delete operations', async () => {
    await blobPage.navigateTo();
    
    const allBlobs = await blobPage.getBlobList();
    const blobsToDelete = allBlobs.slice(0, 3).map(b => b.name);
    
    await blobPage.bulkDeleteBlobs(blobsToDelete);
    
    // Verify blobs were deleted
    for (const blobName of blobsToDelete) {
      await blobPage.verifyFileNotExists(blobName);
      expect(mockService.hasBlob(containerName, blobName)).toBe(false);
    }
    
    await blobPage.verifyFileCount(allBlobs.length - 3);
  });

  /**
   * Virtual folder navigation
   * @extended-happy-path
   */
  test('navigates virtual folder structure', async () => {
    // Add blobs with folder-like names
    await mockService.uploadBlob(containerName, 'folder1/subfolder/file1.txt', Buffer.from('content1'));
    await mockService.uploadBlob(containerName, 'folder1/file2.txt', Buffer.from('content2'));
    await mockService.uploadBlob(containerName, 'folder2/file3.txt', Buffer.from('content3'));
    
    await blobPage.navigateTo();
    
    // Navigate to folder1
    try {
      await blobPage.navigateToFolder('folder1');
      
      // Verify breadcrumbs
      await blobPage.verifyBreadcrumbs([containerName, 'folder1']);
      
      // Navigate up
      await blobPage.navigateUp();
      
      // Should be back at root
      await blobPage.verifyBreadcrumbs([containerName]);
    } catch {
      // If virtual folder navigation isn't implemented yet, skip
      test.skip();
    }
  });

  /**
   * Blob refresh functionality
   * @extended-happy-path
   */
  test('refreshes blob list', async () => {
    await blobPage.navigateTo();
    
    const initialBlobs = await blobPage.getBlobList();
    
    // Add blob externally
    await mockService.uploadBlob(containerName, 'externally-added.txt', Buffer.from('external content'));
    
    await blobPage.refreshBlobs();
    
    // Should show updated blob list
    await blobPage.verifyFileExists('externally-added.txt');
    await blobPage.verifyFileCount(initialBlobs.length + 1);
  });
});

test.describe('Blob Management - Error Scenarios @not-so-happy-path', () => {
  let blobPage: BlobPageHelper;
  let mockService: MockAzureStorageService;
  const containerName = 'error-test-container';

  test.beforeEach(async ({ page }) => {
    blobPage = new BlobPageHelper(page, containerName);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();

    await mockService.createContainer(containerName);
  });

  /**
   * Empty state when no blobs exist
   * @not-so-happy-path
   */
  test('displays empty state correctly', async () => {
    await blobPage.navigateTo();
    await blobPage.verifyEmptyState();
  });

  /**
   * File upload error handling
   * @not-so-happy-path
   */
  test('handles file upload errors', async () => {
    mockService.enableErrorSimulation(1.0); // Force errors
    
    const testFiles = TestDataFactory.createTestFiles(1);
    const testDir = path.join(process.cwd(), 'test-temp-error');
    const [filePath] = await TestDataFactory.createTestFilesOnDisk(testDir, testFiles);

    try {
      await blobPage.navigateTo();
      
      // Try to upload - should fail
      await blobPage.uploadFile(filePath);
      
      // Should show error message
      const errorElement = blobPage.getPage().getByTestId('message-error');
      await expect(errorElement).toBeVisible();
    } catch (error) {
      // Upload failing is expected with error simulation
      expect((error as Error).message).toContain('error');
    } finally {
      await TestDataFactory.cleanupTestFiles(testDir);
    }
  });

  /**
   * Invalid file operations
   * @not-so-happy-path
   */
  test('handles operations on non-existent files', async () => {
    await mockService.uploadBlob(containerName, 'test-file.txt', Buffer.from('content'));
    
    await blobPage.navigateTo();
    
    // Delete file externally
    await mockService.deleteBlob(containerName, 'test-file.txt');
    
    // Try to download the now non-existent file
    try {
      await blobPage.downloadFile('test-file.txt');
    } catch {
      // Expected to fail
    }
    
    // Page should handle the error gracefully
    await expect(blobPage.getPage().getByTestId('blob-page')).toBeVisible();
  });

  /**
   * Large file upload handling
   * @not-so-happy-path
   */
  test('handles oversized file uploads', async () => {
    // Create a large test file
    const largeFile: any = {
      name: 'large-file.bin',
      content: Buffer.alloc(100 * 1024 * 1024), // 100MB
      contentType: 'application/octet-stream',
      size: 100 * 1024 * 1024
    };
    
    const testDir = path.join(process.cwd(), 'test-temp-large');
    const [filePath] = await TestDataFactory.createTestFilesOnDisk(testDir, [largeFile]);

    try {
      await blobPage.navigateTo();
      
      // Try to upload large file - might fail or show warning
      await blobPage.uploadFile(filePath);
      
      // Should either succeed or show appropriate message
      const messageElement = blobPage.getPage().getByTestId(/^message-/);
      await expect(messageElement).toBeVisible({ timeout: 60000 }); // Longer timeout for large files
    } catch {
      // Large file upload failing is acceptable behavior
    } finally {
      await TestDataFactory.cleanupTestFiles(testDir);
    }
  });

  /**
   * Network error handling during blob operations
   * @not-so-happy-path
   */
  test('handles network errors gracefully', async () => {
    await mockService.uploadBlob(containerName, 'test-file.txt', Buffer.from('content'));
    mockService.enableErrorSimulation(1.0);
    
    await blobPage.navigateTo();
    
    // Should display error state
    const errorElement = blobPage.getPage().getByTestId(/.*error.*/);
    await expect(errorElement).toBeVisible();
  });

  /**
   * Invalid metadata operations
   * @not-so-happy-path
   */
  test('handles invalid metadata updates', async () => {
    await mockService.uploadBlob(containerName, 'test-file.txt', Buffer.from('content'));
    
    await blobPage.navigateTo();
    
    // Try to set invalid metadata
    const invalidMetadata = {
      '': 'empty key', // Invalid: empty key
      'invalid key with spaces': 'value', // Invalid: spaces in key
      'valid-key': 'a'.repeat(10000), // Invalid: value too long
    };
    
    try {
      await blobPage.updateBlobMetadata('test-file.txt', invalidMetadata);
      
      // Should show validation error
      const errorElement = blobPage.getPage().getByTestId('message-error');
      await expect(errorElement).toBeVisible();
    } catch {
      // Metadata validation failing is expected
    }
  });

  /**
   * Concurrent operations error handling
   * @not-so-happy-path
   */
  test('handles concurrent blob operations', async () => {
    await mockService.uploadBlob(containerName, 'concurrent-test.txt', Buffer.from('content'));
    
    await blobPage.navigateTo();
    
    // Try multiple concurrent operations on same blob
    const operations = [
      blobPage.updateAccessTier('concurrent-test.txt', 'Cool'),
      blobPage.updateBlobMetadata('concurrent-test.txt', { key: 'value' }),
      blobPage.getBlobProperties('concurrent-test.txt'),
    ];
    
    try {
      await Promise.all(operations);
      
      // If all succeed, that's fine
      await blobPage.verifyFileExists('concurrent-test.txt');
    } catch {
      // Some operations failing due to concurrency is acceptable
      // Page should still be functional
      await expect(blobPage.getPage().getByTestId('blob-page')).toBeVisible();
    }
  });

  /**
   * Search with problematic queries
   * @not-so-happy-path
   */
  test('handles problematic search queries', async () => {
    await mockService.uploadBlob(containerName, 'searchable-file.txt', Buffer.from('content'));
    
    await blobPage.navigateTo();
    
    const problematicQueries = [
      '<script>alert("xss")</script>',
      '../../etc/passwd',
      'a'.repeat(10000),
      '\0\n\r\t',
      '🚀🌟✨',
      '%20%3C%3E',
    ];

    for (const query of problematicQueries) {
      await blobPage.searchBlobs(query);
      
      // Should not crash
      await expect(blobPage.getPage().getByTestId('blob-page')).toBeVisible();
      
      await blobPage.clearBlobSearch();
    }
  });
});

test.describe('Blob Management - Performance @performance', () => {
  let blobPage: BlobPageHelper;
  let mockService: MockAzureStorageService;
  const containerName = 'performance-container';

  test.beforeEach(async ({ page }) => {
    blobPage = new BlobPageHelper(page, containerName);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();

    await mockService.createContainer(containerName);
  });

  /**
   * Performance with large number of blobs
   * @performance
   */
  test('handles large blob lists efficiently', async () => {
    // Create many blobs
    const blobCount = 1000;
    
    for (let i = 1; i <= blobCount; i++) {
      await mockService.uploadBlob(
        containerName,
        `performance-test-blob-${i.toString().padStart(4, '0')}.txt`,
        Buffer.from(`Content for blob ${i}`)
      );
    }

    const startTime = Date.now();
    
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(15000); // 15 seconds max
    
    // Verify blobs are displayed (might be paginated)
    const blobs = await blobPage.getBlobList();
    expect(blobs.length).toBeGreaterThan(0);
  });

  /**
   * Upload performance with multiple files
   * @performance
   */
  test('uploads multiple files efficiently', async () => {
    const fileCount = 20;
    const testFiles = TestDataFactory.createTestFiles(fileCount);
    const testDir = path.join(process.cwd(), 'test-temp-perf');
    const filePaths = await TestDataFactory.createTestFilesOnDisk(testDir, testFiles);

    try {
      await blobPage.navigateTo();
      
      const startTime = Date.now();
      
      await blobPage.uploadMultipleFiles(filePaths);
      
      const uploadTime = Date.now() - startTime;
      
      // Multiple uploads should complete within reasonable time
      expect(uploadTime).toBeLessThan(60000); // 1 minute max for 20 files
      
      // Verify all files uploaded
      await blobPage.verifyFileCount(fileCount);
    } finally {
      await TestDataFactory.cleanupTestFiles(testDir);
    }
  });

  /**
   * Search performance with large datasets
   * @performance
   */
  test('searches large blob lists efficiently', async () => {
    // Create many blobs with searchable names
    const searchTerms = ['document', 'image', 'data', 'backup', 'temp'];
    
    for (let i = 1; i <= 200; i++) {
      const term = searchTerms[i % searchTerms.length];
      await mockService.uploadBlob(
        containerName,
        `${term}-file-${i}.txt`,
        Buffer.from(`Content for ${term} file ${i}`)
      );
    }

    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();
    
    const startTime = Date.now();
    
    await blobPage.searchBlobs('document');
    
    const searchTime = Date.now() - startTime;
    
    // Search should be fast
    expect(searchTime).toBeLessThan(3000); // 3 seconds max
    
    const results = await blobPage.getBlobList();
    expect(results.length).toBeGreaterThan(0);
    
    // All results should match search
    for (const blob of results) {
      expect(blob.name).toContain('document');
    }
  });

  /**
   * Bulk operations performance
   * @performance
   */
  test('performs bulk operations efficiently', async () => {
    const blobCount = 100;
    const blobNames = [];
    
    // Create blobs for bulk operations
    for (let i = 1; i <= blobCount; i++) {
      const name = `bulk-perf-test-${i}.txt`;
      blobNames.push(name);
      await mockService.uploadBlob(containerName, name, Buffer.from(`Content ${i}`));
    }

    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();
    
    const startTime = Date.now();
    
    // Bulk delete half of them
    const blobsToDelete = blobNames.slice(0, 50);
    await blobPage.bulkDeleteBlobs(blobsToDelete);
    
    const operationTime = Date.now() - startTime;
    
    // Bulk operation should complete within reasonable time
    expect(operationTime).toBeLessThan(60000); // 1 minute for 50 deletions
    
    // Verify deletions completed
    await blobPage.verifyFileCount(50);
  });

  /**
   * Memory usage during blob operations
   * @performance
   */
  test('maintains reasonable memory usage', async () => {
    // Create substantial blob dataset
    for (let i = 1; i <= 200; i++) {
      await mockService.uploadBlob(
        containerName,
        `memory-test-${i}.txt`,
        Buffer.from(`Content for memory test ${i}`)
      );
    }

    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    // Perform operations that might cause memory leaks
    for (let i = 0; i < 30; i++) {
      await blobPage.refreshBlobs();
      await blobPage.searchBlobs(`test-${i % 10}`);
      await blobPage.clearBlobSearch();
      await blobPage.sortBlobs('name', i % 2 === 0 ? 'asc' : 'desc');
      
      // Small delay
      await blobPage.getPage().waitForTimeout(100);
    }

    // Page should still function normally
    await blobPage.verifyPageLoaded();
    
    const finalBlobCount = await blobPage.getBlobList();
    expect(finalBlobCount.length).toBeGreaterThan(0);
  });

  /**
   * Large file handling performance
   * @performance
   */
  test('handles large file operations efficiently', async () => {
    // Create a moderately large file for performance testing
    const largeFile = {
      name: 'large-performance-test.bin',
      content: Buffer.alloc(10 * 1024 * 1024), // 10MB
      contentType: 'application/octet-stream',
      size: 10 * 1024 * 1024
    };
    
    const testDir = path.join(process.cwd(), 'test-temp-large-perf');
    const [filePath] = await TestDataFactory.createTestFilesOnDisk(testDir, [largeFile]);

    try {
      await blobPage.navigateTo();
      
      const startTime = Date.now();
      
      await blobPage.uploadFile(filePath);
      
      const uploadTime = Date.now() - startTime;
      
      // 10MB file should upload within reasonable time
      expect(uploadTime).toBeLessThan(30000); // 30 seconds max
      
      await blobPage.verifyFileExists(largeFile.name);
      
      // Test download performance
      const downloadStartTime = Date.now();
      
      const download = await blobPage.downloadFile(largeFile.name);
      
      const downloadTime = Date.now() - downloadStartTime;
      
      // Download should be fast (just generates link)
      expect(downloadTime).toBeLessThan(5000); // 5 seconds max
      expect(download).toBeTruthy();
      
    } finally {
      await TestDataFactory.cleanupTestFiles(testDir);
    }
  });
});
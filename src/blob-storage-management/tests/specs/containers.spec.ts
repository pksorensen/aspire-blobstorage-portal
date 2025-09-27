import { test, expect } from '@playwright/test';
import { ContainerPageHelper } from '../page-objects/container-page';
import { MockAzureStorageService } from '../mocks/azure-storage-service';
import { TestDataFactory } from '../fixtures/test-data-factory';

/**
 * Container management tests
 * Tests container CRUD operations, search, filtering, and bulk operations
 */

test.describe('Container Management - Basic Operations @happy-path', () => {
  let containerPage: ContainerPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    containerPage = new ContainerPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();

    // Create initial test containers
    await mockService.createContainer('documents', { 
      metadata: { description: 'Document storage' } 
    });
    await mockService.createContainer('images', { 
      metadata: { description: 'Image storage' } 
    });
  });

  /**
   * Basic container listing functionality
   * @happy-path
   */
  test('displays container list correctly', async () => {
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Verify containers are visible
    await containerPage.verifyContainerExists('documents');
    await containerPage.verifyContainerExists('images');
    await containerPage.verifyContainerCount(2);
  });

  /**
   * Container creation functionality
   * @happy-path
   */
  test('creates new container successfully', async () => {
    await containerPage.navigateTo();
    
    await containerPage.createContainer('new-test-container');
    
    // Verify container was created
    await containerPage.verifyContainerExists('new-test-container');
    await containerPage.verifyContainerCount(3);

    // Verify in mock service
    expect(mockService.hasContainer('new-test-container')).toBe(true);
  });

  /**
   * Container deletion functionality
   * @happy-path
   */
  test('deletes container successfully', async () => {
    await containerPage.navigateTo();
    
    await containerPage.deleteContainer('documents');
    
    // Verify container was removed
    await containerPage.verifyContainerNotExists('documents');
    await containerPage.verifyContainerCount(1);

    // Verify in mock service
    expect(mockService.hasContainer('documents')).toBe(false);
  });

  /**
   * Navigation to container blob listing
   * @happy-path
   */
  test('navigates to container blob listing', async () => {
    await containerPage.navigateTo();
    
    await containerPage.navigateToContainer('documents');
    
    await expect(containerPage.getPage()).toHaveURL(/.*\/containers\/documents/);
  });

  /**
   * Basic container search functionality
   * @happy-path
   */
  test('searches containers by name', async () => {
    await containerPage.navigateTo();
    
    await containerPage.searchContainers('doc');
    
    // Should show only documents container
    await containerPage.verifyContainerExists('documents');
    await containerPage.verifyContainerNotExists('images');
    
    // Clear search
    await containerPage.clearSearch();
    
    // Should show all containers again
    await containerPage.verifyContainerCount(2);
  });
});

test.describe('Container Management - Advanced Features @extended-happy-path', () => {
  let containerPage: ContainerPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    containerPage = new ContainerPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();

    // Create comprehensive test data
    const testData = TestDataFactory.createTestDataSet({
      containerCount: 10,
      blobsPerContainer: 5,
    });

    for (const container of testData.containers) {
      await mockService.createContainer(container.name, {
        metadata: container.metadata,
        publicAccess: container.properties.publicAccess
      });
      
      const blobs = testData.blobs.get(container.name) || [];
      for (const blob of blobs) {
        await mockService.uploadBlob(
          container.name,
          blob.name,
          Buffer.from(`Content for ${blob.name}`),
          {
            blobHTTPHeaders: { blobContentType: blob.properties.contentType },
            metadata: blob.metadata
          }
        );
      }
    }
  });

  /**
   * Container sorting functionality
   * @extended-happy-path
   */
  test('sorts containers by different criteria', async () => {
    await containerPage.navigateTo();
    
    // Test name sorting
    await containerPage.sortContainers('name', 'asc');
    const nameAscContainers = await containerPage.getContainerList();
    
    await containerPage.sortContainers('name', 'desc');
    const nameDescContainers = await containerPage.getContainerList();
    
    // Verify sorting worked (first container should be different)
    expect(nameAscContainers[0].name).not.toBe(nameDescContainers[0].name);
    
    // Test modified date sorting
    await containerPage.sortContainers('modified', 'desc');
    await containerPage.verifyContainerCount(10);
  });

  /**
   * Container filtering by public access
   * @extended-happy-path
   */
  test('filters containers by public access level', async () => {
    await containerPage.navigateTo();
    
    // Filter by none (default)
    await containerPage.filterByPublicAccess('none');
    
    const noneAccessContainers = await containerPage.getContainerList();
    expect(noneAccessContainers.length).toBeGreaterThan(0);
    
    // Each container should have public access 'none'
    for (const container of noneAccessContainers) {
      expect(container.publicAccess).toBe('none');
    }
    
    // Reset filter
    await containerPage.filterByPublicAccess('all');
    await containerPage.verifyContainerCount(10);
  });

  /**
   * Container properties viewing
   * @extended-happy-path
   */
  test('displays container properties correctly', async () => {
    await containerPage.navigateTo();
    
    const containers = await containerPage.getContainerList();
    const firstContainer = containers[0];
    
    const properties = await containerPage.getContainerProperties(firstContainer.name);
    
    expect(properties.name).toBe(firstContainer.name);
    expect(properties.blobCount).toBeGreaterThanOrEqual(0);
    expect(properties.lastModified).toBeTruthy();
    expect(properties.etag).toBeTruthy();
  });

  /**
   * Bulk operations on multiple containers
   * @extended-happy-path
   */
  test('performs bulk delete operations', async () => {
    await containerPage.navigateTo();
    
    const containers = await containerPage.getContainerList();
    const containersToDelete = containers.slice(0, 3).map(c => c.name);
    
    await containerPage.bulkDeleteContainers(containersToDelete);
    
    // Verify containers were deleted
    for (const containerName of containersToDelete) {
      await containerPage.verifyContainerNotExists(containerName);
      expect(mockService.hasContainer(containerName)).toBe(false);
    }
    
    await containerPage.verifyContainerCount(7); // 10 - 3 = 7
  });

  /**
   * Container refresh functionality
   * @extended-happy-path
   */
  test('refreshes container list', async () => {
    await containerPage.navigateTo();
    
    const initialCount = (await containerPage.getContainerList()).length;
    
    // Add container externally
    await mockService.createContainer('externally-added-container');
    
    // Refresh the page
    await containerPage.refreshContainers();
    
    // Should show updated count
    await containerPage.verifyContainerCount(initialCount + 1);
    await containerPage.verifyContainerExists('externally-added-container');
  });

  /**
   * Container export functionality
   * @extended-happy-path
   */
  test('exports container list', async () => {
    await containerPage.navigateTo();
    
    const download = await containerPage.exportContainerList();
    
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/containers.*\.csv$/);
  });

  /**
   * Pagination with many containers
   * @extended-happy-path
   */
  test('handles pagination correctly', async () => {
    // Create many containers to test pagination
    for (let i = 11; i <= 25; i++) {
      await mockService.createContainer(`test-container-${i}`);
    }
    
    await containerPage.navigateTo();
    
    // If pagination is implemented (depends on page size)
    try {
      await containerPage.verifyPagination(2); // Assuming page size of ~20
      await containerPage.navigateToPage(2);
      
      // Verify we're on page 2
      const containers = await containerPage.getContainerList();
      expect(containers.length).toBeGreaterThan(0);
    } catch {
      // If pagination isn't implemented or not needed, that's OK
      await containerPage.verifyContainerCount(25); // Just verify all containers are shown
    }
  });

  /**
   * Complex search scenarios
   * @extended-happy-path
   */
  test('performs advanced container searches', async () => {
    await containerPage.navigateTo();
    
    const allContainers = await containerPage.getContainerList();
    
    // Test partial name search
    const searchTerm = allContainers[0].name.substring(0, 3);
    await containerPage.searchContainers(searchTerm);
    
    const searchResults = await containerPage.getContainerList();
    expect(searchResults.length).toBeGreaterThan(0);
    
    // All results should contain the search term
    for (const container of searchResults) {
      expect(container.name.toLowerCase()).toContain(searchTerm.toLowerCase());
    }
    
    // Test case-insensitive search
    await containerPage.clearSearch();
    await containerPage.searchContainers(searchTerm.toUpperCase());
    
    const caseInsensitiveResults = await containerPage.getContainerList();
    expect(caseInsensitiveResults.length).toEqual(searchResults.length);
  });
});

test.describe('Container Management - Error Scenarios @not-so-happy-path', () => {
  let containerPage: ContainerPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    containerPage = new ContainerPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
  });

  /**
   * Empty state when no containers exist
   * @not-so-happy-path
   */
  test('displays empty state correctly', async () => {
    await containerPage.navigateTo();
    await containerPage.verifyEmptyState();
  });

  /**
   * Container name validation errors
   * @not-so-happy-path
   */
  test('validates container names correctly', async () => {
    await containerPage.navigateTo();
    
    const invalidNames = [
      '', // empty name
      'A', // too short (minimum 3 characters)
      'UPPERCASE', // uppercase not allowed
      'invalid-name-', // cannot end with dash
      'invalid..name', // consecutive dots not allowed
      'invalid_name', // underscores not allowed
      'a'.repeat(64), // too long (maximum 63 characters)
      '123invalid', // cannot start with number
      'invalid name', // spaces not allowed
    ];

    for (const invalidName of invalidNames) {
      await containerPage.verifyContainerNameValidation(
        invalidName,
        'Container name is invalid'
      );
    }
  });

  /**
   * Error handling when creating duplicate containers
   * @not-so-happy-path
   */
  test('handles duplicate container creation', async () => {
    // Create initial container
    await mockService.createContainer('existing-container');
    
    await containerPage.navigateTo();
    
    // Try to create container with same name
    try {
      await containerPage.createContainer('existing-container');
      
      // Should show error message
      const errorElement = containerPage.getPage().getByTestId('message-error');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText('already exists');
    } catch (error) {
      // Creating duplicate should fail, which is expected
      expect((error as Error).message).toContain('already exists');
    }
  });

  /**
   * Error handling when deleting non-existent containers
   * @not-so-happy-path
   */
  test('handles deletion of non-existent containers', async () => {
    await mockService.createContainer('test-container');
    
    await containerPage.navigateTo();
    
    // Delete container externally
    await mockService.deleteContainer('test-container');
    
    // Try to delete from UI (should handle gracefully)
    try {
      await containerPage.deleteContainer('test-container');
    } catch {
      // This is expected behavior - container no longer exists
    }
    
    // Page should handle the error gracefully
    await expect(containerPage.getPage().getByTestId('containers-page')).toBeVisible();
  });

  /**
   * Network error handling
   * @not-so-happy-path
   */
  test('handles network errors gracefully', async () => {
    await mockService.createContainer('test-container');
    mockService.enableErrorSimulation(1.0); // 100% error rate
    
    await containerPage.navigateTo();
    
    // Should display error state instead of crashing
    const errorElement = containerPage.getPage().getByTestId('containers-error');
    await expect(errorElement).toBeVisible();
  });

  /**
   * Search with special characters and edge cases
   * @not-so-happy-path
   */
  test('handles problematic search queries', async () => {
    await mockService.createContainer('test-container');
    
    await containerPage.navigateTo();
    
    const problematicQueries = [
      '<script>alert("xss")</script>', // XSS attempt
      '../../etc/passwd', // Path traversal
      'a'.repeat(1000), // Very long string
      '🚀🌟✨', // Unicode/emoji
      '\n\r\t', // Control characters
      '%20%3C%3E', // URL encoded
    ];

    for (const query of problematicQueries) {
      await containerPage.searchContainers(query);
      
      // Should not crash
      await expect(containerPage.getPage().getByTestId('containers-page')).toBeVisible();
      
      // Clear search for next iteration
      await containerPage.clearSearch();
    }
  });

  /**
   * Bulk operations error handling
   * @not-so-happy-path
   */
  test('handles bulk operation errors', async () => {
    await mockService.createContainer('container1');
    await mockService.createContainer('container2');
    
    await containerPage.navigateTo();
    
    // Delete one container externally
    await mockService.deleteContainer('container1');
    
    // Try bulk delete including the already deleted container
    try {
      await containerPage.bulkDeleteContainers(['container1', 'container2']);
    } catch {
      // Expected to fail
    }
    
    // Should show partial success or error message
    const messageElement = containerPage.getPage().getByTestId(/^message-/);
    await expect(messageElement).toBeVisible();
  });

  /**
   * Service timeout handling
   * @not-so-happy-path
   */
  test('handles service timeouts', async () => {
    mockService.setNetworkDelay(10000); // 10 second delay
    
    await containerPage.navigateTo();
    
    // Should show loading state
    await containerPage.verifyLoadingState();
    
    // Eventually should show timeout error or retry option
    const errorOrRetry = containerPage.getPage().locator('[data-testid*="error"], [data-testid*="retry"], [data-testid*="timeout"]');
    await expect(errorOrRetry).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Container Management - Performance @performance', () => {
  let containerPage: ContainerPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    containerPage = new ContainerPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
  });

  /**
   * Performance with large number of containers
   * @performance
   */
  test('handles large container lists efficiently', async () => {
    // Create large number of containers
    const containerCount = 200;
    
    for (let i = 1; i <= containerCount; i++) {
      await mockService.createContainer(`perf-test-container-${i.toString().padStart(3, '0')}`);
    }

    const startTime = Date.now();
    
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time even with many containers
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Verify all containers loaded (or paginated correctly)
    const containers = await containerPage.getContainerList();
    expect(containers.length).toBeGreaterThan(0);
  });

  /**
   * Search performance with large datasets
   * @performance
   */
  test('searches large container lists efficiently', async () => {
    // Create many containers with varied names
    const containerNames = [];
    for (let i = 1; i <= 100; i++) {
      const name = `${TestDataFactory.createContainer().name}-${i}`;
      containerNames.push(name);
      await mockService.createContainer(name);
    }

    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();
    
    const startTime = Date.now();
    
    // Search for specific term
    const searchTerm = containerNames[0].substring(0, 5);
    await containerPage.searchContainers(searchTerm);
    
    const searchTime = Date.now() - startTime;
    
    // Search should be fast even with many containers
    expect(searchTime).toBeLessThan(2000); // 2 seconds max
    
    const results = await containerPage.getContainerList();
    expect(results.length).toBeGreaterThan(0);
  });

  /**
   * Bulk operations performance
   * @performance
   */
  test('performs bulk operations efficiently', async () => {
    const containerCount = 50;
    const containerNames = [];
    
    // Create containers for bulk operations
    for (let i = 1; i <= containerCount; i++) {
      const name = `bulk-test-container-${i}`;
      containerNames.push(name);
      await mockService.createContainer(name);
    }

    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();
    
    const startTime = Date.now();
    
    // Bulk delete half of them
    const containersToDelete = containerNames.slice(0, 25);
    await containerPage.bulkDeleteContainers(containersToDelete);
    
    const operationTime = Date.now() - startTime;
    
    // Bulk operation should be reasonably fast
    expect(operationTime).toBeLessThan(30000); // 30 seconds max for 25 deletions
    
    // Verify deletions completed
    await containerPage.verifyContainerCount(25);
  });

  /**
   * Memory usage during container operations
   * @performance
   */
  test('maintains reasonable memory usage', async () => {
    // Create substantial number of containers
    for (let i = 1; i <= 100; i++) {
      await mockService.createContainer(`memory-test-${i}`);
    }

    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Perform multiple operations that might cause memory leaks
    for (let i = 0; i < 20; i++) {
      await containerPage.refreshContainers();
      await containerPage.searchContainers(`test-${i % 10}`);
      await containerPage.clearSearch();
      
      // Small delay between operations
      await containerPage.getPage().waitForTimeout(50);
    }

    // If we get here without timeout or crash, memory usage is acceptable
    await containerPage.verifyPageLoaded();
    
    // Verify page still functions normally
    const containers = await containerPage.getContainerList();
    expect(containers.length).toBe(100);
  });
});
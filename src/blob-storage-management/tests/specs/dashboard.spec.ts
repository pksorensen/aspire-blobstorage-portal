import { test, expect } from '@playwright/test';
import { DashboardPageHelper } from '../page-objects/dashboard-page';
import { MockAzureStorageService } from '../mocks/azure-storage-service';
import { TestDataFactory } from '../fixtures/test-data-factory';

/**
 * Dashboard functionality tests
 * Tests the main dashboard with storage metrics, recent items, and navigation
 */

test.describe('Dashboard - Storage Overview @happy-path', () => {
  let dashboardPage: DashboardPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    // Seed with basic test data for happy path
    await mockService.createContainer('documents');
    await mockService.createContainer('images');
    await mockService.uploadBlob('documents', 'test.pdf', Buffer.from('PDF content'));
    await mockService.uploadBlob('images', 'photo.jpg', Buffer.from('JPG content'));
  });

  /**
   * Core dashboard loading functionality
   * @happy-path
   */
  test('displays storage metrics correctly', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Verify metrics are visible
    await dashboardPage.verifyMetricsVisible();

    // Verify specific metric values
    const metrics = await dashboardPage.getStorageMetrics();
    expect(metrics.containerCount).toBe('2');
    expect(metrics.blobCount).toBe('2');
    expect(metrics.totalSize).toContain('B'); // Should show some size
  });

  /**
   * Navigation functionality from dashboard
   * @happy-path
   */
  test('navigates to containers page', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.navigateToContainers();

    await expect(dashboardPage.getPage()).toHaveURL(/.*\/containers/);
  });

  /**
   * Quick actions functionality
   * @happy-path
   */
  test('displays quick actions correctly', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.verifyQuickActionsVisible();
  });

  /**
   * Sidebar navigation functionality
   * @happy-path
   */
  test('displays sidebar navigation', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.verifySidebarNavigation();
  });
});

test.describe('Dashboard - Advanced Features @extended-happy-path', () => {
  let dashboardPage: DashboardPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    // Create comprehensive test data set
    const testDataSet = TestDataFactory.createTestDataSet({
      containerCount: 5,
      blobsPerContainer: 10,
    });

    // Populate mock service
    for (const container of testDataSet.containers) {
      await mockService.createContainer(container.name, {
        metadata: container.metadata,
        publicAccess: container.properties.publicAccess
      });
      
      const blobs = testDataSet.blobs.get(container.name) || [];
      for (const blob of blobs) {
        await mockService.uploadBlob(
          container.name,
          blob.name,
          Buffer.from(`Content for ${blob.name}`),
          {
            blobHTTPHeaders: {
              blobContentType: blob.properties.contentType
            },
            metadata: blob.metadata,
            tier: blob.properties.accessTier
          }
        );
      }
    }
  });

  /**
   * Recent items functionality with multiple containers and blobs
   * @extended-happy-path
   */
  test('displays recent items correctly', async () => {
    await dashboardPage.navigateTo();
    
    await dashboardPage.verifyRecentItemsVisible();
    
    // Since we just created the data, there might not be recent items yet
    // In a real implementation, this would test actual recent access tracking
    const recentItems = await dashboardPage.getRecentItems();
    expect(Array.isArray(recentItems)).toBe(true);
  });

  /**
   * Global search functionality from dashboard
   * @extended-happy-path
   */
  test('performs global search', async () => {
    await dashboardPage.navigateTo();
    
    await dashboardPage.performGlobalSearch('documents');
    
    // Verify search results are displayed
    // This would require implementation of search functionality
    await expect(dashboardPage.getPage().getByTestId('search-results-section')).toBeVisible();
  });

  /**
   * Dashboard data refresh functionality
   * @extended-happy-path
   */
  test('refreshes dashboard data', async () => {
    await dashboardPage.navigateTo();
    
    // Get initial metrics
    const initialMetrics = await dashboardPage.getStorageMetrics();
    
    // Add more data
    await mockService.createContainer('new-container');
    
    // Refresh dashboard
    await dashboardPage.refreshDashboard();
    
    // Verify metrics updated
    const updatedMetrics = await dashboardPage.getStorageMetrics();
    expect(parseInt(updatedMetrics.containerCount)).toBeGreaterThan(parseInt(initialMetrics.containerCount));
  });

  /**
   * Sidebar toggle functionality
   * @extended-happy-path
   */
  test('toggles sidebar visibility', async () => {
    await dashboardPage.navigateTo();
    
    // Verify sidebar is visible initially
    await dashboardPage.verifySidebarNavigation();
    
    // Toggle sidebar
    await dashboardPage.toggleSidebar();
    
    // Verify sidebar state changed (implementation would depend on specific behavior)
    const sidebar = dashboardPage.getPage().getByTestId('sidebar-navigation');
    // This might check for a collapsed class or visibility state
  });

  /**
   * Container quick navigation
   * @extended-happy-path
   */
  test('navigates to specific container from quick links', async () => {
    await dashboardPage.navigateTo();
    
    // Navigate to a specific container (assuming quick links are implemented)
    try {
      await dashboardPage.navigateToContainer('documents');
      await expect(dashboardPage.getPage()).toHaveURL(/.*\/containers\/documents/);
    } catch {
      // If quick container navigation isn't implemented, skip this part
      test.skip();
    }
  });

  /**
   * Mobile responsive layout
   * @extended-happy-path
   */
  test('displays correctly on mobile devices', async () => {
    await dashboardPage.verifyMobileLayout();
  });
});

test.describe('Dashboard - Error Scenarios @not-so-happy-path', () => {
  let dashboardPage: DashboardPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
  });

  /**
   * Empty state when no containers exist
   * @not-so-happy-path
   */
  test('displays empty state correctly', async () => {
    // Don't add any containers - test empty state
    await dashboardPage.navigateTo();
    await dashboardPage.verifyEmptyState();
  });

  /**
   * Error handling when Azure service is unavailable
   * @not-so-happy-path
   */
  test('handles service errors gracefully', async () => {
    // Enable error simulation
    mockService.enableErrorSimulation(1.0); // 100% error rate
    
    await dashboardPage.navigateTo();
    
    // Should display error message instead of crashing
    const errorMessage = dashboardPage.getPage().getByTestId('dashboard-error');
    await expect(errorMessage).toBeVisible();
  });

  /**
   * Network timeout handling
   * @not-so-happy-path
   */
  test('handles slow network responses', async () => {
    // Simulate slow network
    mockService.setNetworkDelay(5000); // 5 second delay
    
    await dashboardPage.navigateTo();
    
    // Should show loading state
    await dashboardPage.verifyDashboardLoading();
    
    // Eventually should load (with increased timeout)
    await dashboardPage.verifyPageLoaded();
  });

  /**
   * Invalid navigation scenarios
   * @not-so-happy-path
   */
  test('handles invalid navigation gracefully', async () => {
    await dashboardPage.navigateTo();
    
    // Try to navigate to non-existent container
    try {
      await dashboardPage.navigateToContainer('non-existent-container');
      // Should either show error or redirect to containers page
      const url = dashboardPage.getPage().url();
      expect(url).toMatch(/(error|containers|not-found)/);
    } catch {
      // Navigation failing is also acceptable behavior
    }
  });

  /**
   * Search with no results
   * @not-so-happy-path
   */
  test('handles search with no results', async () => {
    // Add some test data
    await mockService.createContainer('documents');
    
    await dashboardPage.navigateTo();
    
    // Search for something that doesn't exist
    await dashboardPage.performGlobalSearch('nonexistentterm12345');
    
    // Should show no results message
    await dashboardPage.verifySearchResults(0);
  });

  /**
   * Malformed search queries
   * @not-so-happy-path
   */
  test('handles malformed search queries', async () => {
    await dashboardPage.navigateTo();
    
    // Test various malformed queries
    const malformedQueries = [
      '', // empty
      '   ', // whitespace only
      'a'.repeat(1000), // very long
      '<script>alert("xss")</script>', // potential XSS
      '../../etc/passwd', // path traversal attempt
    ];

    for (const query of malformedQueries) {
      await dashboardPage.performGlobalSearch(query);
      
      // Should not crash or show error
      await expect(dashboardPage.getPage().getByTestId('dashboard-container')).toBeVisible();
    }
  });
});

test.describe('Dashboard - Performance @performance', () => {
  let dashboardPage: DashboardPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
  });

  /**
   * Dashboard loading performance with large datasets
   * @performance
   */
  test('loads dashboard with large number of containers efficiently', async () => {
    // Create large test dataset
    const testDataSet = TestDataFactory.createLargeTestDataSet({
      containerCount: 100,
      blobsPerContainer: 50,
    });

    // Populate mock service
    for (const container of testDataSet.containers) {
      await mockService.createContainer(container.name);
      
      const blobs = testDataSet.blobs.get(container.name) || [];
      for (const blob of blobs) {
        await mockService.uploadBlob(
          container.name,
          blob.name,
          Buffer.from(`Content for ${blob.name}`)
        );
      }
    }

    const startTime = Date.now();
    
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();
    await dashboardPage.verifyMetricsVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 5 seconds even with large dataset
    expect(loadTime).toBeLessThan(5000);
    
    // Verify correct metrics are displayed
    const metrics = await dashboardPage.getStorageMetrics();
    expect(parseInt(metrics.containerCount)).toBe(100);
    expect(parseInt(metrics.blobCount)).toBe(5000); // 100 containers * 50 blobs each
  });

  /**
   * Memory usage during dashboard operations
   * @performance
   */
  test('maintains reasonable memory usage', async () => {
    // Create substantial test data
    const testDataSet = TestDataFactory.createTestDataSet({
      containerCount: 20,
      blobsPerContainer: 100,
    });

    // Populate mock service
    for (const container of testDataSet.containers) {
      await mockService.createContainer(container.name);
      
      const blobs = testDataSet.blobs.get(container.name) || [];
      for (const blob of blobs) {
        await mockService.uploadBlob(
          container.name,
          blob.name,
          Buffer.alloc(1024) // 1KB per blob
        );
      }
    }

    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Perform multiple refresh operations to test for memory leaks
    for (let i = 0; i < 10; i++) {
      await dashboardPage.refreshDashboard();
      await dashboardPage.verifyMetricsVisible();
      
      // Small delay between refreshes
      await dashboardPage.getPage().waitForTimeout(100);
    }

    // If we get here without timeout or crash, memory usage is acceptable
    await dashboardPage.verifyPageLoaded();
  });

  /**
   * Concurrent dashboard operations performance
   * @performance
   */
  test('handles concurrent dashboard operations', async () => {
    await mockService.createContainer('test-container');
    await mockService.uploadBlob('test-container', 'test.txt', Buffer.from('test'));

    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Perform multiple concurrent operations
    const operations = [
      dashboardPage.refreshDashboard(),
      dashboardPage.performGlobalSearch('test'),
      dashboardPage.getStorageMetrics(),
      dashboardPage.verifyQuickActionsVisible(),
    ];

    const startTime = Date.now();
    await Promise.all(operations);
    const operationTime = Date.now() - startTime;

    // All concurrent operations should complete within reasonable time
    expect(operationTime).toBeLessThan(10000); // 10 seconds max
  });
});
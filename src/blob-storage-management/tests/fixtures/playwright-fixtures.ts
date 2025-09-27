import { test as base, Page } from '@playwright/test';
import { DashboardPageHelper } from '../page-objects/dashboard-page';
import { ContainerPageHelper } from '../page-objects/container-page';
import { BlobPageHelper } from '../page-objects/blob-page';
import { MockAzureStorageService } from '../mocks/azure-storage-service';
import { TestHelpers } from './test-helpers';

/**
 * Custom Playwright fixtures for Azure Storage Explorer tests
 * Provides pre-configured page helpers and mock services
 */

// Define the types for our fixtures
type AzureStorageFixtures = {
  dashboardPage: DashboardPageHelper;
  containerPage: ContainerPageHelper;
  blobPage: (containerName: string) => BlobPageHelper;
  mockService: MockAzureStorageService;
  testHelpers: typeof TestHelpers;
};

/**
 * Extended test with Azure Storage specific fixtures
 */
export const test = base.extend<AzureStorageFixtures>({
  // Dashboard page helper fixture
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPageHelper(page);
    await use(dashboardPage);
  },

  // Container page helper fixture  
  containerPage: async ({ page }, use) => {
    const containerPage = new ContainerPageHelper(page);
    await use(containerPage);
  },

  // Blob page helper factory fixture
  blobPage: async ({ page }, use) => {
    const blobPageFactory = (containerName: string) => new BlobPageHelper(page, containerName);
    await use(blobPageFactory);
  },

  // Mock Azure Storage service fixture
  mockService: async ({}, use) => {
    const mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    await use(mockService);
    await mockService.cleanup();
  },

  // Test helpers fixture
  testHelpers: async ({}, use) => {
    await use(TestHelpers);
  },
});

/**
 * Test with comprehensive test data pre-loaded
 */
export const testWithData = test.extend<AzureStorageFixtures & { testDataLoaded: boolean }>({
  testDataLoaded: async ({ mockService }, use) => {
    await TestHelpers.setupComprehensiveTestData(mockService, {
      containerCount: 5,
      blobsPerContainer: 8,
      includeEmptyContainers: true,
      includeLargeBlobs: false,
    });
    await use(true);
  },

  // Override fixtures to ensure data is loaded
  dashboardPage: async ({ page, testDataLoaded }, use) => {
    const dashboardPage = new DashboardPageHelper(page);
    await use(dashboardPage);
  },

  containerPage: async ({ page, testDataLoaded }, use) => {
    const containerPage = new ContainerPageHelper(page);
    await use(containerPage);
  },

  blobPage: async ({ page, testDataLoaded }, use) => {
    const blobPageFactory = (containerName: string) => new BlobPageHelper(page, containerName);
    await use(blobPageFactory);
  },
});

/**
 * Test with performance test data (large datasets)
 */
export const testWithPerformanceData = test.extend<AzureStorageFixtures & { performanceDataLoaded: boolean }>({
  performanceDataLoaded: async ({ mockService }, use) => {
    await TestHelpers.setupPerformanceTestData(mockService, {
      containerCount: 20,
      blobsPerContainer: 50,
      avgBlobSize: 5 * 1024, // 5KB average
    });
    await use(true);
  },

  dashboardPage: async ({ page, performanceDataLoaded }, use) => {
    const dashboardPage = new DashboardPageHelper(page);
    await use(dashboardPage);
  },

  containerPage: async ({ page, performanceDataLoaded }, use) => {
    const containerPage = new ContainerPageHelper(page);
    await use(containerPage);
  },

  blobPage: async ({ page, performanceDataLoaded }, use) => {
    const blobPageFactory = (containerName: string) => new BlobPageHelper(page, containerName);
    await use(blobPageFactory);
  },
});

/**
 * Test with search-optimized test data
 */
export const testWithSearchData = test.extend<AzureStorageFixtures & { searchDataLoaded: boolean }>({
  searchDataLoaded: async ({ mockService }, use) => {
    await TestHelpers.setupSearchTestData(mockService);
    await use(true);
  },

  dashboardPage: async ({ page, searchDataLoaded }, use) => {
    const dashboardPage = new DashboardPageHelper(page);
    await use(dashboardPage);
  },

  containerPage: async ({ page, searchDataLoaded }, use) => {
    const containerPage = new ContainerPageHelper(page);
    await use(containerPage);
  },

  blobPage: async ({ page, searchDataLoaded }, use) => {
    const blobPageFactory = (containerName: string) => new BlobPageHelper(page, containerName);
    await use(blobPageFactory);
  },
});

/**
 * Test with error simulation capabilities
 */
export const testWithErrors = test.extend<AzureStorageFixtures & { errorControls: ReturnType<typeof TestHelpers.setupErrorScenarios> }>({
  errorControls: async ({ mockService }, use) => {
    const errorControls = TestHelpers.setupErrorScenarios(mockService);
    await use(errorControls);
  },

  dashboardPage: async ({ page, errorControls }, use) => {
    const dashboardPage = new DashboardPageHelper(page);
    await use(dashboardPage);
  },

  containerPage: async ({ page, errorControls }, use) => {
    const containerPage = new ContainerPageHelper(page);
    await use(containerPage);
  },

  blobPage: async ({ page, errorControls }, use) => {
    const blobPageFactory = (containerName: string) => new BlobPageHelper(page, containerName);
    await use(blobPageFactory);
  },
});

/**
 * Test with performance measurement capabilities
 */
export const testWithPerformanceTracking = test.extend<AzureStorageFixtures & { 
  performanceTracker: ReturnType<typeof TestHelpers.createPerformanceMeasurement> 
}>({
  performanceTracker: async ({}, use) => {
    const tracker = TestHelpers.createPerformanceMeasurement();
    await use(tracker);
    
    // Log performance results after test
    const measurements = tracker.getMeasurements();
    if (measurements.length > 0) {
      console.log('Performance measurements:');
      measurements.forEach(m => {
        console.log(`  ${m.operationName}: ${m.duration}ms (${m.success ? 'success' : 'failed'})`);
      });
    }
  },

  dashboardPage: async ({ page, performanceTracker }, use) => {
    const dashboardPage = new DashboardPageHelper(page);
    await use(dashboardPage);
  },

  containerPage: async ({ page, performanceTracker }, use) => {
    const containerPage = new ContainerPageHelper(page);
    await use(containerPage);
  },

  blobPage: async ({ page, performanceTracker }, use) => {
    const blobPageFactory = (containerName: string) => new BlobPageHelper(page, containerName);
    await use(blobPageFactory);
  },
});

// Export expect from Playwright
export { expect } from '@playwright/test';

/**
 * Utility function to create scenario-specific tests
 */
export function createScenarioTest(scenario: 'empty' | 'single-container' | 'mixed-access-tiers' | 'many-containers' | 'large-blobs') {
  return test.extend<AzureStorageFixtures & { scenarioLoaded: boolean }>({
    scenarioLoaded: async ({ mockService }, use) => {
      await TestHelpers.createScenarioData(mockService, scenario);
      await use(true);
    },

    dashboardPage: async ({ page, scenarioLoaded }, use) => {
      const dashboardPage = new DashboardPageHelper(page);
      await use(dashboardPage);
    },

    containerPage: async ({ page, scenarioLoaded }, use) => {
      const containerPage = new ContainerPageHelper(page);
      await use(containerPage);
    },

    blobPage: async ({ page, scenarioLoaded }, use) => {
      const blobPageFactory = (containerName: string) => new BlobPageHelper(page, containerName);
      await use(blobPageFactory);
    },
  });
}

/**
 * Mobile-specific test fixture
 */
export const testMobile = test.extend<AzureStorageFixtures>({
  page: async ({ browser }, use) => {
    const page = await browser.newPage({
      viewport: { width: 375, height: 667 }, // iPhone SE size
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    await use(page);
    await page.close();
  },
});

/**
 * Desktop-specific test fixture with large viewport
 */
export const testDesktop = test.extend<AzureStorageFixtures>({
  page: async ({ browser }, use) => {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });
    await use(page);
    await page.close();
  },
});
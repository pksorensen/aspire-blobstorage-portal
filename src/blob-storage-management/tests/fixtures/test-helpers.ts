import { Page } from '@playwright/test';
import { DashboardPageHelper } from '../page-objects/dashboard-page';
import { ContainerPageHelper } from '../page-objects/container-page';
import { BlobPageHelper } from '../page-objects/blob-page';
import { MockAzureStorageService } from '../mocks/azure-storage-service';
import { TestDataFactory } from './test-data-factory';
import { TestDataSet, PerformanceMetrics } from '../types/azure-types';

/**
 * Test helpers for common test operations and utilities
 */
export class TestHelpers {
  /**
   * Create all page helpers for a test
   */
  static createPageHelpers(page: Page, containerName?: string) {
    return {
      dashboard: new DashboardPageHelper(page),
      containers: new ContainerPageHelper(page),
      blobs: containerName ? new BlobPageHelper(page, containerName) : null,
    };
  }

  /**
   * Initialize mock service with comprehensive test data
   */
  static async setupComprehensiveTestData(
    mockService: MockAzureStorageService,
    options: {
      containerCount?: number;
      blobsPerContainer?: number;
      includeEmptyContainers?: boolean;
      includeLargeBlobs?: boolean;
    } = {}
  ): Promise<TestDataSet> {
    const {
      containerCount = 5,
      blobsPerContainer = 10,
      includeEmptyContainers = true,
      includeLargeBlobs = false,
    } = options;

    await mockService.initialize();

    const testDataSet = TestDataFactory.createTestDataSet({
      containerCount,
      blobsPerContainer,
    });

    // Create containers
    for (const container of testDataSet.containers) {
      await mockService.createContainer(container.name, {
        metadata: container.metadata,
        publicAccess: container.properties.publicAccess
      });
    }

    // Create blobs
    for (const [containerName, blobs] of testDataSet.blobs.entries()) {
      for (const blob of blobs) {
        const content = includeLargeBlobs && Math.random() > 0.8 
          ? Buffer.alloc(1024 * 1024) // 1MB for some blobs
          : Buffer.from(`Content for ${blob.name}`);

        await mockService.uploadBlob(
          containerName,
          blob.name,
          content,
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

    // Add empty containers if requested
    if (includeEmptyContainers) {
      await mockService.createContainer('empty-container-1');
      await mockService.createContainer('empty-container-2');
    }

    return testDataSet;
  }

  /**
   * Setup performance test data with large datasets
   */
  static async setupPerformanceTestData(
    mockService: MockAzureStorageService,
    options: {
      containerCount?: number;
      blobsPerContainer?: number;
      avgBlobSize?: number;
    } = {}
  ): Promise<void> {
    const {
      containerCount = 50,
      blobsPerContainer = 100,
      avgBlobSize = 10 * 1024, // 10KB
    } = options;

    await mockService.initialize();

    console.log(`Setting up performance test data: ${containerCount} containers, ${blobsPerContainer} blobs each`);

    for (let c = 1; c <= containerCount; c++) {
      const containerName = `perf-container-${c.toString().padStart(3, '0')}`;
      await mockService.createContainer(containerName, {
        metadata: { 
          type: 'performance-test',
          created: new Date().toISOString(),
          index: c.toString()
        }
      });

      for (let b = 1; b <= blobsPerContainer; b++) {
        const blobName = `perf-blob-${b.toString().padStart(4, '0')}.txt`;
        const content = Buffer.alloc(avgBlobSize, `Data for ${containerName}/${blobName}\n`);
        
        await mockService.uploadBlob(containerName, blobName, content, {
          blobHTTPHeaders: { blobContentType: 'text/plain' },
          metadata: {
            container: containerName,
            index: b.toString(),
            type: 'performance-test'
          }
        });
      }
    }

    console.log('Performance test data setup complete');
  }

  /**
   * Setup error simulation scenarios
   */
  static setupErrorScenarios(mockService: MockAzureStorageService) {
    return {
      enableAllErrors: () => mockService.enableErrorSimulation(1.0),
      enableSomeErrors: () => mockService.enableErrorSimulation(0.3),
      enableSlowNetwork: () => mockService.setNetworkDelay(2000),
      enableVerySlowNetwork: () => mockService.setNetworkDelay(10000),
      disableErrors: () => mockService.enableErrorSimulation(0),
      disableNetworkDelay: () => mockService.setNetworkDelay(0),
    };
  }

  /**
   * Performance measurement utilities
   */
  static createPerformanceMeasurement() {
    const measurements: PerformanceMetrics[] = [];

    return {
      start: (operationName: string) => {
        const startTime = Date.now();
        return {
          end: (success: boolean = true, error?: string) => {
            const endTime = Date.now();
            measurements.push({
              operationName,
              duration: endTime - startTime,
              startTime,
              endTime,
              success,
              error
            });
          }
        };
      },
      getMeasurements: () => [...measurements],
      getAverageDuration: (operationName: string) => {
        const ops = measurements.filter(m => m.operationName === operationName);
        return ops.length > 0 ? ops.reduce((sum, m) => sum + m.duration, 0) / ops.length : 0;
      },
      getSuccessRate: (operationName: string) => {
        const ops = measurements.filter(m => m.operationName === operationName);
        const successful = ops.filter(m => m.success).length;
        return ops.length > 0 ? successful / ops.length : 0;
      },
      clear: () => measurements.length = 0
    };
  }

  /**
   * Wait for multiple elements to be visible
   */
  static async waitForElements(page: Page, testIds: string[], timeout = 5000) {
    await Promise.all(
      testIds.map(testId => 
        page.getByTestId(testId).waitFor({ state: 'visible', timeout })
      )
    );
  }

  /**
   * Take screenshot with timestamp
   */
  static async takeTimestampedScreenshot(page: Page, name: string, fullPage = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage
    });
  }

  /**
   * Verify responsive behavior across different viewport sizes
   */
  static async testResponsiveDesign(
    page: Page,
    testFunction: () => Promise<void>,
    viewports = [
      { width: 320, height: 568, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 1920, height: 1080, name: 'large-desktop' }
    ]
  ) {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(100); // Allow for resize
      
      try {
        await testFunction();
      } catch (error) {
        throw new Error(`Responsive test failed on ${viewport.name} (${viewport.width}x${viewport.height}): ${(error as Error).message}`);
      }
    }
    
    // Reset to default size
    await page.setViewportSize({ width: 1280, height: 720 });
  }

  /**
   * Simulate user interactions with realistic delays
   */
  static async simulateUserInteraction(page: Page, actions: Array<{
    type: 'click' | 'fill' | 'select' | 'upload' | 'wait';
    selector?: string;
    value?: string;
    delay?: number;
  }>) {
    for (const action of actions) {
      switch (action.type) {
        case 'click':
          if (action.selector) {
            await page.getByTestId(action.selector).click();
            await page.waitForTimeout(action.delay || 100);
          }
          break;
          
        case 'fill':
          if (action.selector && action.value !== undefined) {
            await page.getByTestId(action.selector).fill(action.value);
            await page.waitForTimeout(action.delay || 50);
          }
          break;
          
        case 'select':
          if (action.selector && action.value !== undefined) {
            await page.getByTestId(action.selector).selectOption(action.value);
            await page.waitForTimeout(action.delay || 50);
          }
          break;
          
        case 'wait':
          await page.waitForTimeout(action.delay || 1000);
          break;
      }
    }
  }

  /**
   * Verify accessibility of page elements
   */
  static async verifyBasicAccessibility(page: Page, testIds: string[]) {
    for (const testId of testIds) {
      const element = page.getByTestId(testId);
      
      // Verify element is visible
      await element.waitFor({ state: 'visible' });
      
      // Check if element has proper ARIA attributes (basic check)
      const role = await element.getAttribute('role');
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledBy = await element.getAttribute('aria-labelledby');
      
      // At least one accessibility attribute should be present for interactive elements
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      if (['button', 'input', 'select', 'textarea', 'a'].includes(tagName)) {
        const hasAccessibilityAttribute = role || ariaLabel || ariaLabelledBy;
        if (!hasAccessibilityAttribute) {
          console.warn(`Element with testId "${testId}" may need accessibility attributes`);
        }
      }
    }
  }

  /**
   * Create test data with specific patterns for search testing
   */
  static async setupSearchTestData(mockService: MockAzureStorageService) {
    await mockService.initialize();

    // Containers with predictable search patterns
    const searchPatterns = [
      { prefix: 'documents', count: 3 },
      { prefix: 'images', count: 2 },
      { prefix: 'backups', count: 1 },
      { prefix: 'temp', count: 2 },
      { prefix: 'archive', count: 1 }
    ];

    for (const pattern of searchPatterns) {
      for (let i = 1; i <= pattern.count; i++) {
        const containerName = `${pattern.prefix}-${i}`;
        await mockService.createContainer(containerName, {
          metadata: { 
            type: pattern.prefix,
            searchable: 'true',
            index: i.toString()
          }
        });

        // Add blobs with searchable names
        for (let j = 1; j <= 5; j++) {
          const blobName = `${pattern.prefix}-file-${j}.txt`;
          await mockService.uploadBlob(
            containerName,
            blobName,
            Buffer.from(`Search content for ${pattern.prefix}`),
            {
              blobHTTPHeaders: { blobContentType: 'text/plain' },
              metadata: { 
                category: pattern.prefix,
                searchable: 'true'
              }
            }
          );
        }
      }
    }
  }

  /**
   * Cleanup test environment
   */
  static async cleanup(mockService: MockAzureStorageService) {
    try {
      await mockService.cleanup();
    } catch (error) {
      console.warn('Cleanup warning:', (error as Error).message);
    }
  }

  /**
   * Create mock data for specific test scenarios
   */
  static async createScenarioData(
    mockService: MockAzureStorageService,
    scenario: 'empty' | 'single-container' | 'mixed-access-tiers' | 'many-containers' | 'large-blobs'
  ) {
    await mockService.initialize();

    switch (scenario) {
      case 'empty':
        // No data - empty state
        break;

      case 'single-container':
        await mockService.createContainer('single-test-container');
        await mockService.uploadBlob('single-test-container', 'test-file.txt', Buffer.from('test content'));
        break;

      case 'mixed-access-tiers':
        await mockService.createContainer('tier-test-container');
        
        const tiers: Array<'Hot' | 'Cool' | 'Archive'> = ['Hot', 'Cool', 'Archive'];
        for (const tier of tiers) {
          await mockService.uploadBlob(
            'tier-test-container',
            `${tier.toLowerCase()}-file.txt`,
            Buffer.from(`${tier} tier content`),
            { tier }
          );
        }
        break;

      case 'many-containers':
        for (let i = 1; i <= 25; i++) {
          await mockService.createContainer(`container-${i.toString().padStart(2, '0')}`);
        }
        break;

      case 'large-blobs':
        await mockService.createContainer('large-blob-container');
        
        // Create blobs of different sizes
        const sizes = [1024, 10 * 1024, 100 * 1024, 1024 * 1024]; // 1KB to 1MB
        for (let i = 0; i < sizes.length; i++) {
          await mockService.uploadBlob(
            'large-blob-container',
            `large-file-${i + 1}.bin`,
            Buffer.alloc(sizes[i])
          );
        }
        break;
    }
  }
}
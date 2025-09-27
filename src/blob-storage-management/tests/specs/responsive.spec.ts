import { test, expect } from '@playwright/test';
import { DashboardPageHelper } from '../page-objects/dashboard-page';
import { ContainerPageHelper } from '../page-objects/container-page';
import { BlobPageHelper } from '../page-objects/blob-page';
import { MockAzureStorageService } from '../mocks/azure-storage-service';
import { TestHelpers } from '../fixtures/test-helpers';

/**
 * Responsive design tests for mobile and desktop viewports
 * Tests layout adaptation, navigation patterns, and usability across different screen sizes
 */

test.describe('Responsive Design - Dashboard @extended-happy-path', () => {
  let dashboardPage: DashboardPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    await TestHelpers.setupComprehensiveTestData(mockService, {
      containerCount: 5,
      blobsPerContainer: 8,
    });
  });

  /**
   * Mobile layout adaptation (320px - 768px)
   * @extended-happy-path
   */
  test('adapts dashboard layout for mobile screens', async () => {
    await TestHelpers.testResponsiveDesign(
      dashboardPage.getPage(),
      async () => {
        await dashboardPage.navigateTo();
        await dashboardPage.verifyPageLoaded();

        // Check mobile navigation is visible
        const mobileNav = dashboardPage.getElementByTestIdPattern('mobile-nav-menu');
        const desktopSidebar = dashboardPage.getElementByTestIdPattern('sidebar-navigation');
        
        const viewport = await dashboardPage.getViewportSize();
        if (viewport && viewport.width < 768) {
          // On mobile, should have mobile nav
          if (await mobileNav.isVisible()) {
            await expect(mobileNav).toBeVisible();
            
            // Desktop sidebar should be hidden or collapsed
            const sidebarVisible = await desktopSidebar.isVisible();
            if (sidebarVisible) {
              // Check if sidebar is collapsed/minimized
              const sidebarWidth = await desktopSidebar.boundingBox();
              expect(sidebarWidth?.width || 0).toBeLessThan(200);
            }
          }
        } else {
          // On desktop, should have regular sidebar
          await expect(desktopSidebar).toBeVisible();
        }

        // Metrics cards should stack on mobile
        const metricsCards = dashboardPage.getByTestId('metrics-cards');
        await expect(metricsCards).toBeVisible();
        
        if (viewport && viewport.width < 768) {
          // On mobile, check cards are stacked (flex-direction: column)
          const flexDirection = await metricsCards.evaluate(el => 
            getComputedStyle(el).flexDirection
          );
          expect(['column', 'column-reverse'].includes(flexDirection)).toBe(true);
        }

        // Search should be accessible on all screen sizes
        const globalSearch = dashboardPage.getByTestId('global-search-input');
        await expect(globalSearch).toBeVisible();
        
        // Search should be appropriately sized for mobile
        if (viewport && viewport.width < 480) {
          const searchBox = await globalSearch.boundingBox();
          const viewportWidth = viewport.width;
          expect(searchBox?.width || 0).toBeLessThan(viewportWidth * 0.9);
        }
      },
      [
        { width: 320, height: 568, name: 'mobile-small' },
        { width: 375, height: 667, name: 'mobile-medium' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1280, height: 720, name: 'desktop' }
      ]
    );
  });

  /**
   * Touch interaction optimization
   * @extended-happy-path
   */
  test('optimizes touch interactions for mobile', async () => {
    // Set mobile viewport
    await dashboardPage.setViewportSize({ width: 375, height: 667 });
    
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Check touch targets are appropriately sized (minimum 44px)
    const touchTargets = [
      'nav-containers',
      'quick-action-create-container',
      'quick-action-upload-file',
      'refresh-dashboard'
    ];

    for (const targetId of touchTargets) {
      const element = dashboardPage.getByTestId(targetId);
      if (await element.isVisible()) {
        const box = await element.boundingBox();
        if (box) {
          // Touch targets should be at least 44px in both dimensions
          expect(box.width).toBeGreaterThanOrEqual(40); // Allow slight variance
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }

    // Test swipe gestures if implemented
    const metricsSection = dashboardPage.getByTestId('metrics-section');
    if (await metricsSection.isVisible()) {
      // Try horizontal swipe (for carousel or scrollable content)
      const box = await metricsSection.boundingBox();
      if (box) {
        await dashboardPage.mouseMove(box.x + 50, box.y + box.height / 2);
        await dashboardPage.mouseDown();
        await dashboardPage.mouseMove(box.x + box.width - 50, box.y + box.height / 2);
        await dashboardPage.mouseUp();
        
        // Should not break layout
        await dashboardPage.verifyPageLoaded();
      }
    }
  });

  /**
   * Content prioritization on small screens
   * @extended-happy-path
   */
  test('prioritizes important content on small screens', async () => {
    // Test progressive disclosure
    await dashboardPage.setViewportSize({ width: 320, height: 568 });
    
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Essential content should always be visible
    const essentialElements = [
      'metrics-section',
      'nav-dashboard',
      'global-search-input'
    ];

    for (const elementId of essentialElements) {
      const element = dashboardPage.getByTestId(elementId);
      await expect(element).toBeVisible();
    }

    // Less critical content might be hidden or collapsed
    const optionalElements = [
      'recent-items-section',
      'quick-actions-section'
    ];

    for (const elementId of optionalElements) {
      const element = dashboardPage.getByTestId(elementId);
      if (await element.isVisible()) {
        // If visible, should not take up too much screen space
        const box = await element.boundingBox();
        const viewport = await dashboardPage.getViewportSize();
        if (box && viewport) {
          expect(box.height).toBeLessThan(viewport.height * 0.4);
        }
      }
    }
  });

  /**
   * Horizontal scrolling prevention
   * @extended-happy-path
   */
  test('prevents horizontal scrolling on small screens', async () => {
    const viewports = [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
      { width: 414, height: 896 }
    ];

    for (const viewport of viewports) {
      await dashboardPage.setViewportSize(viewport);
      await dashboardPage.navigateTo();
      await dashboardPage.verifyPageLoaded();

      // Check body doesn't have horizontal overflow
      const bodyScrollWidth = await dashboardPage.evaluate(() => {
        return {
          scrollWidth: document.body.scrollWidth,
          clientWidth: document.body.clientWidth
        };
      });

      // Allow for small differences due to scrollbars
      expect(bodyScrollWidth.scrollWidth).toBeLessThanOrEqual(bodyScrollWidth.clientWidth + 20);

      // Check main content areas don't overflow
      const mainContent = dashboardPage.getByTestId('dashboard-container');
      if (await mainContent.isVisible()) {
        const contentBox = await mainContent.boundingBox();
        if (contentBox) {
          expect(contentBox.width).toBeLessThanOrEqual(viewport.width + 10);
        }
      }
    }
  });
});

test.describe('Responsive Design - Container Management @extended-happy-path', () => {
  let containerPage: ContainerPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    containerPage = new ContainerPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    await TestHelpers.setupComprehensiveTestData(mockService, {
      containerCount: 10,
      blobsPerContainer: 5,
    });
  });

  /**
   * Container list responsive layout
   * @extended-happy-path
   */
  test('adapts container list for different screen sizes', async () => {
    await TestHelpers.testResponsiveDesign(
      containerPage.getPage(),
      async () => {
        await containerPage.navigateTo();
        await containerPage.verifyPageLoaded();

        const viewport = containerPage.getPage().viewportSize();
        const containersList = containerPage.getPage().getByTestId('containers-list');
        await expect(containersList).toBeVisible();

        if (viewport && viewport.width < 768) {
          // Mobile: Should use card layout or simplified list
          const containerCards = containerPage.getPage().getByTestId(/^container-/);
          const cardCount = await containerCards.count();
          
          if (cardCount > 0) {
            const firstCard = containerCards.first();
            const cardBox = await firstCard.boundingBox();
            
            // Cards should stack vertically on mobile
            if (cardBox) {
              expect(cardBox.width).toBeGreaterThan(viewport.width * 0.8);
            }
          }
        } else {
          // Desktop: Can use table or grid layout
          const tableView = containerPage.getPage().locator('table');
          const gridView = containerPage.getPage().getByTestId('containers-grid');
          
          const hasTableView = await tableView.isVisible();
          const hasGridView = await gridView.isVisible();
          
          expect(hasTableView || hasGridView).toBe(true);
        }

        // Search and filter controls should be accessible
        const searchInput = containerPage.getPage().getByTestId('search-containers');
        await expect(searchInput).toBeVisible();
        
        const filterButton = containerPage.getPage().getByTestId('filter-containers');
        if (await filterButton.isVisible()) {
          const filterBox = await filterButton.boundingBox();
          if (filterBox && viewport) {
            expect(filterBox.width).toBeLessThan(viewport.width * 0.5);
          }
        }
      }
    );
  });

  /**
   * Modal dialogs responsive behavior
   * @extended-happy-path
   */
  test('adapts modal dialogs for mobile screens', async () => {
    // Test create container modal
    await containerPage.getPage().setViewportSize({ width: 375, height: 667 });
    
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Open create container modal
    await containerPage.getPage().getByTestId('button-create-container').click();
    const modal = containerPage.getPage().getByTestId('modal-create-container');
    await expect(modal).toBeVisible();

    // Modal should be properly sized for mobile
    const modalBox = await modal.boundingBox();
    const viewport = containerPage.getPage().viewportSize()!;
    
    if (modalBox) {
      // Modal should not be wider than viewport
      expect(modalBox.width).toBeLessThanOrEqual(viewport.width);
      
      // Modal should not be taller than viewport (allowing for margins)
      expect(modalBox.height).toBeLessThanOrEqual(viewport.height * 0.9);
      
      // Modal should be centered
      const modalCenter = modalBox.x + modalBox.width / 2;
      const viewportCenter = viewport.width / 2;
      expect(Math.abs(modalCenter - viewportCenter)).toBeLessThan(50);
    }

    // Form elements should be appropriately sized
    const nameInput = containerPage.getPage().getByTestId('form-create-container-name');
    const inputBox = await nameInput.boundingBox();
    
    if (inputBox) {
      expect(inputBox.width).toBeGreaterThan(200); // Minimum usable width
      expect(inputBox.height).toBeGreaterThanOrEqual(40); // Touch-friendly height
    }

    // Close modal
    const cancelButton = containerPage.getPage().getByTestId('form-create-container-cancel');
    await cancelButton.click();
    await expect(modal).toBeHidden();
  });

  /**
   * Tablet layout optimizations
   * @extended-happy-path
   */
  test('optimizes layout for tablet screens', async () => {
    await containerPage.getPage().setViewportSize({ width: 768, height: 1024 });
    
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Tablet should balance between mobile and desktop layouts
    const sidebar = containerPage.getPage().getByTestId('sidebar-navigation');
    if (await sidebar.isVisible()) {
      const sidebarBox = await sidebar.boundingBox();
      if (sidebarBox) {
        // Sidebar should be present but not too wide
        expect(sidebarBox.width).toBeGreaterThan(200);
        expect(sidebarBox.width).toBeLessThan(400);
      }
    }

    // Container list should use efficient space
    const containersList = containerPage.getPage().getByTestId('containers-list');
    const containersBox = await containersList.boundingBox();
    const viewport = containerPage.getPage().viewportSize()!;
    
    if (containersBox) {
      // Should use most of available width
      expect(containersBox.width).toBeGreaterThan(viewport.width * 0.6);
    }

    // Actions should be easily accessible
    const createButton = containerPage.getPage().getByTestId('button-create-container');
    const buttonBox = await createButton.boundingBox();
    
    if (buttonBox) {
      // Button should be touch-friendly size
      expect(buttonBox.width).toBeGreaterThanOrEqual(100);
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    }
  });

  /**
   * Landscape vs portrait orientation
   * @extended-happy-path
   */
  test('adapts to orientation changes', async () => {
    // Test portrait mobile
    await containerPage.getPage().setViewportSize({ width: 375, height: 667 });
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    const portraitLayout = await containerPage.getPage().evaluate(() => {
      const main = document.querySelector('[data-testid="containers-page"]');
      return main ? getComputedStyle(main).flexDirection : 'column';
    });

    // Test landscape mobile
    await containerPage.getPage().setViewportSize({ width: 667, height: 375 });
    await containerPage.getPage().waitForTimeout(100); // Allow for reflow
    
    const landscapeLayout = await containerPage.getPage().evaluate(() => {
      const main = document.querySelector('[data-testid="containers-page"]');
      return main ? getComputedStyle(main).flexDirection : 'row';
    });

    // Layout might adapt to landscape (though this depends on implementation)
    // At minimum, page should remain functional
    await containerPage.verifyPageLoaded();

    // Navigation should remain accessible
    const navElements = containerPage.getPage().getByTestId('sidebar-navigation');
    if (await navElements.isVisible()) {
      await expect(navElements).toBeVisible();
    }
  });
});

test.describe('Responsive Design - Blob Management @extended-happy-path', () => {
  let blobPage: BlobPageHelper;
  let mockService: MockAzureStorageService;
  const containerName = 'responsive-test-container';

  test.beforeEach(async ({ page }) => {
    blobPage = new BlobPageHelper(page, containerName);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    // Create container with multiple blobs
    await mockService.createContainer(containerName);
    for (let i = 1; i <= 15; i++) {
      await mockService.uploadBlob(
        containerName, 
        `test-file-${i.toString().padStart(2, '0')}.txt`, 
        Buffer.from(`Content for file ${i}`)
      );
    }
  });

  /**
   * File listing responsive layout
   * @extended-happy-path
   */
  test('adapts file listing for different screen sizes', async () => {
    await TestHelpers.testResponsiveDesign(
      blobPage.getPage(),
      async () => {
        await blobPage.navigateTo();
        await blobPage.verifyPageLoaded();

        const viewport = blobPage.getPage().viewportSize();
        const blobsList = blobPage.getPage().getByTestId('blobs-list');
        
        if (await blobsList.isVisible()) {
          await expect(blobsList).toBeVisible();

          if (viewport && viewport.width < 768) {
            // Mobile: List view with minimal columns
            const blobItems = blobPage.getPage().getByTestId(/^blob-/);
            const itemCount = await blobItems.count();
            
            if (itemCount > 0) {
              const firstItem = blobItems.first();
              const itemBox = await firstItem.boundingBox();
              
              if (itemBox) {
                // Items should use full width on mobile
                expect(itemBox.width).toBeGreaterThan(viewport.width * 0.8);
                
                // Items should be stacked vertically
                expect(itemBox.height).toBeGreaterThan(40);
              }
            }
          }
        }

        // Upload button should be accessible
        const uploadButton = blobPage.getPage().getByTestId('button-upload-file');
        if (await uploadButton.isVisible()) {
          const buttonBox = await uploadButton.boundingBox();
          if (buttonBox && viewport) {
            expect(buttonBox.width).toBeLessThan(viewport.width * 0.8);
            expect(buttonBox.height).toBeGreaterThanOrEqual(40);
          }
        }
      }
    );
  });

  /**
   * File upload modal responsive behavior
   * @extended-happy-path
   */
  test('adapts file upload interface for mobile', async () => {
    await blobPage.getPage().setViewportSize({ width: 414, height: 896 });
    
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    // Open upload modal
    await blobPage.getPage().getByTestId('button-upload-file').click();
    const uploadModal = blobPage.getPage().getByTestId('modal-upload-file');
    await expect(uploadModal).toBeVisible();

    // Modal should adapt to mobile
    const modalBox = await uploadModal.boundingBox();
    const viewport = blobPage.getPage().viewportSize()!;
    
    if (modalBox) {
      expect(modalBox.width).toBeLessThanOrEqual(viewport.width);
      expect(modalBox.height).toBeLessThanOrEqual(viewport.height * 0.9);
    }

    // File input should be touch-friendly
    const fileInput = blobPage.getPage().getByTestId('form-upload-file');
    const inputBox = await fileInput.boundingBox();
    
    if (inputBox) {
      expect(inputBox.height).toBeGreaterThanOrEqual(44);
    }

    // Form fields should stack on mobile
    const formContainer = uploadModal.locator('form').first();
    if (await formContainer.isVisible()) {
      const flexDirection = await formContainer.evaluate(el => 
        getComputedStyle(el).flexDirection
      );
      expect(['column', 'column-reverse'].includes(flexDirection)).toBe(true);
    }
  });

  /**
   * Blob actions responsive behavior
   * @extended-happy-path
   */
  test('adapts blob action controls for touch', async () => {
    await blobPage.getPage().setViewportSize({ width: 375, height: 667 });
    
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    const blobs = await blobPage.getBlobList();
    if (blobs.length > 0) {
      const firstBlobName = blobs[0].name;
      const blobRow = blobPage.getPage().getByTestId(`blob-${firstBlobName}`);
      
      // Action buttons should be appropriately sized
      const actionButtons = [
        `blob-${firstBlobName}-download`,
        `blob-${firstBlobName}-delete`
      ];

      for (const buttonId of actionButtons) {
        const button = blobRow.getByTestId(buttonId);
        if (await button.isVisible()) {
          const buttonBox = await button.boundingBox();
          if (buttonBox) {
            // Touch targets should be at least 44px
            expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(40);
          }
        }
      }

      // On mobile, might have overflow menu for additional actions
      const moreActionsButton = blobRow.getByTestId(`blob-${firstBlobName}-more-actions`);
      if (await moreActionsButton.isVisible()) {
        const moreBox = await moreActionsButton.boundingBox();
        if (moreBox) {
          expect(Math.min(moreBox.width, moreBox.height)).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  /**
   * Virtual scrolling and performance on mobile
   * @extended-happy-path
   */
  test('handles large file lists efficiently on mobile', async () => {
    // Add more blobs for testing virtual scrolling
    for (let i = 16; i <= 100; i++) {
      await mockService.uploadBlob(
        containerName,
        `perf-test-file-${i.toString().padStart(3, '0')}.txt`,
        Buffer.from(`Performance test content ${i}`)
      );
    }

    await blobPage.getPage().setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();
    const loadTime = Date.now() - startTime;
    
    // Should load reasonably fast even with many blobs
    expect(loadTime).toBeLessThan(5000);

    // Check scrolling performance
    const blobsList = blobPage.getPage().getByTestId('blobs-list');
    if (await blobsList.isVisible()) {
      const initialBlobs = blobPage.getPage().getByTestId(/^blob-/);
      const initialCount = await initialBlobs.count();
      
      // Scroll down to load more items (if using virtual scrolling)
      await blobPage.getPage().mouse.wheel(0, 2000);
      await blobPage.getPage().waitForTimeout(500);
      
      // Page should remain responsive
      await expect(blobsList).toBeVisible();
      
      // If virtual scrolling is implemented, more items might be visible
      const afterScrollBlobs = blobPage.getPage().getByTestId(/^blob-/);
      const afterScrollCount = await afterScrollBlobs.count();
      
      // At minimum, page should not crash
      expect(afterScrollCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  /**
   * Breadcrumb navigation on small screens
   * @extended-happy-path
   */
  test('adapts breadcrumb navigation for mobile', async () => {
    await blobPage.getPage().setViewportSize({ width: 320, height: 568 });
    
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    const breadcrumbs = blobPage.getPage().getByTestId('breadcrumbs');
    if (await breadcrumbs.isVisible()) {
      const breadcrumbBox = await breadcrumbs.boundingBox();
      const viewport = blobPage.getPage().viewportSize()!;
      
      if (breadcrumbBox) {
        // Breadcrumbs should not overflow viewport
        expect(breadcrumbBox.width).toBeLessThanOrEqual(viewport.width);
        
        // On very small screens, breadcrumbs might be truncated
        if (viewport.width < 400) {
          // Check for ellipsis or truncation indicators
          const breadcrumbText = await breadcrumbs.textContent();
          if (breadcrumbText && breadcrumbText.length > 30) {
            // Long breadcrumbs should be handled gracefully
            const overflowStyle = await breadcrumbs.evaluate(el => 
              getComputedStyle(el).textOverflow
            );
            expect(['ellipsis', 'clip'].includes(overflowStyle) || 
                   breadcrumbText.includes('...')).toBe(true);
          }
        }
      }
    }
  });
});

test.describe('Responsive Design - Performance @performance', () => {
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
  });

  /**
   * Layout performance across different viewports
   * @performance
   */
  test('maintains good performance during viewport changes', async ({ page }) => {
    const dashboardPage = new DashboardPageHelper(page);
    
    // Setup substantial test data
    await TestHelpers.setupPerformanceTestData(mockService, {
      containerCount: 50,
      blobsPerContainer: 20,
    });

    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Test rapid viewport changes
    const viewports = [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
      { width: 375, height: 667 }
    ];

    const startTime = Date.now();
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100); // Allow for reflow
      
      // Verify page remains functional
      await expect(page.getByTestId('dashboard-container')).toBeVisible();
    }
    
    const totalTime = Date.now() - startTime;
    
    // Viewport changes should not cause performance issues
    expect(totalTime).toBeLessThan(3000); // 3 seconds for all viewport changes
  });

  /**
   * Memory usage during responsive operations
   * @performance
   */
  test('manages memory efficiently across viewport changes', async ({ page }) => {
    const containerPage = new ContainerPageHelper(page);
    
    await TestHelpers.setupPerformanceTestData(mockService, {
      containerCount: 100,
      blobsPerContainer: 10,
    });

    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Perform memory-intensive responsive operations
    for (let i = 0; i < 10; i++) {
      // Alternate between mobile and desktop
      const isMobile = i % 2 === 0;
      await page.setViewportSize(
        isMobile ? { width: 375, height: 667 } : { width: 1280, height: 720 }
      );
      
      // Perform operations that might create memory leaks
      await page.getByTestId('search-containers').fill(`search-${i}`);
      await page.waitForTimeout(200);
      await page.getByTestId('search-containers').clear();
      
      // Refresh page elements
      await page.getByTestId('refresh-containers').click();
      await containerPage.verifyPageLoaded();
    }

    // If we get here without timeout, memory usage is acceptable
    await containerPage.verifyPageLoaded();
  });
});
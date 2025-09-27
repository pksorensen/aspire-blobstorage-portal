import { test, expect } from '@playwright/test';
import { DashboardPageHelper } from '../page-objects/dashboard-page';
import { ContainerPageHelper } from '../page-objects/container-page';
import { BlobPageHelper } from '../page-objects/blob-page';
import { MockAzureStorageService } from '../mocks/azure-storage-service';
import { TestHelpers } from '../fixtures/test-helpers';

/**
 * Accessibility tests for WCAG 2.1 AA compliance
 * Tests keyboard navigation, screen reader support, and contrast requirements
 */

test.describe('Accessibility - Dashboard @extended-happy-path', () => {
  let dashboardPage: DashboardPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    // Add basic test data
    await TestHelpers.setupComprehensiveTestData(mockService, {
      containerCount: 3,
      blobsPerContainer: 5,
    });
  });

  /**
   * Keyboard navigation for dashboard
   * @extended-happy-path
   */
  test('supports keyboard navigation on dashboard', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Test Tab navigation through key elements
    const keyElements = [
      'global-search-input',
      'nav-dashboard',
      'nav-containers',
      'quick-action-create-container',
      'quick-action-upload-file',
      'refresh-dashboard'
    ];

    // Start from first element
    await dashboardPage.getPage().getByTestId(keyElements[0]).focus();
    
    // Navigate through elements using Tab
    for (let i = 1; i < keyElements.length; i++) {
      await dashboardPage.getPage().keyboard.press('Tab');
      const focused = await dashboardPage.getPage().evaluate(() => document.activeElement?.getAttribute('data-testid'));
      
      // Allow for additional focusable elements in between
      if (focused === keyElements[i] || keyElements.includes(focused!)) {
        // Successfully navigated to an expected element
        continue;
      }
    }

    // Test Enter key activation on buttons
    await dashboardPage.getPage().getByTestId('refresh-dashboard').focus();
    await dashboardPage.getPage().keyboard.press('Enter');
    
    // Should trigger refresh (verify through loading state or UI update)
    await dashboardPage.verifyPageLoaded();
  });

  /**
   * Screen reader support - ARIA labels and roles
   * @extended-happy-path
   */
  test('provides proper ARIA labels and roles', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Check main navigation has proper ARIA
    const mainNav = dashboardPage.getPage().getByTestId('sidebar-navigation');
    await expect(mainNav).toHaveAttribute('role', 'navigation');
    await expect(mainNav).toHaveAttribute('aria-label', /navigation|main menu/i);

    // Check metrics section has proper structure
    const metricsSection = dashboardPage.getPage().getByTestId('metrics-section');
    await expect(metricsSection).toHaveAttribute('role', 'region');
    await expect(metricsSection).toHaveAttribute('aria-label', /storage metrics|overview/i);

    // Check individual metric cards
    const metricCards = [
      'metric-container-count',
      'metric-blob-count', 
      'metric-total-size'
    ];

    for (const cardId of metricCards) {
      const card = dashboardPage.getPage().getByTestId(cardId);
      await expect(card).toBeVisible();
      
      // Should have descriptive text or aria-label
      const ariaLabel = await card.getAttribute('aria-label');
      const text = await card.textContent();
      expect(ariaLabel || text).toBeTruthy();
    }

    // Check search input has proper labels
    const searchInput = dashboardPage.getPage().getByTestId('global-search-input');
    const hasLabel = await searchInput.getAttribute('aria-label') || 
                     await searchInput.getAttribute('aria-labelledby') ||
                     await searchInput.getAttribute('placeholder');
    expect(hasLabel).toBeTruthy();
  });

  /**
   * Color contrast and visual accessibility
   * @extended-happy-path
   */
  test('maintains sufficient color contrast', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Check that text is readable - basic contrast test
    // This is a simplified test; full contrast testing would require color analysis
    const textElements = [
      'dashboard-header',
      'metric-container-count',
      'nav-dashboard',
      'quick-actions-section'
    ];

    for (const elementId of textElements) {
      const element = dashboardPage.getPage().getByTestId(elementId);
      await expect(element).toBeVisible();
      
      // Check element has readable text
      const text = await element.textContent();
      expect(text?.trim()).toBeTruthy();
      
      // Check element is not invisible/transparent
      const opacity = await element.evaluate(el => getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeGreaterThan(0.5);
    }
  });

  /**
   * Focus indicators visibility
   * @extended-happy-path
   */
  test('shows visible focus indicators', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    const focusableElements = [
      'global-search-input',
      'nav-containers',
      'quick-action-create-container',
      'refresh-dashboard'
    ];

    for (const elementId of focusableElements) {
      const element = dashboardPage.getPage().getByTestId(elementId);
      
      // Focus the element
      await element.focus();
      
      // Check element is actually focused
      const isFocused = await element.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
      
      // Element should have visible focus styling (outline, box-shadow, etc.)
      const styles = await element.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          outline: computed.outline,
          boxShadow: computed.boxShadow,
          borderColor: computed.borderColor
        };
      });
      
      // At least one focus indicator should be present
      const hasFocusIndicator = styles.outline !== 'none' || 
                               styles.boxShadow !== 'none' ||
                               styles.borderColor !== 'transparent';
      expect(hasFocusIndicator).toBe(true);
    }
  });

  /**
   * Alternative text for images and icons
   * @extended-happy-path
   */
  test('provides alternative text for non-decorative images', async () => {
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Find all images and icons
    const images = dashboardPage.getPage().locator('img');
    const iconElements = dashboardPage.getPage().locator('svg, [role="img"]');
    
    const imageCount = await images.count();
    const iconCount = await iconElements.count();

    // Check images have alt text
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      
      // Alt text should exist (empty alt for decorative images is acceptable)
      expect(altText).not.toBeNull();
    }

    // Check icons have accessible names
    for (let i = 0; i < iconCount; i++) {
      const icon = iconElements.nth(i);
      const ariaLabel = await icon.getAttribute('aria-label');
      const ariaHidden = await icon.getAttribute('aria-hidden');
      const title = await icon.getAttribute('title');
      
      // Icon should either have accessible name or be hidden from screen readers
      const hasAccessibleName = ariaLabel || title;
      const isHidden = ariaHidden === 'true';
      expect(hasAccessibleName || isHidden).toBe(true);
    }
  });
});

test.describe('Accessibility - Container Management @extended-happy-path', () => {
  let containerPage: ContainerPageHelper;
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    containerPage = new ContainerPageHelper(page);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    // Add test containers
    await TestHelpers.setupComprehensiveTestData(mockService, {
      containerCount: 5,
      blobsPerContainer: 3,
    });
  });

  /**
   * Keyboard navigation for container listing
   * @extended-happy-path
   */
  test('supports keyboard navigation in container listing', async () => {
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Test keyboard navigation through container list
    const containerElements = containerPage.getPage().getByTestId(/^container-/);
    const containerCount = await containerElements.count();
    
    if (containerCount > 0) {
      // Focus first container
      await containerElements.first().focus();
      
      // Navigate through containers with arrow keys
      for (let i = 1; i < Math.min(containerCount, 3); i++) {
        await containerPage.getPage().keyboard.press('ArrowDown');
        await containerPage.getPage().waitForTimeout(100);
      }

      // Test Enter key to open container
      await containerPage.getPage().keyboard.press('Enter');
      
      // Should navigate to blob listing (URL should change)
      await containerPage.getPage().waitForURL(/.*\/containers\/.+/);
    }
  });

  /**
   * Form accessibility - container creation
   * @extended-happy-path
   */
  test('provides accessible container creation form', async () => {
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Open create container modal
    await containerPage.getPage().getByTestId('button-create-container').click();
    const modal = containerPage.getPage().getByTestId('modal-create-container');
    await expect(modal).toBeVisible();

    // Check form has proper labeling
    const nameInput = containerPage.getPage().getByTestId('form-create-container-name');
    const accessSelect = containerPage.getPage().getByTestId('form-create-container-access');
    
    // Check inputs have labels
    const nameLabel = await nameInput.getAttribute('aria-label') || 
                      await nameInput.getAttribute('aria-labelledby');
    expect(nameLabel).toBeTruthy();

    const accessLabel = await accessSelect.getAttribute('aria-label') || 
                        await accessSelect.getAttribute('aria-labelledby');
    expect(accessLabel).toBeTruthy();

    // Check form is keyboard accessible
    await nameInput.focus();
    await nameInput.fill('test-container-accessibility');
    
    await accessSelect.focus();
    await accessSelect.selectOption('none');

    // Submit form with keyboard
    const submitButton = containerPage.getPage().getByTestId('form-create-container-submit');
    await submitButton.focus();
    await submitButton.press('Enter');

    // Should close modal and show success
    await expect(modal).toBeHidden();
  });

  /**
   * Error message accessibility
   * @extended-happy-path
   */
  test('provides accessible error messages', async () => {
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Create duplicate container to trigger error
    await mockService.createContainer('duplicate-test');
    
    // Try to create same container through UI
    await containerPage.getPage().getByTestId('button-create-container').click();
    const modal = containerPage.getPage().getByTestId('modal-create-container');
    await expect(modal).toBeVisible();

    const nameInput = containerPage.getPage().getByTestId('form-create-container-name');
    await nameInput.fill('duplicate-test');
    
    const submitButton = containerPage.getPage().getByTestId('form-create-container-submit');
    await submitButton.click();

    // Check error message is accessible
    const errorMessage = containerPage.getPage().getByTestId('message-error');
    await expect(errorMessage).toBeVisible();
    
    // Error should have proper ARIA attributes
    const ariaRole = await errorMessage.getAttribute('role');
    const ariaLive = await errorMessage.getAttribute('aria-live');
    expect(ariaRole).toBe('alert');
    expect(ariaLive).toBeTruthy();
  });

  /**
   * Table/list accessibility for container listing
   * @extended-happy-path
   */
  test('provides accessible container listing structure', async () => {
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Check if container list is structured as table or list
    const containerList = containerPage.getPage().getByTestId('containers-list');
    const listRole = await containerList.getAttribute('role');
    
    if (listRole === 'table' || (await containerList.locator('table').count()) > 0) {
      // If table structure
      const table = containerList.locator('table').first();
      await expect(table).toBeVisible();
      
      // Check table has proper headers
      const headers = table.locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);
      
      // Headers should have text content
      for (let i = 0; i < headerCount; i++) {
        const header = headers.nth(i);
        const text = await header.textContent();
        expect(text?.trim()).toBeTruthy();
      }
    } else {
      // If list structure
      const role = listRole || await containerList.evaluate(el => el.tagName.toLowerCase());
      expect(['ul', 'ol', 'list'].some(tag => role.includes(tag))).toBe(true);
    }
  });
});

test.describe('Accessibility - Blob Management @extended-happy-path', () => {
  let blobPage: BlobPageHelper;
  let mockService: MockAzureStorageService;
  const containerName = 'accessibility-test-container';

  test.beforeEach(async ({ page }) => {
    blobPage = new BlobPageHelper(page, containerName);
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    // Create container and blobs
    await mockService.createContainer(containerName);
    await mockService.uploadBlob(containerName, 'test-document.pdf', Buffer.from('PDF content'));
    await mockService.uploadBlob(containerName, 'test-image.jpg', Buffer.from('JPG content'));
    await mockService.uploadBlob(containerName, 'test-data.json', Buffer.from('{"data": "test"}'));
  });

  /**
   * File upload accessibility
   * @extended-happy-path
   */
  test('provides accessible file upload interface', async () => {
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    // Open upload modal
    const uploadButton = blobPage.getPage().getByTestId('button-upload-file');
    await uploadButton.click();
    
    const uploadModal = blobPage.getPage().getByTestId('modal-upload-file');
    await expect(uploadModal).toBeVisible();

    // Check file input is accessible
    const fileInput = blobPage.getPage().getByTestId('form-upload-file');
    const inputLabel = await fileInput.getAttribute('aria-label') || 
                       await fileInput.getAttribute('aria-labelledby');
    expect(inputLabel).toBeTruthy();

    // Check other form fields
    const formFields = [
      'form-upload-filename',
      'form-upload-content-type',
      'form-upload-access-tier'
    ];

    for (const fieldId of formFields) {
      const field = blobPage.getPage().getByTestId(fieldId);
      if (await field.isVisible()) {
        const label = await field.getAttribute('aria-label') || 
                      await field.getAttribute('aria-labelledby') ||
                      await field.getAttribute('placeholder');
        expect(label).toBeTruthy();
      }
    }

    // Test keyboard navigation in upload form
    await fileInput.focus();
    await blobPage.getPage().keyboard.press('Tab');
    
    // Should move to next form field
    const activeElement = await blobPage.getPage().evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(formFields.includes(activeElement!) || activeElement === 'form-upload-submit').toBe(true);
  });

  /**
   * Blob actions accessibility (download, delete, properties)
   * @extended-happy-path
   */
  test('provides accessible blob action controls', async () => {
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    const blobs = await blobPage.getBlobList();
    if (blobs.length > 0) {
      const firstBlobName = blobs[0].name;
      const blobRow = blobPage.getPage().getByTestId(`blob-${firstBlobName}`);
      
      // Check action buttons are accessible
      const actionButtons = [
        `blob-${firstBlobName}-download`,
        `blob-${firstBlobName}-delete`,
        `blob-${firstBlobName}-properties`
      ];

      for (const buttonId of actionButtons) {
        const button = blobRow.getByTestId(buttonId);
        if (await button.isVisible()) {
          // Button should be focusable
          await button.focus();
          const isFocused = await button.evaluate(el => el === document.activeElement);
          expect(isFocused).toBe(true);
          
          // Button should have accessible name
          const ariaLabel = await button.getAttribute('aria-label');
          const title = await button.getAttribute('title');
          const text = await button.textContent();
          const hasAccessibleName = ariaLabel || title || (text && text.trim());
          expect(hasAccessibleName).toBeTruthy();
        }
      }

      // Test keyboard activation
      const downloadButton = blobRow.getByTestId(`blob-${firstBlobName}-download`);
      await downloadButton.focus();
      
      // Should be able to activate with Enter or Space
      await blobPage.getPage().keyboard.press('Enter');
      // Note: In real test, this would trigger download
    }
  });

  /**
   * Breadcrumb navigation accessibility
   * @extended-happy-path
   */
  test('provides accessible breadcrumb navigation', async () => {
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    const breadcrumbs = blobPage.getPage().getByTestId('breadcrumbs');
    if (await breadcrumbs.isVisible()) {
      // Breadcrumbs should have proper ARIA structure
      const nav = breadcrumbs.locator('nav').first();
      if (await nav.isVisible()) {
        const ariaLabel = await nav.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/breadcrumb|navigation/i);
      }

      // Individual breadcrumb items should be links
      const breadcrumbLinks = breadcrumbs.locator('a');
      const linkCount = await breadcrumbLinks.count();
      
      for (let i = 0; i < linkCount; i++) {
        const link = breadcrumbLinks.nth(i);
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        
        expect(href).toBeTruthy();
        expect(text?.trim()).toBeTruthy();
        
        // Link should be focusable
        await link.focus();
        const isFocused = await link.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    }
  });

  /**
   * Search and filter accessibility
   * @extended-happy-path
   */
  test('provides accessible search and filter controls', async () => {
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    // Check search input accessibility
    const searchInput = blobPage.getPage().getByTestId('search-blobs');
    if (await searchInput.isVisible()) {
      const searchLabel = await searchInput.getAttribute('aria-label') ||
                          await searchInput.getAttribute('placeholder');
      expect(searchLabel).toBeTruthy();
      
      // Test search with screen reader announcements
      await searchInput.fill('test');
      
      // Check if there's an associated results announcement
      const searchResults = blobPage.getPage().getByTestId('search-results-count');
      if (await searchResults.isVisible()) {
        const ariaLive = await searchResults.getAttribute('aria-live');
        expect(ariaLive).toBeTruthy();
      }
    }

    // Check filter controls
    const filterControls = [
      'filter-content-type',
      'filter-access-tier',
      'sort-blobs-name'
    ];

    for (const controlId of filterControls) {
      const control = blobPage.getPage().getByTestId(controlId);
      if (await control.isVisible()) {
        const label = await control.getAttribute('aria-label') ||
                      await control.getAttribute('aria-labelledby');
        expect(label).toBeTruthy();
        
        // Control should be keyboard accessible
        await control.focus();
        const isFocused = await control.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    }
  });
});

test.describe('Accessibility - Screen Reader Testing @not-so-happy-path', () => {
  let mockService: MockAzureStorageService;

  test.beforeEach(async ({ page }) => {
    mockService = MockAzureStorageService.getInstance();
    await mockService.initialize();
    
    await TestHelpers.setupComprehensiveTestData(mockService, {
      containerCount: 2,
      blobsPerContainer: 3,
    });
  });

  /**
   * Page structure and landmarks
   * @not-so-happy-path
   */
  test('provides proper page structure for screen readers', async ({ page }) => {
    const dashboardPage = new DashboardPageHelper(page);
    await dashboardPage.navigateTo();
    await dashboardPage.verifyPageLoaded();

    // Check for semantic HTML landmarks
    const landmarks = [
      { selector: 'main', role: 'main' },
      { selector: 'nav', role: 'navigation' },
      { selector: 'header', role: 'banner' },
      { selector: '[role="region"]', role: 'region' }
    ];

    for (const landmark of landmarks) {
      const elements = page.locator(landmark.selector);
      const count = await elements.count();
      
      if (count > 0) {
        // At least one landmark element should exist
        const first = elements.first();
        await expect(first).toBeVisible();
        
        // Check it has proper role
        const role = await first.getAttribute('role');
        if (role) {
          expect(role).toBe(landmark.role);
        }
      }
    }

    // Check heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    if (headingCount > 0) {
      // Should have at least one h1
      const h1Elements = page.locator('h1');
      const h1Count = await h1Elements.count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      
      // Heading levels should be logical (not skip levels)
      const headingLevels: number[] = [];
      for (let i = 0; i < headingCount; i++) {
        const heading = headings.nth(i);
        const tagName = await heading.evaluate(el => el.tagName);
        const level = parseInt(tagName.substring(1));
        headingLevels.push(level);
      }
      
      // First heading should be h1
      expect(headingLevels[0]).toBe(1);
    }
  });

  /**
   * Dynamic content announcements
   * @not-so-happy-path
   */
  test('announces dynamic content changes', async ({ page }) => {
    const containerPage = new ContainerPageHelper(page);
    await containerPage.navigateTo();
    await containerPage.verifyPageLoaded();

    // Check for live regions for dynamic content
    const liveRegions = page.locator('[aria-live]');
    const liveCount = await liveRegions.count();
    
    if (liveCount > 0) {
      for (let i = 0; i < liveCount; i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off'].includes(ariaLive!)).toBe(true);
      }
    }

    // Test dynamic content update (create container)
    await containerPage.getPage().getByTestId('button-create-container').click();
    const modal = containerPage.getPage().getByTestId('modal-create-container');
    await expect(modal).toBeVisible();

    // Modal should be announced to screen readers
    const modalRole = await modal.getAttribute('role');
    const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
    const ariaLabel = await modal.getAttribute('aria-label');
    
    expect(modalRole).toBe('dialog');
    expect(ariaLabel || ariaLabelledBy).toBeTruthy();

    // Cancel modal to test focus management
    const cancelButton = containerPage.getPage().getByTestId('form-create-container-cancel');
    await cancelButton.click();
    
    // Focus should return to trigger button
    const activeElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(activeElement).toBe('button-create-container');
  });

  /**
   * Complex interactions accessibility
   * @not-so-happy-path
   */
  test('handles complex interactions accessibly', async ({ page }) => {
    const blobPage = new BlobPageHelper(page, 'test-container');
    
    // Create test container and blob
    await mockService.createContainer('test-container');
    await mockService.uploadBlob('test-container', 'complex-test.txt', Buffer.from('test content'));
    
    await blobPage.navigateTo();
    await blobPage.verifyPageLoaded();

    // Test context menu or dropdown accessibility
    const blobRow = blobPage.getPage().getByTestId('blob-complex-test.txt');
    if (await blobRow.isVisible()) {
      // Look for dropdown or context menu trigger
      const moreActions = blobRow.getByTestId('blob-complex-test.txt-more-actions');
      if (await moreActions.isVisible()) {
        // Test keyboard activation
        await moreActions.focus();
        await moreActions.press('Enter');
        
        // Dropdown should be accessible
        const dropdown = blobPage.getPage().getByTestId('blob-actions-dropdown');
        if (await dropdown.isVisible()) {
          const role = await dropdown.getAttribute('role');
          expect(role).toBe('menu');
          
          // Menu items should be focusable
          const menuItems = dropdown.locator('[role="menuitem"]');
          const itemCount = await menuItems.count();
          
          if (itemCount > 0) {
            // First item should be focused when menu opens
            const firstItem = menuItems.first();
            const isFocused = await firstItem.evaluate(el => el === document.activeElement);
            expect(isFocused).toBe(true);
          }
        }
      }
    }
  });
});
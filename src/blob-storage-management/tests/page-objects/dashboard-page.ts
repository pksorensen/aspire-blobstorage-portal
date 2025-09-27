import { Page, expect } from '@playwright/test';
import { BasePageHelper } from './base-page';

export interface StorageMetrics {
  containerCount: string;
  blobCount: string;
  totalSize: string;
  usedCapacity?: string;
}

export interface RecentItem {
  name: string;
  type: 'container' | 'blob';
  lastAccessed: string;
  path?: string;
}

/**
 * Page helper for Dashboard/Home page functionality
 * Handles storage metrics display, recent items, and navigation
 */
export class DashboardPageHelper extends BasePageHelper {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the dashboard page
   */
  async navigateTo(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Verify dashboard page has loaded correctly
   */
  async verifyPageLoaded(): Promise<void> {
    await this.verifyPageIdentity(/Azure Storage Explorer/, /.*\//);
    await expect(this.getByTestId('dashboard-container')).toBeVisible();
    await expect(this.getByTestId('metrics-section')).toBeVisible();
  }

  /**
   * Get current storage metrics from the dashboard
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    await this.waitForElement('metrics-cards');
    
    const containerCount = await this.getByTestId('metric-container-count').textContent();
    const blobCount = await this.getByTestId('metric-blob-count').textContent();
    const totalSize = await this.getByTestId('metric-total-size').textContent();
    const usedCapacity = await this.getByTestId('metric-used-capacity').textContent();

    return {
      containerCount: containerCount || '0',
      blobCount: blobCount || '0', 
      totalSize: totalSize || '0 B',
      usedCapacity: usedCapacity || '0%',
    };
  }

  /**
   * Verify storage metrics are visible and properly formatted
   */
  async verifyMetricsVisible(): Promise<void> {
    const metricsCards = this.getByTestId('metrics-cards');
    await expect(metricsCards).toBeVisible();

    // Verify each metric card
    const metricCards = [
      'metric-container-count',
      'metric-blob-count',
      'metric-total-size',
      'metric-used-capacity',
    ];

    for (const cardId of metricCards) {
      const card = this.getByTestId(cardId);
      await expect(card).toBeVisible();
      
      // Verify card has content (not empty)
      const content = await card.textContent();
      expect(content).not.toBe('');
      expect(content).not.toBeNull();
    }
  }

  /**
   * Verify metrics match expected values
   */
  async verifyMetricsValues(expectedMetrics: Partial<StorageMetrics>): Promise<void> {
    const actualMetrics = await this.getStorageMetrics();

    if (expectedMetrics.containerCount !== undefined) {
      expect(actualMetrics.containerCount).toBe(expectedMetrics.containerCount);
    }

    if (expectedMetrics.blobCount !== undefined) {
      expect(actualMetrics.blobCount).toBe(expectedMetrics.blobCount);
    }

    if (expectedMetrics.totalSize !== undefined) {
      expect(actualMetrics.totalSize).toContain(expectedMetrics.totalSize);
    }

    if (expectedMetrics.usedCapacity !== undefined) {
      expect(actualMetrics.usedCapacity).toContain(expectedMetrics.usedCapacity);
    }
  }

  /**
   * Get list of recent items from dashboard
   */
  async getRecentItems(): Promise<RecentItem[]> {
    const recentSection = this.getByTestId('recent-items-section');
    await expect(recentSection).toBeVisible();

    const items: RecentItem[] = [];
    const itemElements = this.page.getByTestId(/^recent-item-/);
    const itemCount = await itemElements.count();

    for (let i = 0; i < itemCount; i++) {
      const item = itemElements.nth(i);
      const name = await item.getByTestId('recent-item-name').textContent() || '';
      const type = await item.getByTestId('recent-item-type').textContent() || '';
      const lastAccessed = await item.getByTestId('recent-item-date').textContent() || '';
      const path = await item.getByTestId('recent-item-path').textContent();

      items.push({
        name,
        type: type.toLowerCase() as 'container' | 'blob',
        lastAccessed,
        path: path || undefined,
      });
    }

    return items;
  }

  /**
   * Verify recent items section displays correctly
   */
  async verifyRecentItemsVisible(): Promise<void> {
    const recentSection = this.getByTestId('recent-items-section');
    await expect(recentSection).toBeVisible();

    const recentTitle = this.getByTestId('recent-items-title');
    await expect(recentTitle).toContainText('Recent');
  }

  /**
   * Verify recent items count
   */
  async verifyRecentItemsCount(expectedCount: number): Promise<void> {
    await this.verifyElementCount(/^recent-item-/, expectedCount);
  }

  /**
   * Click on a recent item to navigate
   */
  async clickRecentItem(itemName: string): Promise<void> {
    const recentItem = this.page.getByTestId(`recent-item-${itemName}`);
    await expect(recentItem).toBeVisible();
    await this.clickAndWait(`recent-item-${itemName}`, true);
  }

  /**
   * Navigate to containers page from dashboard
   */
  async navigateToContainers(): Promise<void> {
    await this.clickAndWait('nav-containers', true);
  }

  /**
   * Navigate to specific container from dashboard quick actions
   */
  async navigateToContainer(containerName: string): Promise<void> {
    const containerCard = this.getByTestId(`quick-container-${containerName}`);
    await expect(containerCard).toBeVisible();
    await containerCard.click();
    await this.waitForPageLoad();
  }

  /**
   * Verify quick actions section is visible
   */
  async verifyQuickActionsVisible(): Promise<void> {
    const quickActions = this.getByTestId('quick-actions-section');
    await expect(quickActions).toBeVisible();

    // Verify common quick action buttons
    const actions = [
      'quick-action-create-container',
      'quick-action-upload-file',
      'quick-action-view-containers',
    ];

    for (const actionId of actions) {
      const action = this.getByTestId(actionId);
      await expect(action).toBeVisible();
    }
  }

  /**
   * Click quick action button
   */
  async clickQuickAction(actionType: 'create-container' | 'upload-file' | 'view-containers'): Promise<void> {
    await this.clickAndWait(`quick-action-${actionType}`, true);
  }

  /**
   * Refresh dashboard data by triggering reload
   */
  async refreshDashboard(): Promise<void> {
    const refreshButton = this.getByTestId('refresh-dashboard');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await this.expectLoadingComplete();
  }

  /**
   * Verify dashboard loading state
   */
  async verifyDashboardLoading(): Promise<void> {
    const loadingIndicator = this.getByTestId('dashboard-loading');
    await expect(loadingIndicator).toBeVisible();
  }

  /**
   * Search from global search on dashboard
   */
  async performGlobalSearch(searchTerm: string): Promise<void> {
    const searchInput = this.getByTestId('global-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(searchTerm);
    
    const searchButton = this.getByTestId('global-search-submit');
    await searchButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Verify search results are displayed
   */
  async verifySearchResults(expectedResultCount: number): Promise<void> {
    const searchResults = this.getByTestId('search-results-section');
    await expect(searchResults).toBeVisible();
    
    await this.verifyElementCount(/^search-result-/, expectedResultCount);
  }

  /**
   * Verify dashboard empty state (no containers)
   */
  async verifyEmptyState(): Promise<void> {
    const emptyState = this.getByTestId('dashboard-empty-state');
    await expect(emptyState).toBeVisible();
    
    const emptyMessage = this.getByTestId('empty-state-message');
    await expect(emptyMessage).toContainText('No containers found');
    
    const createButton = this.getByTestId('empty-state-create-container');
    await expect(createButton).toBeVisible();
  }

  /**
   * Click create container from empty state
   */
  async clickCreateContainerFromEmptyState(): Promise<void> {
    await this.clickAndWait('empty-state-create-container', true);
  }

  /**
   * Verify sidebar navigation is visible and functional
   */
  async verifySidebarNavigation(): Promise<void> {
    const sidebar = this.getByTestId('sidebar-navigation');
    await expect(sidebar).toBeVisible();

    const navItems = [
      'nav-dashboard',
      'nav-containers', 
      'nav-search',
      'nav-settings',
    ];

    for (const navItem of navItems) {
      const item = this.getByTestId(navItem);
      await expect(item).toBeVisible();
    }
  }

  /**
   * Toggle sidebar collapsed state
   */
  async toggleSidebar(): Promise<void> {
    const sidebarToggle = this.getByTestId('sidebar-toggle');
    await expect(sidebarToggle).toBeVisible();
    await sidebarToggle.click();
  }

  /**
   * Verify responsive dashboard layout on mobile
   */
  async verifyMobileLayout(): Promise<void> {
    await this.testResponsive(async () => {
      await this.verifyPageLoaded();
      await this.verifyMetricsVisible();
      
      // Mobile-specific checks
      const mobileNav = this.getByTestId('mobile-nav-menu');
      if (await mobileNav.isVisible()) {
        await expect(mobileNav).toBeVisible();
      }
    });
  }
}
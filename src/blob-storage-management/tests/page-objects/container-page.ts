import { Page, expect, Download } from '@playwright/test';
import { BasePageHelper } from './base-page';

export interface ContainerItem {
  name: string;
  blobCount: number;
  lastModified: string;
  size: string;
  publicAccess: 'none' | 'blob' | 'container';
}

export interface ContainerProperties {
  name: string;
  blobCount: number;
  lastModified: string;
  etag: string;
  leaseStatus: string;
  leaseState: string;
  publicAccess: string;
  metadata: Record<string, string>;
}

/**
 * Page helper for Container listing and management functionality
 * Handles container CRUD operations, search, and navigation
 */
export class ContainerPageHelper extends BasePageHelper {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to containers listing page
   */
  async navigateTo(): Promise<void> {
    await this.page.goto('/containers');
    await this.waitForPageLoad();
  }

  /**
   * Verify containers page has loaded correctly
   */
  async verifyPageLoaded(): Promise<void> {
    await this.verifyPageIdentity(/Containers/, /.*\/containers/);
    await expect(this.getByTestId('containers-page')).toBeVisible();
    await expect(this.getByTestId('containers-header')).toBeVisible();
  }

  /**
   * Create a new container using the form
   */
  async createContainer(name: string, publicAccess: 'none' | 'blob' | 'container' = 'none'): Promise<void> {
    await this.clickAndWait('button-create-container');
    
    // Wait for modal/form to appear
    const modal = this.getByTestId('modal-create-container');
    await expect(modal).toBeVisible();

    // Fill container details
    await this.fillFormField('form-create-container-name', name);
    
    // Set public access level
    const accessSelect = this.getByTestId('form-create-container-access');
    await accessSelect.selectOption(publicAccess);

    // Submit form
    const submitButton = this.getByTestId('form-create-container-submit');
    await submitButton.click();
    await this.waitForServerAction(submitButton);
    
    // Verify success
    await this.expectSuccess(`Container "${name}" created successfully`);
    
    // Wait for modal to close
    await expect(modal).toBeHidden();
  }

  /**
   * Delete a container with confirmation
   */
  async deleteContainer(name: string): Promise<void> {
    const containerCard = this.getByTestId(`container-${name}`);
    await expect(containerCard).toBeVisible();

    // Click delete button on container card
    const deleteButton = containerCard.getByTestId(`container-${name}-delete`);
    await deleteButton.click();

    // Confirm deletion in modal
    const confirmModal = this.getByTestId('modal-delete-container');
    await expect(confirmModal).toBeVisible();
    
    const confirmInput = this.getByTestId('form-delete-container-confirm');
    await confirmInput.fill(name);
    
    const confirmButton = this.getByTestId('form-delete-container-submit');
    await confirmButton.click();
    await this.waitForServerAction(confirmButton);

    // Verify success and modal closure
    await this.expectSuccess(`Container "${name}" deleted successfully`);
    await expect(confirmModal).toBeHidden();
  }

  /**
   * Search for containers using search input
   */
  async searchContainers(searchTerm: string): Promise<void> {
    const searchInput = this.getByTestId('search-containers');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(searchTerm);
    
    // Wait for search debounce
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    const searchInput = this.getByTestId('search-containers');
    await searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get list of all visible containers
   */
  async getContainerList(): Promise<ContainerItem[]> {
    const containers: ContainerItem[] = [];
    const containerElements = this.page.getByTestId(/^container-/);
    const count = await containerElements.count();

    for (let i = 0; i < count; i++) {
      const container = containerElements.nth(i);
      const nameElement = container.getByTestId('container-name');
      const blobCountElement = container.getByTestId('container-blob-count');
      const lastModifiedElement = container.getByTestId('container-last-modified');
      const sizeElement = container.getByTestId('container-size');
      const accessElement = container.getByTestId('container-public-access');

      const name = await nameElement.textContent() || '';
      const blobCountText = await blobCountElement.textContent() || '0';
      const lastModified = await lastModifiedElement.textContent() || '';
      const size = await sizeElement.textContent() || '0 B';
      const access = await accessElement.textContent() || 'none';

      containers.push({
        name,
        blobCount: parseInt(blobCountText),
        lastModified,
        size,
        publicAccess: access as 'none' | 'blob' | 'container',
      });
    }

    return containers;
  }

  /**
   * Verify specific container exists in the list
   */
  async verifyContainerExists(name: string): Promise<void> {
    const container = this.getByTestId(`container-${name}`);
    await expect(container).toBeVisible();
  }

  /**
   * Verify container does not exist in the list
   */
  async verifyContainerNotExists(name: string): Promise<void> {
    const container = this.getByTestId(`container-${name}`);
    await expect(container).not.toBeVisible();
  }

  /**
   * Verify the total number of visible containers
   */
  async verifyContainerCount(expectedCount: number): Promise<void> {
    await this.verifyElementCount(/^container-/, expectedCount);
  }

  /**
   * Navigate to specific container's blob listing
   */
  async navigateToContainer(containerName: string): Promise<void> {
    const containerCard = this.getByTestId(`container-${containerName}`);
    await expect(containerCard).toBeVisible();
    
    const containerLink = containerCard.getByTestId(`container-${containerName}-link`);
    await containerLink.click();
    await this.waitForPageLoad();
  }

  /**
   * Get container properties from expanded view
   */
  async getContainerProperties(containerName: string): Promise<ContainerProperties> {
    const container = this.getByTestId(`container-${containerName}`);
    await expect(container).toBeVisible();

    // Expand container details if needed
    const expandButton = container.getByTestId(`container-${containerName}-expand`);
    if (await expandButton.isVisible()) {
      await expandButton.click();
    }

    const detailsSection = container.getByTestId(`container-${containerName}-details`);
    await expect(detailsSection).toBeVisible();

    return {
      name: containerName,
      blobCount: parseInt(await detailsSection.getByTestId('detail-blob-count').textContent() || '0'),
      lastModified: await detailsSection.getByTestId('detail-last-modified').textContent() || '',
      etag: await detailsSection.getByTestId('detail-etag').textContent() || '',
      leaseStatus: await detailsSection.getByTestId('detail-lease-status').textContent() || '',
      leaseState: await detailsSection.getByTestId('detail-lease-state').textContent() || '',
      publicAccess: await detailsSection.getByTestId('detail-public-access').textContent() || '',
      metadata: {}, // TODO: Parse metadata if displayed
    };
  }

  /**
   * Sort containers by different criteria
   */
  async sortContainers(sortBy: 'name' | 'modified' | 'size' | 'blobs', order: 'asc' | 'desc' = 'asc'): Promise<void> {
    const sortButton = this.getByTestId(`sort-${sortBy}`);
    await expect(sortButton).toBeVisible();
    
    await sortButton.click();
    
    // Click again if we want descending order
    if (order === 'desc') {
      await sortButton.click();
    }
    
    // Wait for sort to apply
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter containers by public access level
   */
  async filterByPublicAccess(accessLevel: 'all' | 'none' | 'blob' | 'container'): Promise<void> {
    const filterDropdown = this.getByTestId('filter-public-access');
    await expect(filterDropdown).toBeVisible();
    await filterDropdown.selectOption(accessLevel);
    await this.page.waitForTimeout(300);
  }

  /**
   * Verify empty state when no containers exist
   */
  async verifyEmptyState(): Promise<void> {
    const emptyState = this.getByTestId('containers-empty-state');
    await expect(emptyState).toBeVisible();
    
    const emptyMessage = this.getByTestId('empty-state-message');
    await expect(emptyMessage).toContainText('No containers found');
    
    const createButton = this.getByTestId('empty-state-create-container');
    await expect(createButton).toBeVisible();
  }

  /**
   * Verify loading state during container operations
   */
  async verifyLoadingState(): Promise<void> {
    const loadingIndicator = this.getByTestId('containers-loading');
    await expect(loadingIndicator).toBeVisible();
  }

  /**
   * Bulk select containers
   */
  async selectContainers(containerNames: string[]): Promise<void> {
    for (const name of containerNames) {
      const checkbox = this.getByTestId(`container-${name}-checkbox`);
      await expect(checkbox).toBeVisible();
      await checkbox.check();
    }
  }

  /**
   * Perform bulk delete operation
   */
  async bulkDeleteContainers(containerNames: string[]): Promise<void> {
    // Select containers
    await this.selectContainers(containerNames);

    // Click bulk delete button
    const bulkDeleteButton = this.getByTestId('bulk-delete-containers');
    await expect(bulkDeleteButton).toBeVisible();
    await bulkDeleteButton.click();

    // Confirm bulk deletion
    const confirmModal = this.getByTestId('modal-bulk-delete-containers');
    await expect(confirmModal).toBeVisible();
    
    const confirmButton = this.getByTestId('form-bulk-delete-submit');
    await confirmButton.click();
    await this.waitForServerAction(confirmButton);

    // Verify success
    await this.expectSuccess(`${containerNames.length} containers deleted successfully`);
  }

  /**
   * Export container list as CSV
   */
  async exportContainerList(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download');
    const exportButton = this.getByTestId('export-containers');
    await exportButton.click();
    return downloadPromise;
  }

  /**
   * Refresh containers list
   */
  async refreshContainers(): Promise<void> {
    const refreshButton = this.getByTestId('refresh-containers');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await this.expectLoadingComplete();
  }

  /**
   * Verify container validation errors
   */
  async verifyContainerNameValidation(invalidName: string, expectedError: string): Promise<void> {
    await this.clickAndWait('button-create-container');
    
    const modal = this.getByTestId('modal-create-container');
    await expect(modal).toBeVisible();

    await this.fillFormField('form-create-container-name', invalidName);
    
    // Try to submit
    const submitButton = this.getByTestId('form-create-container-submit');
    await submitButton.click();

    // Verify validation error appears
    const validationError = this.getByTestId('form-create-container-name-error');
    await expect(validationError).toBeVisible();
    await expect(validationError).toContainText(expectedError);

    // Close modal
    const cancelButton = this.getByTestId('form-create-container-cancel');
    await cancelButton.click();
  }

  /**
   * Verify pagination when many containers exist
   */
  async verifyPagination(expectedPages: number): Promise<void> {
    const pagination = this.getByTestId('containers-pagination');
    await expect(pagination).toBeVisible();

    const pageInfo = this.getByTestId('pagination-info');
    await expect(pageInfo).toContainText(`Page 1 of ${expectedPages}`);

    // Test navigation if more than 1 page
    if (expectedPages > 1) {
      const nextButton = this.getByTestId('pagination-next');
      await expect(nextButton).toBeVisible();
      await nextButton.click();
      await this.waitForPageLoad();
      await expect(pageInfo).toContainText('Page 2 of');
    }
  }

  /**
   * Navigate to specific page in pagination
   */
  async navigateToPage(pageNumber: number): Promise<void> {
    const pageButton = this.getByTestId(`pagination-page-${pageNumber}`);
    await expect(pageButton).toBeVisible();
    await pageButton.click();
    await this.waitForPageLoad();
  }
}
import { Page, expect, Download, FileChooser } from '@playwright/test';
import { BasePageHelper } from './base-page';

export interface BlobItem {
  name: string;
  size: string;
  lastModified: string;
  contentType: string;
  blobType: 'BlockBlob' | 'PageBlob' | 'AppendBlob';
  accessTier: 'Hot' | 'Cool' | 'Archive';
  leaseStatus: string;
}

export interface BlobProperties {
  name: string;
  size: number;
  lastModified: string;
  contentType: string;
  contentEncoding?: string;
  contentLanguage?: string;
  cacheControl?: string;
  contentDisposition?: string;
  blobType: string;
  accessTier: string;
  leaseStatus: string;
  leaseState: string;
  etag: string;
  metadata: Record<string, string>;
}

export interface UploadOptions {
  fileName?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  accessTier?: 'Hot' | 'Cool' | 'Archive';
}

/**
 * Page helper for Blob listing and management within a container
 * Handles blob operations: upload, download, delete, metadata management
 */
export class BlobPageHelper extends BasePageHelper {
  constructor(page: Page, private containerName: string) {
    super(page);
  }

  /**
   * Navigate to blob listing page for the container
   */
  async navigateTo(): Promise<void> {
    await this.page.goto(`/containers/${this.containerName}`);
    await this.waitForPageLoad();
  }

  /**
   * Verify blob page has loaded correctly
   */
  async verifyPageLoaded(): Promise<void> {
    await this.verifyPageIdentity(
      new RegExp(`${this.containerName}`), 
      new RegExp(`/containers/${this.containerName}`)
    );
    await expect(this.getByTestId('blob-page')).toBeVisible();
    await expect(this.getByTestId('container-header')).toBeVisible();
    await expect(this.getByTestId('container-name')).toContainText(this.containerName);
  }

  /**
   * Upload a single file to the container
   */
  async uploadFile(filePath: string, options: UploadOptions = {}): Promise<void> {
    const uploadButton = this.getByTestId('button-upload-file');
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();

    // Wait for upload modal/form
    const uploadModal = this.getByTestId('modal-upload-file');
    await expect(uploadModal).toBeVisible();

    // Set up file input
    const fileInput = this.getByTestId('form-upload-file');
    await fileInput.setInputFiles(filePath);

    // Set custom filename if provided
    if (options.fileName) {
      const nameInput = this.getByTestId('form-upload-filename');
      await nameInput.fill(options.fileName);
    }

    // Set content type if provided
    if (options.contentType) {
      const typeInput = this.getByTestId('form-upload-content-type');
      await typeInput.fill(options.contentType);
    }

    // Set access tier if provided
    if (options.accessTier) {
      const tierSelect = this.getByTestId('form-upload-access-tier');
      await tierSelect.selectOption(options.accessTier);
    }

    // Add metadata if provided
    if (options.metadata) {
      await this.setMetadata(options.metadata);
    }

    // Submit upload
    const submitButton = this.getByTestId('form-upload-submit');
    await submitButton.click();
    await this.waitForServerAction(submitButton);

    // Verify success and modal closure
    const fileName = options.fileName || filePath.split('/').pop() || 'file';
    await this.expectSuccess(`File "${fileName}" uploaded successfully`);
    await expect(uploadModal).toBeHidden();
  }

  /**
   * Upload multiple files at once
   */
  async uploadMultipleFiles(filePaths: string[]): Promise<void> {
    const uploadButton = this.getByTestId('button-upload-files');
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();

    const uploadModal = this.getByTestId('modal-upload-files');
    await expect(uploadModal).toBeVisible();

    const fileInput = this.getByTestId('form-upload-files');
    await fileInput.setInputFiles(filePaths);

    const submitButton = this.getByTestId('form-upload-files-submit');
    await submitButton.click();
    await this.waitForServerAction(submitButton);

    await this.expectSuccess(`${filePaths.length} files uploaded successfully`);
    await expect(uploadModal).toBeHidden();
  }

  /**
   * Download a specific blob
   */
  async downloadFile(blobName: string): Promise<Download> {
    const blobRow = this.getByTestId(`blob-${blobName}`);
    await expect(blobRow).toBeVisible();

    const downloadPromise = this.page.waitForEvent('download');
    const downloadButton = blobRow.getByTestId(`blob-${blobName}-download`);
    await downloadButton.click();

    return downloadPromise;
  }

  /**
   * Delete a specific blob with confirmation
   */
  async deleteFile(blobName: string): Promise<void> {
    const blobRow = this.getByTestId(`blob-${blobName}`);
    await expect(blobRow).toBeVisible();

    const deleteButton = blobRow.getByTestId(`blob-${blobName}-delete`);
    await deleteButton.click();

    // Confirm deletion
    const confirmModal = this.getByTestId('modal-delete-blob');
    await expect(confirmModal).toBeVisible();
    
    const confirmInput = this.getByTestId('form-delete-blob-confirm');
    await confirmInput.fill(blobName);
    
    const confirmButton = this.getByTestId('form-delete-blob-submit');
    await confirmButton.click();
    await this.waitForServerAction(confirmButton);

    await this.expectSuccess(`File "${blobName}" deleted successfully`);
    await expect(confirmModal).toBeHidden();
  }

  /**
   * Search/filter blobs by name
   */
  async searchBlobs(searchTerm: string): Promise<void> {
    const searchInput = this.getByTestId('search-blobs');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(searchTerm);
    
    // Wait for search debounce
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear blob search
   */
  async clearBlobSearch(): Promise<void> {
    const searchInput = this.getByTestId('search-blobs');
    await searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get list of all visible blobs
   */
  async getBlobList(): Promise<BlobItem[]> {
    const blobs: BlobItem[] = [];
    const blobElements = this.page.getByTestId(/^blob-/);
    const count = await blobElements.count();

    for (let i = 0; i < count; i++) {
      const blob = blobElements.nth(i);
      const nameElement = blob.getByTestId('blob-name');
      const sizeElement = blob.getByTestId('blob-size');
      const modifiedElement = blob.getByTestId('blob-last-modified');
      const typeElement = blob.getByTestId('blob-content-type');
      const blobTypeElement = blob.getByTestId('blob-type');
      const tierElement = blob.getByTestId('blob-access-tier');
      const leaseElement = blob.getByTestId('blob-lease-status');

      const name = await nameElement.textContent() || '';
      const size = await sizeElement.textContent() || '0 B';
      const lastModified = await modifiedElement.textContent() || '';
      const contentType = await typeElement.textContent() || '';
      const blobType = await blobTypeElement.textContent() || 'BlockBlob';
      const accessTier = await tierElement.textContent() || 'Hot';
      const leaseStatus = await leaseElement.textContent() || 'unlocked';

      blobs.push({
        name,
        size,
        lastModified,
        contentType,
        blobType: blobType as 'BlockBlob' | 'PageBlob' | 'AppendBlob',
        accessTier: accessTier as 'Hot' | 'Cool' | 'Archive',
        leaseStatus,
      });
    }

    return blobs;
  }

  /**
   * Verify specific blob exists
   */
  async verifyFileExists(blobName: string): Promise<void> {
    const blob = this.getByTestId(`blob-${blobName}`);
    await expect(blob).toBeVisible();
  }

  /**
   * Verify blob does not exist
   */
  async verifyFileNotExists(blobName: string): Promise<void> {
    const blob = this.getByTestId(`blob-${blobName}`);
    await expect(blob).not.toBeVisible();
  }

  /**
   * Verify total number of visible blobs
   */
  async verifyFileCount(expectedCount: number): Promise<void> {
    await this.verifyElementCount(/^blob-/, expectedCount);
  }

  /**
   * Get detailed properties for a specific blob
   */
  async getBlobProperties(blobName: string): Promise<BlobProperties> {
    const blobRow = this.getByTestId(`blob-${blobName}`);
    await expect(blobRow).toBeVisible();

    // Open properties panel/modal
    const propertiesButton = blobRow.getByTestId(`blob-${blobName}-properties`);
    await propertiesButton.click();

    const propertiesModal = this.getByTestId('modal-blob-properties');
    await expect(propertiesModal).toBeVisible();

    // Extract properties
    const properties: BlobProperties = {
      name: blobName,
      size: parseInt(await this.getByTestId('prop-size').textContent() || '0'),
      lastModified: await this.getByTestId('prop-last-modified').textContent() || '',
      contentType: await this.getByTestId('prop-content-type').textContent() || '',
      contentEncoding: await this.getByTestId('prop-content-encoding').textContent() || undefined,
      contentLanguage: await this.getByTestId('prop-content-language').textContent() || undefined,
      cacheControl: await this.getByTestId('prop-cache-control').textContent() || undefined,
      contentDisposition: await this.getByTestId('prop-content-disposition').textContent() || undefined,
      blobType: await this.getByTestId('prop-blob-type').textContent() || '',
      accessTier: await this.getByTestId('prop-access-tier').textContent() || '',
      leaseStatus: await this.getByTestId('prop-lease-status').textContent() || '',
      leaseState: await this.getByTestId('prop-lease-state').textContent() || '',
      etag: await this.getByTestId('prop-etag').textContent() || '',
      metadata: await this.getMetadataFromModal(),
    };

    // Close properties modal
    const closeButton = this.getByTestId('modal-blob-properties-close');
    await closeButton.click();

    return properties;
  }

  /**
   * Update blob access tier
   */
  async updateAccessTier(blobName: string, newTier: 'Hot' | 'Cool' | 'Archive'): Promise<void> {
    const blobRow = this.getByTestId(`blob-${blobName}`);
    await expect(blobRow).toBeVisible();

    const tierButton = blobRow.getByTestId(`blob-${blobName}-change-tier`);
    await tierButton.click();

    const tierModal = this.getByTestId('modal-change-tier');
    await expect(tierModal).toBeVisible();

    const tierSelect = this.getByTestId('form-change-tier-select');
    await tierSelect.selectOption(newTier);

    const submitButton = this.getByTestId('form-change-tier-submit');
    await submitButton.click();
    await this.waitForServerAction(submitButton);

    await this.expectSuccess(`Access tier changed to ${newTier}`);
    await expect(tierModal).toBeHidden();
  }

  /**
   * Update blob metadata
   */
  async updateBlobMetadata(blobName: string, metadata: Record<string, string>): Promise<void> {
    const blobRow = this.getByTestId(`blob-${blobName}`);
    await expect(blobRow).toBeVisible();

    const metadataButton = blobRow.getByTestId(`blob-${blobName}-metadata`);
    await metadataButton.click();

    const metadataModal = this.getByTestId('modal-blob-metadata');
    await expect(metadataModal).toBeVisible();

    await this.setMetadata(metadata);

    const submitButton = this.getByTestId('form-metadata-submit');
    await submitButton.click();
    await this.waitForServerAction(submitButton);

    await this.expectSuccess('Metadata updated successfully');
    await expect(metadataModal).toBeHidden();
  }

  /**
   * Copy blob to another container
   */
  async copyBlob(blobName: string, targetContainer: string, newBlobName?: string): Promise<void> {
    const blobRow = this.getByTestId(`blob-${blobName}`);
    await expect(blobRow).toBeVisible();

    const copyButton = blobRow.getByTestId(`blob-${blobName}-copy`);
    await copyButton.click();

    const copyModal = this.getByTestId('modal-copy-blob');
    await expect(copyModal).toBeVisible();

    const containerSelect = this.getByTestId('form-copy-target-container');
    await containerSelect.selectOption(targetContainer);

    if (newBlobName) {
      const nameInput = this.getByTestId('form-copy-new-name');
      await nameInput.fill(newBlobName);
    }

    const submitButton = this.getByTestId('form-copy-submit');
    await submitButton.click();
    await this.waitForServerAction(submitButton);

    const targetName = newBlobName || blobName;
    await this.expectSuccess(`Blob copied to ${targetContainer}/${targetName}`);
    await expect(copyModal).toBeHidden();
  }

  /**
   * Sort blobs by different criteria
   */
  async sortBlobs(sortBy: 'name' | 'size' | 'modified' | 'type', order: 'asc' | 'desc' = 'asc'): Promise<void> {
    const sortButton = this.getByTestId(`sort-blobs-${sortBy}`);
    await expect(sortButton).toBeVisible();
    
    await sortButton.click();
    
    if (order === 'desc') {
      await sortButton.click();
    }
    
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter blobs by content type
   */
  async filterByContentType(contentType: string): Promise<void> {
    const filterDropdown = this.getByTestId('filter-content-type');
    await expect(filterDropdown).toBeVisible();
    await filterDropdown.selectOption(contentType);
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter blobs by access tier
   */
  async filterByAccessTier(tier: 'all' | 'Hot' | 'Cool' | 'Archive'): Promise<void> {
    const filterDropdown = this.getByTestId('filter-access-tier');
    await expect(filterDropdown).toBeVisible();
    await filterDropdown.selectOption(tier);
    await this.page.waitForTimeout(300);
  }

  /**
   * Bulk select blobs
   */
  async selectBlobs(blobNames: string[]): Promise<void> {
    for (const name of blobNames) {
      const checkbox = this.getByTestId(`blob-${name}-checkbox`);
      await expect(checkbox).toBeVisible();
      await checkbox.check();
    }
  }

  /**
   * Bulk delete selected blobs
   */
  async bulkDeleteBlobs(blobNames: string[]): Promise<void> {
    await this.selectBlobs(blobNames);

    const bulkDeleteButton = this.getByTestId('bulk-delete-blobs');
    await expect(bulkDeleteButton).toBeVisible();
    await bulkDeleteButton.click();

    const confirmModal = this.getByTestId('modal-bulk-delete-blobs');
    await expect(confirmModal).toBeVisible();
    
    const confirmButton = this.getByTestId('form-bulk-delete-submit');
    await confirmButton.click();
    await this.waitForServerAction(confirmButton);

    await this.expectSuccess(`${blobNames.length} files deleted successfully`);
  }

  /**
   * Navigate to virtual folder (directory structure)
   */
  async navigateToFolder(folderPath: string): Promise<void> {
    const folderLink = this.getByTestId(`folder-${folderPath}`);
    await expect(folderLink).toBeVisible();
    await folderLink.click();
    await this.waitForPageLoad();
  }

  /**
   * Navigate up one level in folder structure
   */
  async navigateUp(): Promise<void> {
    const upButton = this.getByTestId('navigate-up');
    await expect(upButton).toBeVisible();
    await upButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Verify breadcrumb navigation
   */
  async verifyBreadcrumbs(expectedPath: string[]): Promise<void> {
    const breadcrumbs = this.getByTestId('breadcrumbs');
    await expect(breadcrumbs).toBeVisible();

    for (let i = 0; i < expectedPath.length; i++) {
      const crumb = this.getByTestId(`breadcrumb-${i}`);
      await expect(crumb).toContainText(expectedPath[i]);
    }
  }

  /**
   * Verify empty state when no blobs exist
   */
  async verifyEmptyState(): Promise<void> {
    const emptyState = this.getByTestId('blobs-empty-state');
    await expect(emptyState).toBeVisible();
    
    const emptyMessage = this.getByTestId('empty-state-message');
    await expect(emptyMessage).toContainText('No files found');
    
    const uploadButton = this.getByTestId('empty-state-upload-file');
    await expect(uploadButton).toBeVisible();
  }

  /**
   * Refresh blob listing
   */
  async refreshBlobs(): Promise<void> {
    const refreshButton = this.getByTestId('refresh-blobs');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await this.expectLoadingComplete();
  }

  // Helper methods

  /**
   * Set metadata key-value pairs in metadata form
   */
  private async setMetadata(metadata: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(metadata)) {
      const addButton = this.getByTestId('metadata-add-pair');
      await addButton.click();

      const keyInput = this.getByTestId('metadata-key-input').last();
      await keyInput.fill(key);

      const valueInput = this.getByTestId('metadata-value-input').last();
      await valueInput.fill(value);
    }
  }

  /**
   * Extract metadata from properties modal
   */
  private async getMetadataFromModal(): Promise<Record<string, string>> {
    const metadata: Record<string, string> = {};
    const metadataRows = this.page.getByTestId(/^metadata-row-/);
    const count = await metadataRows.count();

    for (let i = 0; i < count; i++) {
      const row = metadataRows.nth(i);
      const key = await row.getByTestId('metadata-key').textContent() || '';
      const value = await row.getByTestId('metadata-value').textContent() || '';
      metadata[key] = value;
    }

    return metadata;
  }
}
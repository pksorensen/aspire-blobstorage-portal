import { Page, expect, Locator } from '@playwright/test';

/**
 * Base page helper class for all page objects
 * Provides common functionality and patterns for Azure Storage Explorer UI testing
 */
export abstract class BasePageHelper {
  constructor(protected page: Page) {}

  /**
   * Wait for the page to fully load including network requests
   */
  protected async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    
    // Wait for Next.js hydration to complete
    await this.page.waitForFunction(() => {
      return window.document.readyState === 'complete';
    });
  }

  /**
   * Wait for Server Action to complete by checking for loading states
   */
  protected async waitForServerAction(actionButton?: Locator): Promise<void> {
    if (actionButton) {
      // Wait for button to show loading state and then complete
      await expect(actionButton).toBeDisabled();
      await expect(actionButton).toBeEnabled({ timeout: 10000 });
    } else {
      // Generic wait for network to stabilize
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Verify success message appears with specific text
   */
  protected async expectSuccess(message: string): Promise<void> {
    const successElement = this.page.getByTestId('message-success');
    await expect(successElement).toBeVisible({ timeout: 5000 });
    await expect(successElement).toContainText(message);
  }

  /**
   * Verify error message appears with specific text
   */
  protected async expectError(message: string): Promise<void> {
    const errorElement = this.page.getByTestId('message-error');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
    await expect(errorElement).toContainText(message);
  }

  /**
   * Verify loading state is shown and then hidden
   */
  protected async expectLoadingComplete(): Promise<void> {
    const loadingElement = this.page.getByTestId('loading-spinner');
    
    // Loading might be very quick, so use a short timeout
    try {
      await expect(loadingElement).toBeVisible({ timeout: 1000 });
    } catch {
      // Loading was too fast to catch, that's okay
    }
    
    await expect(loadingElement).toBeHidden({ timeout: 10000 });
  }

  /**
   * Clear any existing messages or notifications
   */
  protected async clearMessages(): Promise<void> {
    const messages = this.page.getByTestId(/^message-/);
    const count = await messages.count();
    
    for (let i = 0; i < count; i++) {
      const message = messages.nth(i);
      const closeButton = message.getByTestId('message-close');
      
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  }

  /**
   * Wait for a specific element to appear with retry logic
   */
  protected async waitForElement(testId: string, timeout = 10000): Promise<Locator> {
    const element = this.page.getByTestId(testId);
    await expect(element).toBeVisible({ timeout });
    return element;
  }

  /**
   * Get element by test ID with better error messages
   */
  public getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Fill form field and verify it was filled
   */
  protected async fillFormField(testId: string, value: string): Promise<void> {
    const field = this.getByTestId(testId);
    await field.fill(value);
    await expect(field).toHaveValue(value);
  }

  /**
   * Click element and wait for navigation or action to complete
   */
  protected async clickAndWait(testId: string, waitForNavigation = false): Promise<void> {
    const element = this.getByTestId(testId);
    
    if (waitForNavigation) {
      await Promise.all([
        this.page.waitForURL('**'),
        element.click(),
      ]);
    } else {
      await element.click();
      await this.page.waitForTimeout(100); // Brief pause for UI updates
    }
  }

  /**
   * Verify page title and URL
   */
  protected async verifyPageIdentity(expectedTitle: RegExp | string, expectedUrl?: RegExp | string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle);
    
    if (expectedUrl) {
      await expect(this.page).toHaveURL(expectedUrl);
    }
  }

  /**
   * Take screenshot with descriptive name
   */
  protected async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Verify responsive behavior by testing different viewport sizes
   */
  protected async testResponsive(testFn: () => Promise<void>): Promise<void> {
    const viewports = [
      { width: 320, height: 568 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1280, height: 720 }, // Desktop
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await testFn();
    }
  }

  /**
   * Wait for and verify specific data attribute
   */
  protected async verifyDataAttribute(testId: string, attribute: string, expectedValue: string): Promise<void> {
    const element = this.getByTestId(testId);
    await expect(element).toHaveAttribute(`data-${attribute}`, expectedValue);
  }

  /**
   * Verify element count matches expected
   */
  protected async verifyElementCount(testIdPattern: string | RegExp, expectedCount: number): Promise<void> {
    const elements = this.page.getByTestId(testIdPattern);
    await expect(elements).toHaveCount(expectedCount);
  }

  /**
   * Abstract method for page navigation - must be implemented by subclasses
   */
  abstract navigateTo(): Promise<void>;

  /**
   * Abstract method for page verification - must be implemented by subclasses
   */
  abstract verifyPageLoaded(): Promise<void>;

  // Public methods to provide access to page functionality without exposing protected page property
  
  /**
   * Get the current page URL
   */
  public getPageUrl(): string {
    return this.page.url();
  }

  /**
   * Get the current viewport size
   */
  public async getViewportSize(): Promise<{ width: number; height: number } | null> {
    return this.page.viewportSize();
  }

  /**
   * Set the viewport size
   */
  public async setViewportSize(size: { width: number; height: number }): Promise<void> {
    await this.page.setViewportSize(size);
  }

  /**
   * Wait for a specific timeout
   */
  public async waitForTimeout(timeout: number): Promise<void> {
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Focus on an element by test ID
   */
  public async focusElement(testId: string): Promise<void> {
    const element = this.getByTestId(testId);
    await element.focus();
  }

  /**
   * Press a key on the keyboard
   */
  public async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Evaluate JavaScript in the browser context
   */
  public async evaluate<T>(pageFunction: () => T): Promise<T> {
    return this.page.evaluate(pageFunction);
  }

  /**
   * Get all elements matching a pattern (more flexible than getByTestId)
   */
  public getElementByTestIdPattern(pattern: RegExp | string): Locator {
    return this.page.getByTestId(pattern);
  }

  /**
   * Get element by locator string for more complex selectors
   */
  public getElementBySelector(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Mouse operations
   */
  public async mouseMove(x: number, y: number): Promise<void> {
    await this.page.mouse.move(x, y);
  }

  public async mouseDown(): Promise<void> {
    await this.page.mouse.down();
  }

  public async mouseUp(): Promise<void> {
    await this.page.mouse.up();
  }

  /**
   * Wait for URL to match pattern
   */
  public async waitForUrl(url: string | RegExp, options?: { timeout?: number }): Promise<void> {
    await this.page.waitForURL(url, options);
  }

  /**
   * Get bounding box of an element
   */
  public async getElementBoundingBox(testId: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const element = this.getByTestId(testId);
    return element.boundingBox();
  }

  /**
   * Get the underlying page object for advanced operations
   * Use sparingly - prefer using the public methods above
   */
  public getPage(): Page {
    return this.page;
  }
}
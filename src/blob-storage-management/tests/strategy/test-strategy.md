# Test Strategy: Azure Storage Explorer Web Application

## Executive Summary

This document outlines the comprehensive testing strategy for the Azure Storage Explorer web application built with Next.js 15, React Server Components (RSC), and Server Actions architecture. The strategy follows Test-Driven Development (TDD) London School principles with focus on behavior-driven testing and proper test categorization for efficient development workflows.

## Architecture Context

### Application Architecture
- **Next.js 15.5.2** with App Router
- **100% React Server Components** for data fetching (direct Azure SDK calls)
- **Server Actions only** for mutations (zero API routes)
- **shadcn/ui** components with Tailwind CSS
- **Direct Azure Storage SDK** integration in server components

### Key Testing Challenge: RSC + Server Actions
This architecture presents unique testing challenges:
- Server Components execute on the server with direct Azure SDK calls
- Server Actions handle all mutations without API routes
- No traditional API boundaries to mock
- Need to test server-side behavior from client-side tests

## Test Categories & Organization

### Test Categorization System

#### @happy-path
**Purpose**: Critical functionality tests that must always pass
**Criteria**: Core user flows, essential features, basic functionality
**Frequency**: Every development cycle, before commits, CI/CD
**Performance**: Fast execution, minimal setup

**Examples**:
- User can view dashboard metrics
- User can list containers
- User can upload small files
- User can download files
- Basic navigation works

#### @extended-happy-path
**Purpose**: Important tests for major changes and integrations  
**Criteria**: Advanced features, component integrations, complex workflows
**Frequency**: Before significant commits, during feature development
**Performance**: Moderate execution time, reasonable setup

**Examples**:
- Multi-step upload workflows
- Container management with validation
- Blob metadata operations
- Search and filtering functionality
- Complex UI interactions

#### @not-so-happy-path
**Purpose**: Error handling, edge cases, user mistake scenarios
**Criteria**: Error scenarios, boundary conditions, invalid input handling
**Frequency**: Before releases, during error handling development
**Performance**: Variable execution time, complex error setup

**Examples**:
- Invalid file uploads
- Network failure handling
- Malformed container names
- Azure service errors
- Authentication failures

#### @performance
**Purpose**: Performance validation and large dataset testing
**Criteria**: Performance benchmarks, memory validation, stress testing
**Frequency**: Before releases, performance optimization phases
**Performance**: Slow execution, resource intensive

**Examples**:
- Large file uploads (>100MB)
- Bulk operations on many containers
- Virtual scrolling with 1000+ items
- Memory leak detection
- Concurrent operations stress tests

## Testing Strategy by Layer

### 1. Server Component Testing

**Challenge**: Server Components execute server-side with direct Azure SDK calls
**Solution**: Mock Azure SDK at the service layer, test rendered output

```typescript
// Test approach for Server Components
describe('Dashboard Server Component @happy-path', () => {
  test('renders storage metrics correctly', async () => {
    // Mock Azure SDK responses
    mockAzureStorageService.getStorageMetrics.mockResolvedValue({
      containerCount: 5,
      blobCount: 25,
      totalSize: '1.2GB'
    });

    // Test server component by navigating to page
    await page.goto('/dashboard');
    
    // Verify rendered metrics
    await expect(page.getByTestId('metric-container-count')).toContainText('5');
    await expect(page.getByTestId('metric-blob-count')).toContainText('25');
    await expect(page.getByTestId('metric-total-size')).toContainText('1.2GB');
  });
});
```

### 2. Server Action Testing

**Challenge**: Server Actions handle mutations without API routes
**Solution**: Test through form submissions and action invocations

```typescript
// Test approach for Server Actions
describe('Container Management Actions @happy-path', () => {
  test('creates container through server action', async () => {
    await page.goto('/containers');
    
    // Fill form that will trigger server action
    await page.getByTestId('form-create-container-name').fill('test-container');
    await page.getByTestId('button-create-container').click();
    
    // Verify success state and UI update
    await expect(page.getByTestId('message-success-container')).toBeVisible();
    await expect(page.getByTestId('container-test-container')).toBeVisible();
  });
});
```

### 3. Integration Testing

**Focus**: End-to-end user journeys across RSC and Server Actions
**Approach**: Full browser automation testing complete workflows

## Page Object Architecture

### Base Page Helper Pattern

```typescript
// Base class for all page helpers
export abstract class BasePageHelper {
  constructor(protected page: Page) {}
  
  protected async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
  
  protected async expectSuccess(message: string) {
    await expect(this.page.getByTestId('message-success')).toContainText(message);
  }
  
  protected async expectError(message: string) {
    await expect(this.page.getByTestId('message-error')).toContainText(message);
  }
}
```

### Dashboard Page Helper

```typescript
export class DashboardPageHelper extends BasePageHelper {
  async navigateTo() {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }
  
  async getStorageMetrics(): Promise<StorageMetrics> {
    return {
      containerCount: await this.page.getByTestId('metric-container-count').textContent(),
      blobCount: await this.page.getByTestId('metric-blob-count').textContent(),
      totalSize: await this.page.getByTestId('metric-total-size').textContent(),
    };
  }
  
  async verifyMetricsVisible() {
    await expect(this.page.getByTestId('metrics-cards')).toBeVisible();
    await expect(this.page.getByTestId('metric-container-count')).toBeVisible();
    await expect(this.page.getByTestId('metric-blob-count')).toBeVisible();
    await expect(this.page.getByTestId('metric-total-size')).toBeVisible();
  }
}
```

### Container Management Helper

```typescript
export class ContainerPageHelper extends BasePageHelper {
  async navigateTo() {
    await this.page.goto('/containers');
    await this.waitForPageLoad();
  }
  
  async createContainer(name: string) {
    await this.page.getByTestId('button-create-container').click();
    await this.page.getByTestId('form-create-container-name').fill(name);
    await this.page.getByTestId('form-create-container-submit').click();
    await this.expectSuccess(`Container ${name} created`);
  }
  
  async deleteContainer(name: string) {
    await this.page.getByTestId(`container-${name}-delete`).click();
    await this.page.getByTestId('dialog-delete-confirm').click();
    await this.expectSuccess(`Container ${name} deleted`);
  }
  
  async searchContainers(term: string) {
    await this.page.getByTestId('search-containers').fill(term);
    await this.page.waitForTimeout(300); // Debounce
  }
  
  async verifyContainerExists(name: string) {
    await expect(this.page.getByTestId(`container-${name}`)).toBeVisible();
  }
  
  async verifyContainerCount(count: number) {
    const containers = this.page.getByTestId(/^container-/);
    await expect(containers).toHaveCount(count);
  }
}
```

### Blob Management Helper

```typescript
export class BlobPageHelper extends BasePageHelper {
  constructor(page: Page, private containerName: string) {
    super(page);
  }
  
  async navigateTo() {
    await this.page.goto(`/containers/${this.containerName}`);
    await this.waitForPageLoad();
  }
  
  async uploadFile(filePath: string, fileName?: string) {
    const fileInput = this.page.getByTestId('form-upload-file');
    await fileInput.setInputFiles(filePath);
    
    if (fileName) {
      await this.page.getByTestId('form-upload-name').fill(fileName);
    }
    
    await this.page.getByTestId('button-upload-submit').click();
    await this.expectSuccess('File uploaded successfully');
  }
  
  async downloadFile(blobName: string) {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByTestId(`blob-${blobName}-download`).click();
    const download = await downloadPromise;
    return download;
  }
  
  async deleteFile(blobName: string) {
    await this.page.getByTestId(`blob-${blobName}-delete`).click();
    await this.page.getByTestId('dialog-delete-confirm').click();
    await this.expectSuccess(`File ${blobName} deleted`);
  }
  
  async verifyFileExists(blobName: string) {
    await expect(this.page.getByTestId(`blob-${blobName}`)).toBeVisible();
  }
  
  async verifyFileCount(count: number) {
    const blobs = this.page.getByTestId(/^blob-/);
    await expect(blobs).toHaveCount(count);
  }
  
  async searchFiles(term: string) {
    await this.page.getByTestId('search-blobs').fill(term);
    await this.page.waitForTimeout(300); // Debounce
  }
}
```

## Azure Storage SDK Mocking Strategy

### Mock Service Layer

```typescript
// Mock implementation for Azure Storage operations
export class MockAzureStorageService {
  private containers: Map<string, ContainerItem> = new Map();
  private blobs: Map<string, Map<string, BlobItem>> = new Map();
  
  async listContainers(): Promise<ContainerItem[]> {
    return Array.from(this.containers.values());
  }
  
  async createContainer(name: string): Promise<void> {
    if (this.containers.has(name)) {
      throw new Error('Container already exists');
    }
    this.containers.set(name, {
      name,
      properties: { lastModified: new Date() },
      metadata: {}
    });
  }
  
  async deleteContainer(name: string): Promise<void> {
    if (!this.containers.has(name)) {
      throw new Error('Container not found');
    }
    this.containers.delete(name);
    this.blobs.delete(name);
  }
  
  async listBlobs(containerName: string): Promise<BlobItem[]> {
    const containerBlobs = this.blobs.get(containerName);
    return containerBlobs ? Array.from(containerBlobs.values()) : [];
  }
  
  async uploadBlob(containerName: string, blobName: string, content: Buffer): Promise<void> {
    if (!this.containers.has(containerName)) {
      throw new Error('Container not found');
    }
    
    let containerBlobs = this.blobs.get(containerName);
    if (!containerBlobs) {
      containerBlobs = new Map();
      this.blobs.set(containerName, containerBlobs);
    }
    
    containerBlobs.set(blobName, {
      name: blobName,
      properties: {
        contentLength: content.length,
        lastModified: new Date(),
        contentType: 'application/octet-stream'
      }
    });
  }
}
```

### Test Environment Setup

```typescript
// Global test setup for mocking Azure SDK
export class TestEnvironment {
  static mockAzureService: MockAzureStorageService;
  
  static async setup() {
    this.mockAzureService = new MockAzureStorageService();
    
    // Mock Azure SDK imports
    vi.mock('@azure/storage-blob', () => ({
      BlobServiceClient: {
        fromConnectionString: () => this.mockAzureService
      }
    }));
    
    // Setup test data
    await this.seedTestData();
  }
  
  static async seedTestData() {
    // Create test containers
    await this.mockAzureService.createContainer('documents');
    await this.mockAzureService.createContainer('images');
    await this.mockAzureService.createContainer('backups');
    
    // Create test blobs
    await this.mockAzureService.uploadBlob('documents', 'test.pdf', Buffer.from('PDF content'));
    await this.mockAzureService.uploadBlob('images', 'photo.jpg', Buffer.from('JPG content'));
  }
  
  static async reset() {
    await this.mockAzureService.clear();
    await this.seedTestData();
  }
}
```

## Test Data & Fixtures

### Test Data Factory

```typescript
export class TestDataFactory {
  static createContainer(overrides?: Partial<ContainerItem>): ContainerItem {
    return {
      name: faker.lorem.slug(),
      properties: {
        lastModified: faker.date.recent(),
        etag: faker.string.uuid(),
        leaseStatus: 'unlocked',
        leaseState: 'available',
        publicAccess: 'none'
      },
      metadata: {},
      ...overrides
    };
  }
  
  static createBlob(overrides?: Partial<BlobItem>): BlobItem {
    return {
      name: faker.system.fileName(),
      properties: {
        contentLength: faker.number.int({ min: 1024, max: 1024 * 1024 }),
        lastModified: faker.date.recent(),
        etag: faker.string.uuid(),
        contentType: faker.system.mimeType(),
        blobType: 'BlockBlob',
        accessTier: 'Hot',
        leaseStatus: 'unlocked',
        leaseState: 'available'
      },
      metadata: {},
      ...overrides
    };
  }
  
  static createStorageMetrics(overrides?: Partial<StorageMetrics>): StorageMetrics {
    return {
      containerCount: faker.number.int({ min: 0, max: 50 }),
      blobCount: faker.number.int({ min: 0, max: 1000 }),
      totalSize: faker.number.int({ min: 0, max: 1024 * 1024 * 1024 }),
      usedCapacity: faker.number.int({ min: 0, max: 100 }),
      ...overrides
    };
  }
}
```

### File Fixtures

```typescript
export class FileFixtures {
  static readonly SMALL_TEXT_FILE = {
    path: 'fixtures/small-text.txt',
    name: 'small-text.txt',
    size: 1024,
    type: 'text/plain'
  };
  
  static readonly MEDIUM_IMAGE_FILE = {
    path: 'fixtures/medium-image.jpg',
    name: 'medium-image.jpg', 
    size: 512 * 1024,
    type: 'image/jpeg'
  };
  
  static readonly LARGE_BINARY_FILE = {
    path: 'fixtures/large-binary.bin',
    name: 'large-binary.bin',
    size: 10 * 1024 * 1024,
    type: 'application/octet-stream'
  };
  
  static async createTestFile(fixture: typeof FileFixtures.SMALL_TEXT_FILE): Promise<string> {
    const filePath = path.join(process.cwd(), 'tests', fixture.path);
    
    if (!fs.existsSync(filePath)) {
      const content = fixture.type.startsWith('text/') 
        ? faker.lorem.paragraphs(Math.ceil(fixture.size / 100))
        : Buffer.alloc(fixture.size, 0);
        
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, content);
    }
    
    return filePath;
  }
}
```

## Test Execution Strategy

### Test Categories & Commands

```bash
# Run critical functionality tests (fast feedback)
npm run test:happy-path

# Run comprehensive feature tests  
npm run test:extended

# Run error scenario tests
npm run test:error-scenarios

# Run performance tests
npm run test:performance

# Run all tests
npm run test:all

# Run tests in watch mode during development
npm run test:watch
```

### Parallel Execution Strategy

```typescript
// playwright.config.ts - Category-based test runners
export default defineConfig({
  projects: [
    {
      name: 'happy-path',
      testMatch: '**/*.@(spec|test).ts',
      grep: /@happy-path/,
      workers: 4,
      timeout: 30000
    },
    {
      name: 'extended-happy-path', 
      testMatch: '**/*.@(spec|test).ts',
      grep: /@extended-happy-path/,
      workers: 2,
      timeout: 60000
    },
    {
      name: 'error-scenarios',
      testMatch: '**/*.@(spec|test).ts', 
      grep: /@not-so-happy-path/,
      workers: 2,
      timeout: 45000
    },
    {
      name: 'performance',
      testMatch: '**/*.@(spec|test).ts',
      grep: /@performance/,
      workers: 1,
      timeout: 300000
    }
  ]
});
```

## Development Workflow Integration

### TDD Workflow with Categories

1. **Red Phase**: Write failing test with appropriate category
   - Start with `@happy-path` for core functionality
   - Use `@extended-happy-path` for complex features
   - Add `@not-so-happy-path` for error handling
   - Include `@performance` for performance requirements

2. **Green Phase**: Implement minimum code to pass test
   - Focus on making the specific test pass
   - Run only relevant test category for fast feedback

3. **Refactor Phase**: Improve code while maintaining tests
   - Run full test suite to ensure no regressions
   - Update test categories if functionality scope changes

### Continuous Integration Strategy

```yaml
# CI Pipeline with tiered testing
stages:
  - fast-feedback:    # @happy-path tests (< 2 minutes)
      - pull_request: always
      - push: main branch
      
  - comprehensive:    # @extended-happy-path tests (< 10 minutes)  
      - pull_request: after fast-feedback passes
      - push: main branch
      
  - validation:       # @not-so-happy-path tests (< 15 minutes)
      - pull_request: before merge
      - scheduled: nightly
      
  - performance:      # @performance tests (< 30 minutes)
      - scheduled: nightly
      - release: before production deployment
```

## Risk Mitigation

### Known Risks & Mitigations

1. **Server Component Testing Complexity**
   - Risk: Difficult to test RSC in isolation
   - Mitigation: Full-page testing with Azure SDK mocking

2. **Server Action State Management**
   - Risk: Complex state transitions in Server Actions
   - Mitigation: Comprehensive form testing with state verification

3. **Azure SDK Dependency** 
   - Risk: Tests dependent on external service
   - Mitigation: Complete mock service layer with realistic behavior

4. **Performance Test Reliability**
   - Risk: Performance tests may be flaky
   - Mitigation: Statistical analysis, multiple runs, controlled environment

5. **Test Maintenance Overhead**
   - Risk: Page object maintenance as UI evolves
   - Mitigation: Strong data-testid strategy, automated test updates

## Success Metrics

### Test Quality Metrics

- **Test Coverage**: > 90% line coverage for business logic
- **Test Stability**: < 1% flaky test rate across all categories
- **Test Performance**: 
  - @happy-path: < 2 minutes total execution
  - @extended-happy-path: < 10 minutes total execution
  - @not-so-happy-path: < 15 minutes total execution
  - @performance: < 30 minutes total execution

### Development Velocity Metrics

- **Fast Feedback**: @happy-path tests provide feedback within 30 seconds
- **Bug Detection**: Tests catch > 95% of regressions before production
- **Development Confidence**: Developers can refactor without fear

## Conclusion

This test strategy provides a comprehensive approach to testing the Azure Storage Explorer application's unique RSC + Server Actions architecture. The categorized approach ensures efficient development workflows while maintaining high quality standards. The focus on page object patterns and proper mocking strategies will enable reliable, maintainable tests that serve as living documentation of the system's behavior.

The strategy emphasizes behavior-driven testing over implementation details, ensuring tests remain valuable as the codebase evolves. By following TDD principles and proper categorization, the development team can maintain velocity while building a robust, well-tested application.
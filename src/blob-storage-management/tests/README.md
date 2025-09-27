# Azure Storage Explorer Test Suite

Comprehensive end-to-end testing for the Azure Storage Explorer web application built with Next.js 15, React Server Components, and Server Actions.

## 🏗️ Test Architecture

This test suite follows Test-Driven Development (TDD) principles with the London School approach, using Playwright for browser automation and comprehensive mocking of Azure Storage services.

### Test Categories

Our tests are organized into four categories for efficient development workflows:

#### @happy-path
**Purpose**: Critical functionality tests that must always pass  
**Run frequency**: Every development cycle, before commits, CI/CD  
**Performance**: Fast execution (< 2 minutes total)

- Core user flows
- Essential features  
- Basic functionality
- Authentication
- File upload/download
- Container creation/deletion

#### @extended-happy-path
**Purpose**: Important tests for major changes and integrations  
**Run frequency**: Before significant commits, during feature development  
**Performance**: Moderate execution time (< 10 minutes total)

- Advanced features
- Component integrations
- Complex user workflows
- API validations
- Search and filtering
- Bulk operations

#### @not-so-happy-path
**Purpose**: Error handling, edge cases, and user mistake scenarios  
**Run frequency**: Before releases, during error handling development  
**Performance**: Variable execution time (< 15 minutes total)

- Error scenarios
- Edge cases
- Invalid input handling
- Network failures
- Malformed data
- Boundary conditions

#### @performance
**Purpose**: Performance validation and large dataset testing  
**Run frequency**: Before releases, performance optimization phases  
**Performance**: Slower execution, resource intensive (< 30 minutes total)

- Large file uploads/downloads
- Bulk operations
- Virtual scrolling
- Memory leak detection
- Concurrent operations

## 📁 File Structure

```
tests/
├── specs/                      # Test specifications
│   ├── dashboard.spec.ts       # Dashboard functionality tests
│   ├── containers.spec.ts      # Container management tests
│   ├── blobs.spec.ts          # Blob operations tests
│   ├── accessibility.spec.ts  # WCAG 2.1 AA compliance tests
│   └── responsive.spec.ts     # Mobile/desktop responsive tests
├── page-objects/              # Page helper classes
│   ├── base-page.ts          # Base page functionality
│   ├── dashboard-page.ts     # Dashboard page helper
│   ├── container-page.ts     # Container page helper
│   └── blob-page.ts          # Blob page helper
├── mocks/                    # Mock implementations
│   └── azure-storage-service.ts  # Azure Storage SDK mock
├── fixtures/                 # Test fixtures and helpers
│   ├── playwright-fixtures.ts    # Custom Playwright fixtures
│   ├── test-data-factory.ts     # Test data generation
│   └── test-helpers.ts          # Utility functions
├── setup/                    # Global test configuration
│   ├── global-setup.ts       # Pre-test initialization
│   └── global-teardown.ts    # Post-test cleanup
├── types/                    # TypeScript definitions
│   └── azure-types.ts        # Azure Storage type definitions
└── run-tests.ts             # Test runner utility
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Next.js development server running on localhost:3000

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Check test setup
npm run test:check
```

### Running Tests

```bash
# Run all tests by category
npm run test:happy-path          # Core functionality (fast)
npm run test:extended            # Advanced features
npm run test:error-scenarios     # Error handling
npm run test:performance         # Performance tests

# Run specific test files
npm run test:accessibility       # WCAG compliance tests
npm run test:responsive         # Responsive design tests

# Interactive testing
npm run test:ui                 # Playwright UI mode
npm run test:debug              # Debug mode

# Generate reports
npm test                        # Run all tests with HTML report
npm run test:report             # View last test report
```

### Test Runner Utility

```bash
# Comprehensive test validation
npm run test:validate

# Check test file structure and dependencies
npm run test:check

# Run with custom options
npx ts-node tests/run-tests.ts run happy-path --headed --browser=firefox
```

## 🧪 Test Implementation Patterns

### Page Helper Pattern

Each page has a dedicated helper class that encapsulates user interactions:

```typescript
// Example: ContainerPageHelper
export class ContainerPageHelper extends BasePageHelper {
  async createContainer(name: string): Promise<void> {
    await this.clickAndWait('button-create-container');
    await this.fillFormField('form-create-container-name', name);
    await this.clickAndWait('form-create-container-submit');
    await this.expectSuccess(`Container "${name}" created successfully`);
  }
  
  async verifyContainerExists(name: string): Promise<void> {
    const container = this.getByTestId(`container-${name}`);
    await expect(container).toBeVisible();
  }
}
```

### Test Data Factory

Generates realistic test data using Faker.js:

```typescript
// Example: Creating test containers
const containers = TestDataFactory.createContainers(5, [
  { name: 'documents', metadata: { type: 'documents' } },
  { name: 'images', metadata: { type: 'images' } }
]);
```

### Azure Storage Mocking

Complete mock implementation that mimics Azure Storage SDK behavior:

```typescript
// Example: Mock service usage
const mockService = MockAzureStorageService.getInstance();
await mockService.createContainer('test-container');
await mockService.uploadBlob('test-container', 'file.txt', Buffer.from('content'));

// Error simulation
mockService.enableErrorSimulation(0.3); // 30% error rate
mockService.setNetworkDelay(2000);       // 2 second delays
```

## 📋 Test Specification Examples

### Happy Path Test

```typescript
/**
 * Basic container creation functionality
 * @happy-path
 */
test('creates new container successfully', async ({ containerPage }) => {
  await containerPage.navigateTo();
  await containerPage.createContainer('new-test-container');
  await containerPage.verifyContainerExists('new-test-container');
  await containerPage.verifyContainerCount(1);
});
```

### Extended Happy Path Test

```typescript
/**
 * Container sorting and filtering
 * @extended-happy-path
 */
test('sorts containers by different criteria', async ({ containerPage }) => {
  await containerPage.navigateTo();
  
  await containerPage.sortContainers('name', 'asc');
  const nameAscContainers = await containerPage.getContainerList();
  
  await containerPage.sortContainers('name', 'desc');
  const nameDescContainers = await containerPage.getContainerList();
  
  expect(nameAscContainers[0].name).not.toBe(nameDescContainers[0].name);
});
```

### Error Scenario Test

```typescript
/**
 * Container name validation
 * @not-so-happy-path
 */
test('validates container names correctly', async ({ containerPage }) => {
  await containerPage.navigateTo();
  
  const invalidNames = ['', 'UPPERCASE', 'invalid..name'];
  
  for (const invalidName of invalidNames) {
    await containerPage.verifyContainerNameValidation(
      invalidName,
      'Container name is invalid'
    );
  }
});
```

### Performance Test

```typescript
/**
 * Large container list performance
 * @performance
 */
test('handles large container lists efficiently', async ({ containerPage }) => {
  // Create 200 containers
  for (let i = 1; i <= 200; i++) {
    await mockService.createContainer(`perf-container-${i}`);
  }

  const startTime = Date.now();
  await containerPage.navigateTo();
  await containerPage.verifyPageLoaded();
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
});
```

## ♿ Accessibility Testing

Tests ensure WCAG 2.1 AA compliance:

- **Keyboard Navigation**: Tab order, Enter/Space activation
- **Screen Reader Support**: ARIA labels, roles, live regions
- **Focus Management**: Visible focus indicators, focus trapping
- **Color Contrast**: Sufficient contrast ratios
- **Alternative Text**: Images, icons, complex content

```typescript
test('supports keyboard navigation on dashboard', async () => {
  // Test Tab navigation through interactive elements
  const keyElements = ['search-input', 'nav-containers', 'create-button'];
  
  await dashboardPage.page.getByTestId(keyElements[0]).focus();
  
  for (let i = 1; i < keyElements.length; i++) {
    await dashboardPage.page.keyboard.press('Tab');
    // Verify focus moved to expected element
  }
});
```

## 📱 Responsive Design Testing

Tests across multiple viewport sizes:

- **Mobile**: 320px - 768px (touch optimizations)
- **Tablet**: 768px - 1024px (hybrid layouts)  
- **Desktop**: 1024px+ (full feature set)

```typescript
test('adapts layout for mobile screens', async () => {
  await TestHelpers.testResponsiveDesign(
    page,
    async () => {
      await dashboardPage.navigateTo();
      await dashboardPage.verifyPageLoaded();
      
      // Verify mobile-specific adaptations
      const mobileNav = page.getByTestId('mobile-nav-menu');
      const viewport = page.viewportSize();
      
      if (viewport && viewport.width < 768) {
        await expect(mobileNav).toBeVisible();
      }
    },
    [
      { width: 320, height: 568, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 720, name: 'desktop' }
    ]
  );
});
```

## 🔧 Custom Fixtures

Pre-configured test environments:

```typescript
// Basic fixtures
test('basic test', async ({ dashboardPage, containerPage, mockService }) => {
  // dashboardPage, containerPage, and mockService are pre-configured
});

// With comprehensive test data
testWithData('data-heavy test', async ({ dashboardPage, testDataLoaded }) => {
  // 5 containers with 8 blobs each already created
});

// With performance data
testWithPerformanceData('perf test', async ({ containerPage }) => {
  // 20 containers with 50 blobs each already created
});

// With error simulation
testWithErrors('error test', async ({ mockService, errorControls }) => {
  errorControls.enableSomeErrors(); // 30% error rate
});
```

## 📊 Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Start Next.js server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000
        
      - name: Run happy path tests
        run: npm run test:happy-path
        
      - name: Run extended tests (on main branch)
        if: github.ref == 'refs/heads/main'
        run: npm run test:extended
        
      - name: Run error scenario tests (nightly)
        if: github.event_name == 'schedule'
        run: npm run test:error-scenarios
        
      - name: Upload test reports
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 🐛 Debugging Tests

### Common Issues

1. **Element not found**: Check data-testid attributes match
2. **Timeout errors**: Verify loading states and increase timeouts
3. **Network errors**: Check mock service configuration
4. **Flaky tests**: Add proper wait conditions

### Debug Strategies

```bash
# Run in debug mode (pauses execution)
npm run test:debug

# Run with browser UI visible
npx playwright test --headed

# Record test execution
npx playwright codegen localhost:3000

# Generate trace files
npx playwright test --trace on

# View trace files
npx playwright show-trace trace.zip
```

### Mock Service Debugging

```typescript
// Enable detailed logging
mockService.enableLogging(true);

// Check service state
console.log('Containers:', mockService.getContainerCount());
console.log('Blobs:', mockService.getBlobCount());

// Verify data exists
expect(mockService.hasContainer('test-container')).toBe(true);
expect(mockService.hasBlob('container', 'blob.txt')).toBe(true);
```

## 📈 Performance Optimization

### Test Execution Speed

- **Parallel execution**: Tests run in parallel by category
- **Smart retries**: Automatic retry for network-related failures
- **Resource cleanup**: Efficient teardown prevents memory leaks
- **Mock optimization**: In-memory mocks avoid I/O overhead

### CI/CD Optimization

```bash
# Fast feedback loop (< 2 minutes)
npm run test:happy-path

# Comprehensive validation (< 15 minutes)
npm run test:validate

# Full regression testing (< 30 minutes)
npm test
```

## 🔮 Future Enhancements

- **Visual regression testing** with Percy or Chromatic
- **API contract testing** with Pact
- **Performance monitoring** integration
- **Cross-browser testing** automation
- **Test data seeding** from production snapshots

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Azure Storage SDK](https://docs.microsoft.com/en-us/javascript/api/@azure/storage-blob/)

## 🤝 Contributing

1. Follow the established page helper pattern
2. Include proper test categorization (@happy-path, etc.)
3. Add data-testid attributes for reliable element selection
4. Write tests that read like user stories
5. Include both positive and negative test cases
6. Consider accessibility and responsive design
7. Update documentation for new test patterns

## 📄 License

This test suite is part of the Azure Storage Explorer project and follows the same licensing terms.
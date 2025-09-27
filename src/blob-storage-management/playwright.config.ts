import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Azure Storage Explorer
 * Optimized for Next.js 15 App Router with React Server Components
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test categories with different configurations
  projects: [
    {
      name: 'happy-path',
      testMatch: '**/*.@(spec|test).ts',
      grep: /@happy-path/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      timeout: 30000,
      workers: 4,
      retries: 1,
    },
    {
      name: 'extended-happy-path',
      testMatch: '**/*.@(spec|test).ts',
      grep: /@extended-happy-path/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      timeout: 60000,
      workers: 2,
      retries: 2,
    },
    {
      name: 'error-scenarios',
      testMatch: '**/*.@(spec|test).ts',
      grep: /@not-so-happy-path/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      timeout: 45000,
      workers: 2,
      retries: 2,
    },
    {
      name: 'performance',
      testMatch: '**/*.@(spec|test).ts',
      grep: /@performance/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      timeout: 300000,  // 5 minutes for performance tests
      workers: 1,       // Serial execution for accurate performance measurement
      retries: 0,       // No retries for performance tests
    },
    {
      name: 'mobile-chrome',
      testMatch: '**/*.@(spec|test).ts',
      grep: /@happy-path|@extended-happy-path/,
      use: {
        ...devices['Pixel 5'],
      },
      timeout: 45000,
      workers: 2,
    },
    {
      name: 'mobile-safari',
      testMatch: '**/*.@(spec|test).ts', 
      grep: /@happy-path|@extended-happy-path/,
      use: {
        ...devices['iPhone 12'],
      },
      timeout: 45000,
      workers: 2,
    },
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),

  // Web server configuration for Next.js
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      // Test-specific environment variables
      AZURE_STORAGE_CONNECTION_STRING: 'UseDevelopmentStorage=true',
      NODE_ENV: 'test',
      NEXT_PUBLIC_TEST_MODE: 'true',
    },
  },

  // Output directories
  outputDir: 'test-results/',
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.@(spec|test).@(js|ts|jsx|tsx)',
    '**/tests/**/__tests__/**/*.@(js|ts|jsx|tsx)',
  ],

  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
  ],

  // Expect settings
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      animations: 'disabled',
    },
  },
});
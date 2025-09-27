#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Test runner utility for Azure Storage Explorer tests
 * Provides organized test execution with detailed reporting
 */
class TestRunner {
  private readonly rootDir = process.cwd();
  
  async runTestSuite(category?: string, options: {
    ui?: boolean;
    debug?: boolean;
    reporter?: string;
    headless?: boolean;
    browser?: string;
  } = {}) {
    const {
      ui = false,
      debug = false,
      reporter = 'html',
      headless = true,
      browser = 'chromium'
    } = options;

    console.log('🚀 Azure Storage Explorer Test Runner');
    console.log('=====================================');
    
    if (category) {
      console.log(`Running tests: ${category}`);
    } else {
      console.log('Running all tests');
    }
    
    console.log(`Browser: ${browser}`);
    console.log(`Headless: ${headless}`);
    console.log(`Reporter: ${reporter}`);
    console.log('');

    let command = 'npx playwright test';
    
    // Add category filter
    if (category) {
      command += ` --grep "@${category}"`;
    }
    
    // Add browser
    if (browser !== 'chromium') {
      command += ` --project=${browser}`;
    }
    
    // Add UI mode
    if (ui) {
      command += ' --ui';
    }
    
    // Add debug mode
    if (debug) {
      command += ' --debug';
    }
    
    // Add headless mode
    if (!headless) {
      command += ' --headed';
    }
    
    // Add reporter
    if (reporter && !ui && !debug) {
      command += ` --reporter=${reporter}`;
    }
    
    // Set working directory
    process.chdir(path.join(this.rootDir));
    
    try {
      console.log(`Executing: ${command}`);
      console.log('');
      
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      
      if (stdout) {
        console.log(stdout);
      }
      
      if (stderr) {
        console.error('STDERR:', stderr);
      }
      
      console.log('✅ Tests completed successfully!');
      return true;
      
    } catch (error: any) {
      console.error('❌ Tests failed:');
      console.error(error.stdout || error.message);
      
      if (error.stderr) {
        console.error('STDERR:', error.stderr);
      }
      
      return false;
    }
  }

  async runValidationSuite() {
    console.log('🔍 Running Test Validation Suite');
    console.log('===============================');
    
    const testCategories = [
      'happy-path',
      'extended-happy-path', 
      'not-so-happy-path',
      'performance'
    ];
    
    const results: { category: string; success: boolean; duration: number }[] = [];
    
    for (const category of testCategories) {
      console.log(`\n📋 Testing category: ${category}`);
      console.log('-'.repeat(40));
      
      const startTime = Date.now();
      const success = await this.runTestSuite(category, { 
        headless: true,
        reporter: 'list'
      });
      const duration = Date.now() - startTime;
      
      results.push({ category, success, duration });
      
      if (success) {
        console.log(`✅ ${category}: PASSED (${duration}ms)`);
      } else {
        console.log(`❌ ${category}: FAILED (${duration}ms)`);
      }
    }
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('==============');
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Categories: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = `${Math.round(result.duration / 1000)}s`;
      console.log(`  ${status} ${result.category.padEnd(20)} ${duration.padStart(6)}`);
    });
    
    return passedTests === totalTests;
  }

  async checkTestFiles() {
    console.log('📁 Checking test file structure...');
    
    const expectedFiles = [
      'tests/specs/dashboard.spec.ts',
      'tests/specs/containers.spec.ts', 
      'tests/specs/blobs.spec.ts',
      'tests/specs/accessibility.spec.ts',
      'tests/specs/responsive.spec.ts',
      'tests/page-objects/dashboard-page.ts',
      'tests/page-objects/container-page.ts',
      'tests/page-objects/blob-page.ts',
      'tests/page-objects/base-page.ts',
      'tests/mocks/azure-storage-service.ts',
      'tests/fixtures/playwright-fixtures.ts',
      'tests/fixtures/test-data-factory.ts',
      'tests/fixtures/test-helpers.ts',
      'tests/setup/global-setup.ts',
      'tests/setup/global-teardown.ts',
      'tests/types/azure-types.ts',
      'playwright.config.ts'
    ];
    
    // fs already imported at top
    const missing: string[] = [];
    const existing: string[] = [];
    
    expectedFiles.forEach(file => {
      const filePath = path.join(this.rootDir, file);
      if (fs.existsSync(filePath)) {
        existing.push(file);
      } else {
        missing.push(file);
      }
    });
    
    console.log(`✅ Found ${existing.length} test files`);
    
    if (missing.length > 0) {
      console.log(`❌ Missing ${missing.length} test files:`);
      missing.forEach(file => console.log(`  - ${file}`));
      return false;
    }
    
    return true;
  }

  async installDependencies() {
    console.log('📦 Checking Playwright installation...');
    
    try {
      // Check if Playwright browsers are installed
      const { stdout } = await execAsync('npx playwright --version');
      console.log(`✅ Playwright version: ${stdout.trim()}`);
      
      // Install browsers if needed
      console.log('🌐 Installing Playwright browsers...');
      await execAsync('npx playwright install');
      console.log('✅ Playwright browsers installed');
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to install Playwright:', error.message);
      return false;
    }
  }
}

// CLI Interface
async function main() {
  const runner = new TestRunner();
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const command = args[0] || 'validate';
  const category = args.find(arg => !arg.startsWith('--'))?.replace('--', '');
  const ui = args.includes('--ui');
  const debug = args.includes('--debug');
  const headed = args.includes('--headed');
  const browser = args.find(arg => arg.startsWith('--browser='))?.split('=')[1] || 'chromium';
  
  console.log('Azure Storage Explorer Test Suite');
  console.log('================================');
  
  switch (command) {
    case 'check':
      console.log('🔍 Checking test setup...');
      const filesOk = await runner.checkTestFiles();
      const depsOk = await runner.installDependencies();
      
      if (filesOk && depsOk) {
        console.log('✅ Test setup is complete!');
        process.exit(0);
      } else {
        console.log('❌ Test setup needs attention');
        process.exit(1);
      }
      break;
      
    case 'validate':
      console.log('🧪 Running validation suite...');
      const success = await runner.runValidationSuite();
      process.exit(success ? 0 : 1);
      break;
      
    case 'run':
      const testSuccess = await runner.runTestSuite(category, {
        ui,
        debug,
        headless: !headed,
        browser
      });
      process.exit(testSuccess ? 0 : 1);
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run test-runner check           # Check test setup');
      console.log('  npm run test-runner validate        # Run full validation');
      console.log('  npm run test-runner run [category]  # Run specific tests');
      console.log('');
      console.log('Categories:');
      console.log('  happy-path                # Core functionality tests');
      console.log('  extended-happy-path       # Advanced feature tests');
      console.log('  not-so-happy-path        # Error scenario tests');
      console.log('  performance              # Performance tests');
      console.log('');
      console.log('Options:');
      console.log('  --ui                     # Run in UI mode');
      console.log('  --debug                  # Run in debug mode');
      console.log('  --headed                 # Run with browser UI');
      console.log('  --browser=<name>         # Specify browser (chromium, firefox, webkit)');
      break;
  }
}

// Check if this is the main module for ES modules
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { TestRunner };
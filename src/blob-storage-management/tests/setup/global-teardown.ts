import { FullConfig } from '@playwright/test';
import { MockAzureStorageService } from '../mocks/azure-storage-service';

/**
 * Global test teardown for Azure Storage Explorer tests
 * Cleans up mock services and test environment
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  try {
    // Clean up mock Azure Storage service
    const mockService = MockAzureStorageService.getInstance();
    await mockService.cleanup();
    
    console.log('✅ Mock services cleaned up');
    
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_TEST_MODE;
    
    console.log('✅ Global test teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - we don't want to fail the entire test run
  }
}

export default globalTeardown;
import { chromium, FullConfig } from '@playwright/test';
import { MockAzureStorageService } from '../mocks/azure-storage-service';

/**
 * Global test setup for Azure Storage Explorer tests
 * Initializes mock services and test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Initialize mock Azure Storage service
  const mockService = MockAzureStorageService.getInstance();
  await mockService.initialize();
  
  // Seed initial test data
  await seedTestData(mockService);
  
  // Setup environment variables
  process.env.AZURE_STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
  (process.env as any).NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_TEST_MODE = 'true';
  
  // Verify Next.js server is responsive
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Verifying Next.js server...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Next.js server is responsive');
  } catch (error) {
    console.error('❌ Next.js server verification failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global test setup completed');
}

/**
 * Seeds the mock Azure Storage service with initial test data
 */
async function seedTestData(mockService: MockAzureStorageService) {
  console.log('🌱 Seeding test data...');
  
  try {
    // Create test containers
    await mockService.createContainer('documents', {
      metadata: { description: 'Document storage container' }
    });
    
    await mockService.createContainer('images', {
      metadata: { description: 'Image storage container' }
    });
    
    await mockService.createContainer('backups', {
      metadata: { description: 'Backup files container' }
    });
    
    // Create test blobs
    await mockService.uploadBlob(
      'documents', 
      'sample-document.pdf', 
      Buffer.from('Sample PDF content for testing'),
      {
        blobHTTPHeaders: { blobContentType: 'application/pdf' },
        metadata: { author: 'Test User', category: 'sample' }
      }
    );
    
    await mockService.uploadBlob(
      'documents',
      'readme.txt',
      Buffer.from('This is a readme file for testing purposes.\n\nIt contains multiple lines of text.'),
      {
        blobHTTPHeaders: { blobContentType: 'text/plain' },
        metadata: { category: 'documentation' }
      }
    );
    
    await mockService.uploadBlob(
      'images',
      'test-image.jpg',
      Buffer.from('Fake JPEG content for testing'),
      {
        blobHTTPHeaders: { blobContentType: 'image/jpeg' },
        metadata: { resolution: '1920x1080', camera: 'Test Camera' }
      }
    );
    
    await mockService.uploadBlob(
      'backups',
      'database-backup.sql',
      Buffer.from('-- Database backup file\nSELECT * FROM test_table;'),
      {
        blobHTTPHeaders: { blobContentType: 'application/sql' },
        metadata: { date: new Date().toISOString(), size: 'small' }
      }
    );
    
    console.log('✅ Test data seeded successfully');
    console.log(`   - Created ${mockService.getContainerCount()} containers`);
    console.log(`   - Created ${mockService.getBlobCount()} blobs`);
  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
}

export default globalSetup;
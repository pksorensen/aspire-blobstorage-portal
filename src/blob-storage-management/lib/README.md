# Azure Storage Integration Layer

This directory contains the complete Azure Storage integration layer for the Next.js 15 blob storage management application, built with 100% React Server Components architecture.

## Architecture Overview

The integration layer follows these key principles:

- **Server-First**: All Azure Storage operations run server-side in React Server Components
- **Zero API Routes**: Direct SDK calls from RSCs, no intermediate API layer
- **Server Actions**: All mutations handled via Next.js Server Actions with automatic cache revalidation
- **Type Safety**: Comprehensive TypeScript types with runtime validation
- **Error Handling**: Structured error handling with user-friendly messages
- **Caching**: Smart caching strategy with appropriate TTLs and tag-based invalidation

## File Structure

```
lib/
├── azure-storage.ts      # Core Azure Storage SDK wrapper for RSCs
├── azure-actions.ts      # Server Actions for all mutation operations
├── config.ts            # Configuration management and validation
├── cache.ts             # Caching utilities and strategies
├── utils.ts             # General utility functions
└── README.md            # This documentation

types/
└── azure-types.ts       # Comprehensive TypeScript type definitions
```

## Core Components

### 1. Azure Storage Wrapper (`azure-storage.ts`)

The main service class providing read operations for React Server Components:

**Key Features:**
- Singleton pattern with connection health monitoring
- Automatic retry logic with exponential backoff
- Comprehensive error handling with structured logging
- Smart caching using Next.js `unstable_cache`
- Support for multiple authentication methods
- Batch operations for performance
- Pagination support

**Main Methods:**
```typescript
// Container operations
listContainers(): Promise<ContainerItem[]>
getContainerProperties(name: string): Promise<ContainerItem>
getContainerMetrics(name: string): Promise<ContainerMetrics>
containerExists(name: string): Promise<boolean>

// Blob operations  
listBlobs(container: string, prefix?: string): Promise<BlobItem[]>
getBlobProperties(container: string, blob: string): Promise<BlobItem>
downloadBlob(container: string, blob: string): Promise<BlobDownloadResponse>
blobExists(container: string, blob: string): Promise<boolean>
searchBlobs(container: string, criteria: BlobSearchCriteria): Promise<BlobItem[]>

// Batch operations
batchDeleteBlobs(container: string, blobs: string[]): Promise<BatchDeleteResult>

// Metrics and monitoring
getStorageMetrics(): Promise<StorageMetrics>
getStorageAccountInfo(): Promise<StorageAccountInfo>
getConnectionHealth(): Promise<HealthStatus>
```

### 2. Server Actions (`azure-actions.ts`)

Mutation operations implemented as Next.js Server Actions:

**Key Features:**
- Form data handling with validation using Zod
- Automatic cache invalidation using `revalidatePath()` and `revalidateTag()`
- Structured error handling with request tracking
- File upload validation with size and type constraints
- Batch operations with detailed results
- Performance monitoring with operation timing

**Main Actions:**
```typescript
// Container actions
createContainer(formData: FormData): Promise<ActionResult>
deleteContainer(formData: FormData): Promise<ActionResult>
updateContainerMetadata(formData: FormData): Promise<ActionResult>
setContainerPublicAccess(formData: FormData): Promise<ActionResult>

// Blob actions
uploadBlob(formData: FormData): Promise<ActionResult>
uploadTextBlob(formData: FormData): Promise<ActionResult>  
deleteBlob(formData: FormData): Promise<ActionResult>
copyBlob(formData: FormData): Promise<ActionResult>
updateBlobMetadata(formData: FormData): Promise<ActionResult>
updateBlobTags(formData: FormData): Promise<ActionResult>
setBlobTier(formData: FormData): Promise<ActionResult>

// Batch actions
batchDeleteBlobs(formData: FormData): Promise<ActionResult>
deleteMultipleBlobs(formData: FormData): Promise<ActionResult>

// Utility actions
clearContainerCache(name: string): Promise<ActionResult>
clearAllCaches(): Promise<ActionResult>
```

### 3. Configuration Management (`config.ts`)

Environment variable validation and configuration setup:

**Key Features:**
- Multiple authentication method support (connection string, account key, SAS token)
- Configuration validation with detailed error reporting
- Development environment auto-setup with storage emulator
- Client-safe configuration exposure
- Connection testing utilities

**Main Functions:**
```typescript
validateAzureStorageConfig(): ConfigValidationResult
validateEnvironmentConfig(): EnvironmentConfig
requireValidConfig(): { azureConfig, envConfig }
testConnection(config?: AzureStorageConfig): Promise<ConnectionTest>
setupDevelopmentEnvironment(): void
```

### 4. Type Definitions (`../types/azure-types.ts`)

Comprehensive TypeScript definitions:

**Key Types:**
- `ContainerItem`, `BlobItem` - Core Azure entities
- `StorageMetrics`, `ContainerMetrics` - Analytics data
- `UploadBlobOptions`, `CreateContainerOptions` - Operation parameters
- `ActionResult<T>` - Server Action response type
- `BatchOperationResult` - Batch operation responses
- `AzureStorageError` - Custom error class
- `BlobSearchCriteria` - Advanced search parameters

### 5. Caching Strategy (`cache.ts`)

Smart caching configuration:

**Cache Durations:**
- Blobs: 30 seconds (frequently changing)
- Containers: 60 seconds (moderately changing)
- Storage Metrics: 5 minutes (slowly changing)
- Account Properties: 10 minutes (rarely changing)

**Cache Tags:**
- Global: `containers`, `blobs`, `storage-metrics`
- Specific: `container:${name}`, `blob:${name}`
- Hierarchical: `container-blobs:${containerName}`

## Configuration

### Environment Variables

Create a `.env.local` file with your Azure Storage configuration:

```bash
# Required: Connection string (recommended)
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=your_account;AccountKey=your_key;EndpointSuffix=core.windows.net"

# OR: Account credentials
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key

# Optional: Performance tuning
AZURE_STORAGE_TIMEOUT=30000
AZURE_STORAGE_MAX_RETRIES=3
AZURE_STORAGE_CACHE_TTL=60
AZURE_STORAGE_MAX_UPLOAD_SIZE=104857600
```

### Development Setup

For development with Azure Storage Emulator (Azurite):

```bash
# Install Azurite
npm install -g azurite

# Start emulator
azurite --silent --location ./azurite --debug ./azurite/debug.log

# The integration will auto-detect development mode and use emulator connection string
```

## Usage in React Server Components

### Basic Container Listing

```typescript
// app/containers/page.tsx
import { azureStorage } from '@/lib/azure-storage';

export default async function ContainersPage() {
  const containers = await azureStorage.listContainers();
  
  return (
    <div>
      <h1>Storage Containers</h1>
      {containers.map(container => (
        <ContainerCard key={container.name} container={container} />
      ))}
    </div>
  );
}
```

### Blob Operations with Error Handling

```typescript
// app/containers/[name]/page.tsx
import { azureStorage } from '@/lib/azure-storage';
import { notFound } from 'next/navigation';

export default async function ContainerPage({ params }: { params: { name: string } }) {
  try {
    const [container, blobs] = await Promise.all([
      azureStorage.getContainerProperties(params.name),
      azureStorage.listBlobs(params.name)
    ]);

    return (
      <div>
        <ContainerHeader container={container} />
        <BlobList blobs={blobs} containerName={params.name} />
      </div>
    );
  } catch (error) {
    if (error instanceof AzureStorageError && error.statusCode === 404) {
      notFound();
    }
    throw error; // Re-throw for error boundary
  }
}
```

### Using Server Actions

```typescript
// components/UploadForm.tsx
import { uploadBlob } from '@/lib/azure-actions';

export default function UploadForm({ containerName }: { containerName: string }) {
  return (
    <form action={uploadBlob}>
      <input type="hidden" name="containerName" value={containerName} />
      <input type="file" name="file" required />
      <input type="text" name="blobName" placeholder="Optional: Custom name" />
      <select name="tier" defaultValue="Hot">
        <option value="Hot">Hot</option>
        <option value="Cool">Cool</option>
        <option value="Archive">Archive</option>
      </select>
      <button type="submit">Upload</button>
    </form>
  );
}
```

## Error Handling

The integration provides structured error handling:

```typescript
try {
  const blobs = await azureStorage.listBlobs(containerName);
  return blobs;
} catch (error) {
  if (error instanceof AzureStorageError) {
    // Handle Azure-specific errors
    console.error('Azure error:', error.code, error.message);
    if (error.statusCode === 404) {
      // Handle not found
    } else if (error.statusCode === 403) {
      // Handle access denied
    }
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
  throw error;
}
```

## Performance Considerations

1. **Caching**: All read operations are cached with appropriate TTLs
2. **Batch Operations**: Use batch delete for multiple items
3. **Pagination**: Use paginated methods for large datasets
4. **Connection Pooling**: Singleton client reuses connections
5. **Lazy Loading**: Components load data as needed

## Security

1. **Server-Side Only**: Connection strings never reach the client
2. **Validation**: All inputs validated with Zod schemas
3. **Error Sanitization**: Sensitive info removed from client errors
4. **Access Control**: Configure container public access carefully

## Monitoring and Debugging

Enable debugging in development:

```bash
NODE_ENV=development
AZURE_STORAGE_ENABLE_TELEMETRY=true
```

Monitor operations:
- Connection health checks every 5 minutes
- Operation performance timing
- Cache hit/miss logging in development
- Structured error logging with request IDs

## Testing

The integration includes comprehensive test mocks:

- Mock Azure Storage Service in `tests/mocks/azure-storage-service.ts`
- Test fixtures in `tests/fixtures/`
- Page object models for E2E tests

## Deployment

1. **Environment Variables**: Set production connection strings
2. **Caching**: Ensure Redis or equivalent for Next.js cache
3. **Error Reporting**: Configure error tracking (Sentry, etc.)
4. **Monitoring**: Set up Azure Monitor for storage account metrics

## Troubleshooting

### Common Issues

1. **Missing Connection String**
   - Ensure `AZURE_STORAGE_CONNECTION_STRING` is set
   - Check for typos in environment variable names

2. **Permission Errors**
   - Verify storage account key is correct
   - Check container permissions for public access

3. **Cache Issues**
   - Use `clearAllCaches()` Server Action to reset
   - Check Next.js cache configuration

4. **Upload Failures**
   - Verify file size limits
   - Check allowed file types configuration
   - Ensure container exists before upload

### Debug Mode

Enable comprehensive logging:

```bash
DEBUG=azure:*
NODE_ENV=development
```

This will log all Azure Storage operations, cache hits/misses, and performance metrics.
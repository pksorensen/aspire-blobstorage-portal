# API Reference - Server Actions

Complete documentation for all Server Actions in the Azure Storage Explorer web application. Server Actions handle all mutations (create, update, delete) and provide a secure, server-side interface to Azure Storage.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Container Actions](#container-actions)
3. [Blob Actions](#blob-actions)
4. [Batch Operations](#batch-operations)
5. [Utility Actions](#utility-actions)
6. [Error Handling](#error-handling)
7. [Type Definitions](#type-definitions)

## 🏗️ Architecture Overview

### Server Actions Architecture

This application uses **100% Server Actions** for mutations, with no API routes:

- **Direct Azure SDK Integration** - Server Actions call Azure Storage SDK directly
- **Automatic Cache Revalidation** - Actions automatically invalidate relevant caches
- **Form Data Support** - Actions accept standard HTML form submissions
- **Structured Error Handling** - Consistent error responses with proper logging
- **TypeScript Validation** - Zod schemas for runtime validation

### Authentication & Security

- All Azure credentials remain server-side
- Server Actions run in secure server environment
- Input validation using Zod schemas
- Structured error messages (no sensitive data exposed)
- Request tracking with unique IDs

### Cache Strategy

Server Actions automatically revalidate caches using:
- **Tags** - Granular cache invalidation (`container:name`, `blob:name`)
- **Paths** - Page-level revalidation (`/containers`, `/containers/name`)
- **Time-based** - Automatic expiration with TTL

## 📂 Container Actions

### createContainer

Create a new Azure Storage container.

**Function Signature:**
```typescript
async function createContainer(formData: FormData): Promise<ActionResult<{ name: string }>>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Container name (3-63 chars, lowercase, alphanumeric + hyphens) |
| `publicAccess` | string | No | Public access level: `none`, `blob`, `container` (default: `none`) |
| `metadata.*` | string | No | Custom metadata as `metadata.key=value` pairs |

**Example Usage:**
```typescript
// From a form submission
<form action={createContainer}>
  <input name="name" value="my-container" required />
  <select name="publicAccess">
    <option value="none">Private</option>
    <option value="blob">Public blobs</option>
    <option value="container">Public container</option>
  </select>
  <input name="metadata.department" value="engineering" />
  <input name="metadata.project" value="storage-explorer" />
  <button type="submit">Create Container</button>
</form>

// Programmatic usage
const formData = new FormData();
formData.append('name', 'my-container');
formData.append('publicAccess', 'none');
formData.append('metadata.department', 'engineering');

const result = await createContainer(formData);
if (result.success) {
  console.log(`Container '${result.data.name}' created successfully`);
} else {
  console.error('Error:', result.error);
}
```

**Response:**
```typescript
{
  success: true,
  data: { name: "my-container" },
  duration: 1234 // milliseconds
}
```

**Validation Rules:**
- Container name: 3-63 characters, lowercase alphanumeric with hyphens
- Cannot start or end with hyphen
- No consecutive hyphens
- Public access must be `none`, `blob`, or `container`

**Cache Invalidation:**
- Revalidates `containers` tag
- Revalidates `/containers` path

---

### deleteContainer

Delete an existing container and all its contents.

**Function Signature:**
```typescript
async function deleteContainer(formData: FormData): Promise<ActionResult>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Name of container to delete |

**Example Usage:**
```typescript
<form action={deleteContainer}>
  <input name="name" value="container-to-delete" type="hidden" />
  <button type="submit">Delete Container</button>
</form>
```

**Response:**
```typescript
{
  success: true
}
```

**Cache Invalidation:**
- Revalidates `containers` tag
- Revalidates `container:${name}` tag
- Revalidates `/containers` and `/containers/${name}` paths

---

### updateContainerMetadata

Update container metadata without affecting contents.

**Function Signature:**
```typescript
async function updateContainerMetadata(formData: FormData): Promise<ActionResult>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Container name |
| `metadata.*` | string | No | Metadata as `metadata.key=value` pairs |

**Example Usage:**
```typescript
const formData = new FormData();
formData.append('name', 'my-container');
formData.append('metadata.environment', 'production');
formData.append('metadata.owner', 'engineering-team');

const result = await updateContainerMetadata(formData);
```

**Cache Invalidation:**
- Revalidates `container:${name}` tag
- Revalidates `/containers/${name}` path

---

### setContainerPublicAccess

Change container public access level.

**Function Signature:**
```typescript
async function setContainerPublicAccess(formData: FormData): Promise<ActionResult>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Container name |
| `publicAccess` | string | Yes | Access level: `none`, `blob`, `container` |

---

### createContainerValidated

Enhanced container creation with validation and existence checking.

**Function Signature:**
```typescript
async function createContainerValidated(data: ContainerFormData): Promise<ActionResult<{ name: string }>>
```

**Parameters:**
```typescript
interface ContainerFormData {
  name: string;
  publicAccess: 'none' | 'blob' | 'container';
  metadata: Record<string, string>;
}
```

**Features:**
- Pre-creation existence check
- Enhanced validation
- Performance timing
- Structured error responses

## 📁 Blob Actions

### uploadBlob

Upload a file as a blob to Azure Storage.

**Function Signature:**
```typescript
async function uploadBlob(formData: FormData): Promise<ActionResult<{ name: string; size: number }>>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Target container name |
| `file` | File | Yes | File object from file input |
| `blobName` | string | No | Custom blob name (defaults to file name) |
| `contentType` | string | No | MIME type (auto-detected from file) |
| `tier` | string | No | Access tier: `Hot`, `Cool`, `Archive` (default: `Hot`) |
| `metadata.*` | string | No | Custom metadata as `metadata.key=value` pairs |
| `tags.*` | string | No | Blob tags as `tags.key=value` pairs |

**Example Usage:**
```typescript
<form action={uploadBlob} encType="multipart/form-data">
  <input name="containerName" value="documents" type="hidden" />
  <input name="file" type="file" required />
  <input name="blobName" placeholder="Optional custom name" />
  <select name="tier">
    <option value="Hot">Hot (frequent access)</option>
    <option value="Cool">Cool (infrequent access)</option>
    <option value="Archive">Archive (long-term)</option>
  </select>
  <input name="metadata.department" value="hr" />
  <input name="tags.classification" value="internal" />
  <button type="submit">Upload File</button>
</form>
```

**Response:**
```typescript
{
  success: true,
  data: {
    name: "document.pdf",
    size: 1048576 // bytes
  }
}
```

**Validation:**
- File size must be under configured limit (default: 100MB)
- File type validation (if enabled)
- Container must exist
- Blob name validation (max 1024 characters)

**Cache Invalidation:**
- Revalidates `blobs` tag
- Revalidates `container:${containerName}` tag
- Revalidates container paths

---

### deleteBlob

Delete a blob from a container.

**Function Signature:**
```typescript
async function deleteBlob(formData: FormData): Promise<ActionResult>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Container name |
| `blobName` | string | Yes | Blob name to delete |
| `deleteSnapshots` | string | No | Snapshot handling: `include`, `only` (default: `include`) |

**Example Usage:**
```typescript
<form action={deleteBlob}>
  <input name="containerName" value="documents" type="hidden" />
  <input name="blobName" value="old-file.pdf" type="hidden" />
  <select name="deleteSnapshots">
    <option value="include">Delete blob and snapshots</option>
    <option value="only">Delete snapshots only</option>
  </select>
  <button type="submit">Delete File</button>
</form>
```

---

### copyBlob

Copy a blob from one location to another.

**Function Signature:**
```typescript
async function copyBlob(formData: FormData): Promise<ActionResult<{ name: string }>>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceContainerName` | string | Yes | Source container |
| `sourceBlobName` | string | Yes | Source blob name |
| `targetContainerName` | string | Yes | Destination container |
| `targetBlobName` | string | Yes | Destination blob name |

**Example Usage:**
```typescript
const formData = new FormData();
formData.append('sourceContainerName', 'source-container');
formData.append('sourceBlobName', 'file.pdf');
formData.append('targetContainerName', 'backup-container');
formData.append('targetBlobName', 'backup-file.pdf');

const result = await copyBlob(formData);
```

---

### updateBlobMetadata

Update blob metadata without changing content.

**Function Signature:**
```typescript
async function updateBlobMetadata(formData: FormData): Promise<ActionResult>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Container name |
| `blobName` | string | Yes | Blob name |
| `metadata.*` | string | No | Metadata as `metadata.key=value` pairs |

---

### updateBlobTags

Update blob tags (Azure Blob Index tags).

**Function Signature:**
```typescript
async function updateBlobTags(formData: FormData): Promise<ActionResult>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Container name |
| `blobName` | string | Yes | Blob name |
| `tags.*` | string | No | Tags as `tags.key=value` pairs |

---

### setBlobTier

Change blob access tier for cost optimization.

**Function Signature:**
```typescript
async function setBlobTier(formData: FormData): Promise<ActionResult>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Container name |
| `blobName` | string | Yes | Blob name |
| `tier` | string | Yes | New tier: `Hot`, `Cool`, `Archive` |

**Access Tier Details:**
- **Hot** - Frequent access, higher storage cost, lower access cost
- **Cool** - Infrequent access (30+ days), lower storage cost, higher access cost
- **Archive** - Long-term storage (180+ days), lowest cost, requires rehydration

---

### uploadTextBlob

Upload text content directly as a blob.

**Function Signature:**
```typescript
async function uploadTextBlob(formData: FormData): Promise<ActionResult<{ name: string; size: number }>>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Container name |
| `blobName` | string | Yes | Blob name |
| `content` | string | Yes | Text content |
| `contentType` | string | No | MIME type (default: `text/plain`) |

---

### uploadBlobValidated

Enhanced blob upload with comprehensive validation.

**Function Signature:**
```typescript
async function uploadBlobValidated(data: BlobFormData): Promise<ActionResult<{ name: string; size: number; etag: string }>>
```

**Parameters:**
```typescript
interface BlobFormData {
  containerName: string;
  blobName: string;
  file: File;
  contentType?: string;
  tier: 'Hot' | 'Cool' | 'Archive';
  metadata: Record<string, string>;
  tags: Record<string, string>;
}
```

**Enhanced Features:**
- File validation (size, type)
- Container existence check
- Performance timing
- ETag in response
- Structured error handling

---

### updateBlobProperties

Comprehensive blob property update (metadata, tags, tier).

**Function Signature:**
```typescript
async function updateBlobProperties(data: BlobUpdateFormData): Promise<ActionResult>
```

**Parameters:**
```typescript
interface BlobUpdateFormData {
  containerName: string;
  blobName: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  tier?: 'Hot' | 'Cool' | 'Archive';
}
```

## 🔄 Batch Operations

### deleteMultipleBlobs

Delete multiple blobs in a single operation.

**Function Signature:**
```typescript
async function deleteMultipleBlobs(formData: FormData): Promise<ActionResult<{ deleted: number; errors: string[] }>>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Container name |
| `blobNames` | string[] | Yes | Array of blob names to delete |

**Example Usage:**
```typescript
const formData = new FormData();
formData.append('containerName', 'documents');
formData.append('blobNames', 'file1.pdf');
formData.append('blobNames', 'file2.pdf');
formData.append('blobNames', 'file3.pdf');

const result = await deleteMultipleBlobs(formData);
if (result.success) {
  console.log(`Deleted: ${result.data.deleted} files`);
  console.log(`Errors: ${result.data.errors.length} failures`);
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    deleted: 2,
    errors: ["Failed to delete file3.pdf: Blob not found"]
  }
}
```

---

### batchDeleteBlobsEnhanced

Advanced batch delete with Azure Batch API support.

**Function Signature:**
```typescript
async function batchDeleteBlobsEnhanced(formData: FormData): Promise<ActionResult<BatchDeleteResult>>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Container name |
| `blobNames` | string[] | Yes | Array of blob names (max 256 per batch) |
| `deleteSnapshots` | string | No | Snapshot handling: `include`, `only` |

**Response:**
```typescript
interface BatchDeleteResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BatchOperationResult[];
}

interface BatchOperationResult {
  success: boolean;
  itemName: string;
  error?: string;
}
```

**Features:**
- Uses Azure Batch API for optimal performance
- Processes up to 256 blobs per batch
- Detailed per-blob results
- Handles partial failures gracefully

## 🛠️ Utility Actions

### generateBlobDownloadUrl

Generate a secure download URL for a blob.

**Function Signature:**
```typescript
async function generateBlobDownloadUrl(formData: FormData): Promise<ActionResult<{ downloadUrl: string; expiresAt: Date }>>
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `containerName` | string | Yes | Container name |
| `blobName` | string | Yes | Blob name |
| `expiryMinutes` | string | No | URL expiration in minutes (default: 60) |

**Response:**
```typescript
{
  success: true,
  data: {
    downloadUrl: "https://storage.blob.core.windows.net/container/blob?sig=...",
    expiresAt: "2024-03-15T14:30:00.000Z"
  }
}
```

---

### clearContainerCache

Manually clear cache for a specific container.

**Function Signature:**
```typescript
async function clearContainerCache(containerName: string): Promise<ActionResult>
```

---

### clearAllCaches

Clear all application caches.

**Function Signature:**
```typescript
async function clearAllCaches(): Promise<ActionResult>
```

---

### checkStorageHealth

Check Azure Storage connection health.

**Function Signature:**
```typescript
async function checkStorageHealth(): Promise<ActionResult<{ isHealthy: boolean; lastChecked: Date }>>
```

**Response:**
```typescript
{
  success: true,
  data: {
    isHealthy: true,
    lastChecked: "2024-03-15T14:30:00.000Z"
  }
}
```

---

### getStorageMetricsAction

Retrieve comprehensive storage account metrics.

**Function Signature:**
```typescript
async function getStorageMetricsAction(): Promise<ActionResult<StorageMetrics & { storageAccount: StorageAccountInfo }>>
```

**Response:**
```typescript
{
  success: true,
  data: {
    containerCount: 5,
    blobCount: 1234,
    totalSize: 1073741824,
    usedCapacity: 1073741824,
    lastUpdated: "2024-03-15T14:30:00.000Z",
    storageAccount: {
      accountName: "mystorageaccount",
      accountType: "StorageV2",
      location: "East US",
      sku: { name: "Standard_RAGRS", tier: "Standard" }
    }
  }
}
```

## ❌ Error Handling

### Error Response Format

All Server Actions return a consistent error format:

```typescript
{
  success: false,
  error: "Human-readable error message",
  requestId?: "unique-request-identifier",
  duration?: 1234 // milliseconds (for some actions)
}
```

### Error Types

**Validation Errors:**
- Invalid container names
- Invalid blob names
- Invalid access tiers
- File size/type violations

**Azure Storage Errors:**
- Container not found (404)
- Blob not found (404)
- Access denied (403)
- Account not found (404)
- Service unavailable (503)

**Configuration Errors:**
- Missing connection string
- Invalid connection string
- Authentication failures

### Error Handling Best Practices

```typescript
const result = await createContainer(formData);

if (!result.success) {
  // Handle specific error types
  if (result.error.includes('already exists')) {
    // Container already exists - show specific message
    setError('A container with this name already exists');
  } else if (result.error.includes('invalid name')) {
    // Validation error - show form validation
    setFieldError('name', result.error);
  } else {
    // General error - show generic message
    setError('Failed to create container. Please try again.');
  }
  
  // Log for debugging (server-side logging is automatic)
  console.error('Container creation failed:', result.error);
  
  return;
}

// Success - proceed with result
console.log('Container created:', result.data);
```

## 📋 Type Definitions

### Core Types

```typescript
interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
  requestId?: string;
  duration?: number;
}

interface ContainerFormData {
  name: string;
  publicAccess: 'none' | 'blob' | 'container';
  metadata: Record<string, string>;
}

interface BlobFormData {
  containerName: string;
  blobName: string;
  file: File;
  contentType?: string;
  tier: 'Hot' | 'Cool' | 'Archive';
  metadata: Record<string, string>;
  tags: Record<string, string>;
}

interface BlobUpdateFormData {
  containerName: string;
  blobName: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  tier?: 'Hot' | 'Cool' | 'Archive';
}
```

### Validation Schemas

```typescript
// Container name: 3-63 chars, lowercase alphanumeric + hyphens
const ContainerNameSchema = z.string()
  .min(3).max(63)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);

// Blob name: 1-1024 characters
const BlobNameSchema = z.string()
  .min(1).max(1024);

// Public access levels
const PublicAccessSchema = z.enum(['none', 'blob', 'container']);

// Access tiers
const AccessTierSchema = z.enum(['Hot', 'Cool', 'Archive']);
```

## 🔧 Usage Patterns

### Form-based Actions

```typescript
// Direct form submission
<form action={createContainer}>
  <input name="name" required />
  <button type="submit">Create</button>
</form>

// With client-side enhancement
<form action={createContainer} onSubmit={handleSubmit}>
  <input name="name" required />
  <button type="submit" disabled={isPending}>
    {isPending ? 'Creating...' : 'Create'}
  </button>
</form>
```

### Programmatic Usage

```typescript
async function handleCreateContainer(data: { name: string; publicAccess: string }) {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('publicAccess', data.publicAccess);
  
  const result = await createContainer(formData);
  return result;
}
```

### With React Hook Form

```typescript
import { useFormState, useFormStatus } from 'react-dom';

function CreateContainerForm() {
  const [state, formAction] = useFormState(createContainer, null);
  const { pending } = useFormStatus();
  
  return (
    <form action={formAction}>
      <input name="name" required />
      <button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Container'}
      </button>
      {state && !state.success && (
        <p className="error">{state.error}</p>
      )}
    </form>
  );
}
```

## 🚀 Performance Considerations

### Caching Strategy

- **Granular Invalidation** - Only invalidate affected data
- **Tag-based Caching** - Efficient cache management
- **Optimistic Updates** - UI updates before server response (with rollback)

### Best Practices

1. **Use batch operations** for multiple items
2. **Implement optimistic updates** for better UX
3. **Cache frequently accessed data** with appropriate TTL
4. **Use streaming downloads** for large files
5. **Implement retry logic** for transient failures

### Monitoring

All Server Actions include:
- Performance timing (`duration` field)
- Request tracking (`requestId` field)
- Structured logging for debugging
- Connection health monitoring

---

This API reference covers all Server Actions in the Azure Storage Explorer. For implementation examples, see the component files in `/components/` directory.
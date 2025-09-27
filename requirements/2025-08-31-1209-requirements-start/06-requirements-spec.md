# Requirements Specification: Azure Storage Explorer Web Application

## Problem Statement

Build a comprehensive Azure Storage Explorer-style web application using Next.js 15 that allows users to manage their Azure Storage accounts through a modern web interface. The application should provide core blob storage management capabilities including container management, file upload/download, and storage metrics visualization.

## Solution Overview

A full-featured Next.js 15 application leveraging **100% React Server Components** for direct Azure SDK integration with **zero API routes**. The application uses RSCs for all data fetching operations and Server Actions for all mutations, creating a pure server-first architecture that eliminates API layers while maintaining security and performance through server-side execution.

**Key Architectural Principle**: Every operation either happens in a Server Component (for data fetching) or through a Server Action (for mutations) - no API routes exist in the application.

## Functional Requirements

### 1. Dashboard & Metrics (Priority: High)
- **Storage Account Overview**: RSC directly fetches storage account metrics using Azure SDK
- **Metrics Cards**: Server-rendered cards showing live statistics (container count, blob count, total storage)
- **Recently Viewed**: Track and display recently accessed containers/blobs (stored in cookies/localStorage)
- **Real-time Data**: Fresh data on every page load via RSC with Next.js caching optimization

### 2. Container Management (Priority: High)
- **Container Listing**: RSC directly calls `listContainers()` to display all containers with metadata
- **Create Container**: Client Component form using Server Action for container creation
- **Delete Container**: Client Component with confirmation modal calling Server Action
- **Search Containers**: Client-side filtering of server-rendered container list
- **Container Details**: RSC fetches container properties using `getContainerProperties()`

### 3. Blob File Management (Priority: High)
- **File Listing**: RSC directly calls `listBlobs(containerName)` to display blob details
- **File Upload**: Client Component with form posting to Server Action for upload processing
- **File Download**: Server Action generating signed URLs or direct blob downloads
- **File Delete**: Client Component confirmation with Server Action for blob deletion
- **Directory Support**: RSC handles virtual directory structure from blob name prefixes
- **File Metadata**: RSC fetches blob properties using `getBlobDetails()` for detailed views

### 4. Advanced Blob Features (Priority: Medium)
- **Access Tiers**: Display and manage blob access tiers (Hot/Cool/Archive)
- **Blob Types**: Show blob type information (Block blob, Page blob, Append blob)
- **Lease Management**: Display lease state information
- **Copy/Paste Operations**: Support blob copy operations between containers

### 5. Navigation & User Experience (Priority: High)
- **Sidebar Navigation**: Implement shadcn dashboard sidebar with collapsible sections
- **Breadcrumb Navigation**: Clear navigation path showing current location
- **Favorites System**: Allow users to favorite frequently accessed containers
- **Search Functionality**: Global search across containers and blobs
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

## Technical Requirements

### Architecture & Technology Stack
- **Framework**: Next.js 15.5.2 with App Router using 100% React Server Components
- **Data Architecture**: **Zero API routes** - Direct Azure SDK calls in RSCs for all read operations
- **Mutation Architecture**: Server Actions for all create/update/delete operations (no API routes)
- **Language**: TypeScript 5 with end-to-end type safety (no API boundaries)
- **UI Library**: shadcn/ui components (New York style) with Tailwind CSS v4
- **Azure Integration**: @azure/storage-blob SDK integrated directly in server components and actions
- **Authentication**: Environment variable-based connection string (no user auth in v1)
- **Caching**: Next.js built-in caching with `revalidatePath()` for automatic data freshness
- **File Uploads**: Direct handling in Server Actions (no multipart API endpoints)

### File Structure
```
src/blob-storage-management/
├── app/
│   ├── containers/
│   │   ├── page.tsx                   # Container listing (RSC with direct Azure SDK)
│   │   └── [containerName]/
│   │       └── page.tsx              # Blob listing (RSC with direct Azure SDK)
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout with sidebar
│   └── page.tsx                      # Dashboard (RSC with direct Azure SDK)
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── dashboard/
│   │   ├── metrics-cards.tsx         # Storage metrics display (RSC)
│   │   ├── recent-items.tsx          # Recently viewed section (RSC)
│   │   └── sidebar.tsx               # Navigation sidebar
│   ├── containers/
│   │   ├── container-list.tsx        # Container listing (RSC)
│   │   ├── container-actions.tsx     # Create/delete actions (Client Component)
│   │   └── container-card.tsx        # Individual container card (RSC)
│   ├── blobs/
│   │   ├── blob-list.tsx            # Blob listing (RSC)
│   │   ├── blob-upload.tsx          # File upload (Client Component)
│   │   ├── blob-actions.tsx         # Blob operations toolbar (Client Component)
│   │   └── blob-item.tsx            # Individual blob item (RSC)
│   └── common/
│       ├── loading-spinner.tsx
│       ├── error-boundary.tsx
│       └── search-input.tsx
├── lib/
│   ├── azure-storage.ts              # Azure SDK wrapper for server components
│   ├── azure-actions.ts              # Server actions for all mutations
│   ├── utils.ts                      # Utility functions
│   └── types.ts                      # TypeScript interfaces
└── types/
    └── azure-types.ts                # Azure-specific type definitions
```

### Security & Configuration
- **Connection String**: Store in `AZURE_STORAGE_CONNECTION_STRING` environment variable
- **Server-Side Operations**: All Azure SDK operations performed server-side in RSCs and Server Actions
- **No Client Exposure**: Never expose connection strings or credentials to client
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages

### Performance Considerations
- **React Server Components**: Use RSC for all data fetching with direct Azure SDK calls
- **Server Actions**: Use Server Actions for all mutations (create, delete, upload)
- **Client Components**: Only for interactive elements requiring event handlers
- **Caching Strategy**: Implement Next.js caching for RSC data fetching
- **Streaming**: Use React Suspense for progressive loading of large datasets
- **Error Recovery**: Graceful error handling with retry mechanisms

## RSC Architecture Implementation

### Data Fetching Pattern (Server Components)

All read operations use direct Azure SDK calls in Server Components:

```typescript
// app/page.tsx - Dashboard RSC
import { getStorageMetrics, listContainers } from '@/lib/azure-storage';

export default async function Dashboard() {
  // Direct Azure SDK calls - no API routes needed
  const [metrics, containers] = await Promise.all([
    getStorageMetrics(),
    listContainers()
  ]);
  
  return (
    <div>
      <MetricsCards metrics={metrics} />
      <ContainerGrid containers={containers} />
    </div>
  );
}

// app/containers/[containerName]/page.tsx - Blob listing RSC
import { listBlobs, getContainerProperties } from '@/lib/azure-storage';

export default async function ContainerPage({ params }) {
  const containerName = params.containerName;
  
  // Direct Azure SDK calls in RSC
  const [blobs, containerProps] = await Promise.all([
    listBlobs(containerName),
    getContainerProperties(containerName)
  ]);
  
  return (
    <div>
      <ContainerHeader properties={containerProps} />
      <BlobList blobs={blobs} containerName={containerName} />
    </div>
  );
}
```

### Mutation Pattern (Server Actions)

All create/update/delete operations use Server Actions:

```typescript
// lib/azure-actions.ts
'use server';

import { getBlobServiceClient } from './azure-storage';
import { revalidatePath } from 'next/cache';

export async function createContainer(formData: FormData) {
  const containerName = formData.get('containerName') as string;
  
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.create();
    
    revalidatePath('/containers');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function uploadBlob(containerName: string, formData: FormData) {
  const file = formData.get('file') as File;
  
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(file.name);
    
    // Server Action handles file upload directly - no API route needed
    const arrayBuffer = await file.arrayBuffer();
    await blockBlobClient.upload(arrayBuffer, arrayBuffer.byteLength, {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    });
    
    revalidatePath(`/containers/${containerName}`);
    return { success: true, message: `Uploaded ${file.name} successfully` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteBlob(containerName: string, blobName: string) {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    
    await blobClient.delete();
    
    revalidatePath(`/containers/${containerName}`);
    return { success: true, message: `Deleted ${blobName} successfully` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function downloadBlob(containerName: string, blobName: string) {
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    
    // Generate a signed URL for download (expires in 1 hour)
    const sasUrl = await blobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });
    
    return { success: true, url: sasUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Client Component Integration

Client Components only for interactivity, using Server Actions for all mutations:

```typescript
// components/containers/create-container-form.tsx
'use client';

import { createContainer } from '@/lib/azure-actions';
import { useActionState } from 'react';

export function CreateContainerForm() {
  const [state, action, pending] = useActionState(createContainer, null);
  
  return (
    <form action={action}>
      <input name="containerName" required disabled={pending} />
      <button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Container'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}

// components/blobs/blob-upload.tsx
'use client';

import { uploadBlob } from '@/lib/azure-actions';
import { useActionState } from 'react';

export function BlobUploadForm({ containerName }: { containerName: string }) {
  const [state, action, pending] = useActionState(
    uploadBlob.bind(null, containerName), 
    null
  );
  
  return (
    <form action={action} encType="multipart/form-data">
      <input 
        type="file" 
        name="file" 
        required 
        disabled={pending}
        accept="*/*"
      />
      <button type="submit" disabled={pending}>
        {pending ? 'Uploading...' : 'Upload File'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
      {state?.message && <p className="text-green-500">{state.message}</p>}
    </form>
  );
}

// components/blobs/blob-actions.tsx  
'use client';

import { deleteBlob, downloadBlob } from '@/lib/azure-actions';
import { useActionState } from 'react';

export function BlobActions({ containerName, blobName }: { 
  containerName: string; 
  blobName: string; 
}) {
  const [deleteState, deleteAction, deleteLoading] = useActionState(
    deleteBlob.bind(null, containerName, blobName), 
    null
  );
  
  const handleDownload = async () => {
    const result = await downloadBlob(containerName, blobName);
    if (result.success && result.url) {
      window.open(result.url, '_blank');
    }
  };
  
  return (
    <div>
      <button onClick={handleDownload}>
        Download
      </button>
      <form action={deleteAction} style={{ display: 'inline' }}>
        <button type="submit" disabled={deleteLoading}>
          {deleteLoading ? 'Deleting...' : 'Delete'}
        </button>
      </form>
      {deleteState?.error && <p className="text-red-500">{deleteState.error}</p>}
    </div>
  );
}
```

## Implementation Hints

### Azure Storage Integration

#### Server Component Data Fetching (`lib/azure-storage.ts`)
```typescript
// RSC data fetching functions - called directly in Server Components:
- getBlobServiceClient(): BlobServiceClient
- listContainers(): Promise<ContainerInfo[]>
- getContainerClient(name: string): ContainerClient  
- listBlobs(containerName: string): Promise<BlobInfo[]>
- getBlobDetails(containerName: string, blobName: string): Promise<BlobDetails>
- getStorageMetrics(): Promise<StorageMetrics>
- getContainerProperties(containerName: string): Promise<ContainerProperties>
```

#### Server Actions for Mutations (`lib/azure-actions.ts`)
```typescript
// Server Actions - called from Client Components for all mutations:
- createContainer(formData: FormData): Promise<{ success: boolean; error?: string }>
- deleteContainer(containerName: string): Promise<{ success: boolean; error?: string }>
- uploadBlob(containerName: string, formData: FormData): Promise<{ success: boolean; error?: string }>
- deleteBlob(containerName: string, blobName: string): Promise<{ success: boolean; error?: string }>
- copyBlob(sourceContainer: string, sourceBlob: string, targetContainer: string): Promise<{ success: boolean; error?: string }>
- downloadBlob(containerName: string, blobName: string): Promise<{ success: boolean; url?: string; error?: string }>
- updateBlobTier(containerName: string, blobName: string, tier: 'Hot' | 'Cool' | 'Archive'): Promise<{ success: boolean; error?: string }>
- updateBlobMetadata(containerName: string, blobName: string, metadata: Record<string, string>): Promise<{ success: boolean; error?: string }>
```

### Component Patterns

#### Server Components (Default)
- **Data Fetching**: Direct Azure SDK calls in RSCs for all read operations
- **Server-Side Rendering**: Full HTML rendered on server with current data
- **Caching**: Leverage Next.js caching mechanisms for performance

```typescript
// Example RSC with direct Azure SDK usage
export default async function ContainerList() {
  const containers = await listContainers();
  
  return (
    <div>
      {containers.map(container => (
        <ContainerCard key={container.name} container={container} />
      ))}
    </div>
  );
}
```

#### Client Components (When Required)
- **Interactive Elements**: Forms, buttons, file uploads, modals, search inputs
- **Event Handlers**: onClick, onChange, onSubmit, onDrop
- **Server Actions**: All mutations go through Server Actions (no API calls)
- **Local State**: UI state only (loading states, form validation, modals)

```typescript
// Example Client Component using Server Actions
'use client';
import { createContainer } from '@/lib/azure-actions';
import { useActionState } from 'react';

export function CreateContainerForm() {
  const [state, action, pending] = useActionState(createContainer, null);
  
  return (
    <form action={action}>
      <input name="containerName" required disabled={pending} />
      <button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Container'}
      </button>
      {state?.error && <div className="text-red-500">{state.error}</div>}
      {state?.success && <div className="text-green-500">Container created!</div>}
    </form>
  );
}

// Client Component for search/filtering (local state only)
'use client';
export function ContainerSearch({ containers }: { containers: Container[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredContainers = containers.filter(container =>
    container.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <>
      <input 
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search containers..."
      />
      <ContainerList containers={filteredContainers} />
    </>
  );
}
```

### Zero API Routes Architecture

This application uses a **100% pure RSC + Server Actions architecture** with **zero API routes**:

#### All Data Fetching (Server Components Only)
- **Container Listing**: Direct `listContainers()` call in RSC
- **Blob Listing**: Direct `listBlobs()` call in RSC  
- **Storage Metrics**: Direct `getStorageMetrics()` call in RSC
- **Blob Details**: Direct `getBlobDetails()` call in RSC
- **Container Properties**: Direct `getContainerProperties()` call in RSC

#### All Mutations (Server Actions Only)
- **Container Creation**: `createContainer()` Server Action
- **Container Deletion**: `deleteContainer()` Server Action
- **File Upload**: `uploadBlob()` Server Action (handles multipart/form-data)
- **File Deletion**: `deleteBlob()` Server Action
- **File Download**: `downloadBlob()` Server Action (generates signed URLs)
- **Blob Copy**: `copyBlob()` Server Action
- **Access Tier Updates**: `updateBlobTier()` Server Action
- **Metadata Updates**: `updateBlobMetadata()` Server Action

#### Benefits of Zero API Routes
- **Simplified Architecture**: No API layer to maintain
- **Better Performance**: Direct Azure SDK calls in RSCs
- **Enhanced Security**: Server-side only operations with no API surface
- **Type Safety**: End-to-end TypeScript with no API boundaries
- **Automatic Revalidation**: Server Actions handle cache invalidation automatically

## Acceptance Criteria

### Must Have (MVP)
1. ✅ Dashboard displaying storage metrics (container count, blob count, data stored)
2. ✅ Container listing with search and basic operations (create, delete)
3. ✅ Blob listing within containers with file details
4. ✅ File upload functionality (single files, <100MB)
5. ✅ File download functionality
6. ✅ shadcn sidebar navigation with collapsible sections
7. ✅ Responsive design working on desktop and mobile
8. ✅ Environment variable configuration for connection string

### Should Have (V1.1)
1. ✅ Recently viewed items functionality
2. ✅ Favorites system for containers
3. ✅ Blob metadata display and editing
4. ✅ Access tier management (Hot/Cool/Archive)
5. ✅ Advanced search and filtering
6. ✅ Copy/paste operations between containers

### Could Have (Future Versions)
1. 📋 Chunked upload for large files
2. 📋 Batch operations (multi-select delete/copy)
3. 📋 File shares, Tables, and Queues support
4. 📋 User authentication and multi-account support
5. 📋 Advanced monitoring and analytics

## Assumptions

1. **Single Storage Account**: Application connects to one Azure Storage account per deployment
2. **Network Security**: Users will implement their own network-level security (firewalls, VPNs)
3. **Browser Compatibility**: Modern browsers supporting ES2020+ and Web APIs
4. **File Size Limits**: Initial version targets files under 100MB for simplicity
5. **Connection Reliability**: Stable network connection to Azure Storage endpoints
6. **Development Environment**: Azure Storage Emulator available for local development

## Dependencies & Integration Points

### Required NPM Packages
- `@azure/storage-blob`: Azure Storage SDK
- `@azure/identity`: Authentication library (for future use)
- Existing packages: Next.js 15, React 19, TypeScript, shadcn/ui, Tailwind CSS

### External Services
- Azure Storage Account with blob service enabled
- Connection string with appropriate permissions (read, write, delete, list)

### Development Tools
- Azure Storage Emulator or Azurite for local development
- Azure Storage Explorer for testing and validation
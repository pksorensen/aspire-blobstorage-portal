# React Server Components Architecture for Azure Storage Explorer

## Architecture Overview

This document outlines a 100% React Server Components (RSC) architecture for the Azure Storage Explorer web application, eliminating the need for API routes and enabling direct Azure SDK integration on the server side.

## Core Principles

### 1. Server-First Data Fetching
- All data fetching operations use RSCs with direct Azure Storage SDK calls
- Zero client-side API requests for data retrieval
- Environment variables (connection strings) remain server-side only
- Streaming responses using React Suspense

### 2. Server Actions for Mutations
- All mutations (create, update, delete, upload) use Server Actions
- Direct Azure SDK integration for mutations
- Automatic revalidation using `revalidatePath()`
- Progressive enhancement with form submissions

### 3. Zero API Routes
- No `/api` routes needed
- Direct server-side Azure SDK usage
- Simplified data flow architecture
- Better performance and security

## Component Architecture

### Server Components (RSC)

#### Data Fetching Components
```typescript
// All components that fetch data from Azure Storage
- ContainerListServer
- BlobListServer
- BlobDetailsServer
- StorageMetricsServer
- BlobPropertiesServer
```

#### Layout & Navigation Components
```typescript
// Static components that don't require client interaction
- StorageExplorerLayout
- NavigationSidebar
- BreadcrumbNavigation
- HeaderBar
```

### Client Components

#### Interactive UI Components
```typescript
// Components requiring user interaction and state management
- FileUploadDropzone
- BlobContextMenu
- ContainerContextMenu
- SearchInput
- FilterControls
- PaginationControls
- ConfirmationModals
- ToastNotifications
```

#### State Management Components
```typescript
// Components managing client-side state
- SelectionProvider
- ViewModeProvider
- FilterProvider
- NotificationProvider
```

## Data Flow Architecture

### 1. Server Component Data Flow
```
User Request → RSC → Azure SDK → Azure Storage → Response → Streaming HTML
```

### 2. Server Action Data Flow
```
Client Form/Action → Server Action → Azure SDK → Azure Storage → Revalidate → Redirect/Update
```

### 3. Caching Strategy
- Next.js built-in caching for Azure SDK responses
- Manual cache invalidation using `revalidatePath()` and `revalidateTag()`
- Streaming with React Suspense for progressive loading

## Security Model

### Environment Variables
```typescript
// Server-side only - never exposed to client
AZURE_STORAGE_CONNECTION_STRING
AZURE_STORAGE_ACCOUNT_NAME
AZURE_STORAGE_ACCOUNT_KEY
```

### Access Control
- All Azure credentials remain on server
- No client-side storage of sensitive information
- Server Actions validate user permissions before mutations

## Error Handling Strategy

### Server Component Error Boundaries
```typescript
// Graceful degradation for data fetching failures
- AzureErrorBoundary
- RetryableErrorBoundary
- FallbackUI components
```

### Server Action Error Handling
```typescript
// Structured error responses with user feedback
- FormError states
- Toast notifications for async operations
- Retry mechanisms for transient failures
```

## Performance Optimizations

### Streaming & Suspense
- Progressive page loading with React Suspense
- Streaming container lists and blob data
- Skeleton UI during data loading

### Caching Strategies
```typescript
// Next.js caching integration
- Automatic request deduplication
- Tag-based cache invalidation
- Selective path revalidation
```

### Bundle Optimization
- Minimal client-side JavaScript
- Azure SDK only on server side
- Code splitting for client components

## File Organization

```
src/blob-storage-management/
├── lib/
│   ├── azure-storage.ts     # Azure SDK wrapper for RSCs
│   ├── azure-actions.ts     # Server Actions for mutations  
│   ├── cache.ts            # Cache configuration and utilities
│   └── types.ts            # Shared TypeScript types
├── components/
│   ├── server/             # React Server Components
│   │   ├── containers/
│   │   ├── blobs/
│   │   ├── navigation/
│   │   └── layout/
│   ├── client/             # Client Components ('use client')
│   │   ├── forms/
│   │   ├── modals/
│   │   ├── interactions/
│   │   └── providers/
│   └── ui/                 # shadcn/ui components
├── app/
│   ├── layout.tsx          # Root layout (RSC)
│   ├── page.tsx            # Dashboard (RSC)
│   ├── containers/
│   │   ├── page.tsx        # Container list (RSC)
│   │   └── [name]/
│   │       ├── page.tsx    # Container details (RSC)
│   │       └── blobs/
│   │           ├── page.tsx           # Blob list (RSC)
│   │           └── [...path]/page.tsx # Blob details (RSC)
│   └── loading.tsx         # Global loading UI
└── types/                  # TypeScript definitions
    └── azure.ts           # Azure Storage types
```

## Integration Patterns

### 1. RSC with Azure SDK
```typescript
// Direct Azure SDK usage in Server Components
export default async function ContainerList() {
  const containers = await azureStorage.listContainers();
  return (
    <div>
      {containers.map(container => (
        <ContainerCard key={container.name} container={container} />
      ))}
    </div>
  );
}
```

### 2. Server Actions for Mutations
```typescript
// Server Actions with automatic revalidation
async function createContainer(formData: FormData) {
  'use server';
  
  const name = formData.get('name') as string;
  await azureStorage.createContainer(name);
  revalidatePath('/containers');
  redirect('/containers');
}
```

### 3. Client Component Integration
```typescript
// RSC passing data to Client Components
export default async function BlobManager({ containerName }: Props) {
  const blobs = await azureStorage.listBlobs(containerName);
  
  return (
    <div>
      <BlobListServer blobs={blobs} />
      <FileUploadClient containerName={containerName} />
    </div>
  );
}
```

## Testing Strategy Integration

The architecture supports the comprehensive testing strategy with:

- **Mock Azure SDK** for unit testing RSCs
- **Server Action testing** with form data validation
- **End-to-end testing** of complete data flows
- **Performance testing** of streaming and caching

## Next Steps

1. Implement Azure SDK wrapper (`lib/azure-storage.ts`)
2. Create Server Actions library (`lib/azure-actions.ts`)
3. Define component specifications with RSC/Client boundaries
4. Implement core Server Components for data fetching
5. Create Client Components for interactivity

This architecture ensures optimal performance, security, and developer experience while maintaining strict separation between server and client concerns.
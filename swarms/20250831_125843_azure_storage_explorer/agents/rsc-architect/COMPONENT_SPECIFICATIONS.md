# Component Specifications: RSC vs Client Components

## Overview

This document defines the clear separation between React Server Components (RSC) and Client Components for the Azure Storage Explorer application. Each component type serves specific purposes and has defined boundaries.

## React Server Components (RSC)

These components run exclusively on the server and handle data fetching, static rendering, and server-side logic.

### Layout & Navigation Components

#### `StorageExplorerLayout` (RSC)
- **Location**: `components/server/layout/StorageExplorerLayout.tsx`
- **Purpose**: Main application layout with navigation structure
- **Data**: Static layout configuration
- **Children**: Accepts client components for interactive elements

```typescript
interface StorageExplorerLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
}
```

#### `NavigationSidebar` (RSC)
- **Location**: `components/server/navigation/NavigationSidebar.tsx`  
- **Purpose**: Static navigation menu structure
- **Data**: Navigation items, current path (from URL)
- **Integration**: Renders client components for interactive nav items

#### `BreadcrumbNavigation` (RSC)
- **Location**: `components/server/navigation/BreadcrumbNavigation.tsx`
- **Purpose**: Path-based breadcrumb navigation
- **Data**: Current URL path, container/blob hierarchy
- **Static**: No client interaction needed

#### `HeaderBar` (RSC)
- **Location**: `components/server/layout/HeaderBar.tsx`
- **Purpose**: Application header with title and static info
- **Data**: Storage account name, connection status
- **Integration**: Slots for client components (search, notifications)

### Data Display Components

#### `ContainerListServer` (RSC)
- **Location**: `components/server/containers/ContainerListServer.tsx`
- **Purpose**: Fetch and render list of containers
- **Data**: `await azureStorage.listContainers()`
- **Integration**: Wraps client components for interactions

```typescript
interface ContainerListServerProps {
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export default async function ContainerListServer({
  searchQuery,
  sortBy = 'name',
  sortOrder = 'asc'
}: ContainerListServerProps) {
  const containers = await azureStorage.listContainers();
  // Apply server-side filtering and sorting
  const filteredContainers = applyFilters(containers, searchQuery, sortBy, sortOrder);
  
  return (
    <div className="space-y-4">
      {filteredContainers.map(container => (
        <ContainerCard key={container.name} container={container}>
          <ContainerActionsClient containerName={container.name} />
        </ContainerCard>
      ))}
    </div>
  );
}
```

#### `BlobListServer` (RSC)
- **Location**: `components/server/blobs/BlobListServer.tsx`
- **Purpose**: Fetch and render blobs for a container
- **Data**: `await azureStorage.listBlobs(containerName, prefix)`
- **Props**: Container name, prefix, pagination params

```typescript
interface BlobListServerProps {
  containerName: string;
  prefix?: string;
  maxResults?: number;
  view?: 'grid' | 'list';
}
```

#### `BlobDetailsServer` (RSC)
- **Location**: `components/server/blobs/BlobDetailsServer.tsx`
- **Purpose**: Fetch and display detailed blob information
- **Data**: `await azureStorage.getBlobProperties(containerName, blobName)`
- **Static**: Properties, metadata, tags display

#### `StorageMetricsServer` (RSC)
- **Location**: `components/server/dashboard/StorageMetricsServer.tsx`
- **Purpose**: Display storage account metrics and statistics
- **Data**: `await azureStorage.getStorageMetrics()`
- **Caching**: Long-term cache with periodic updates

### Form Wrapper Components

#### `ContainerFormWrapper` (RSC)
- **Location**: `components/server/forms/ContainerFormWrapper.tsx`
- **Purpose**: Wrapper for container creation/edit forms with Server Actions
- **Integration**: Embeds client form components with server action handlers

#### `BlobUploadWrapper` (RSC)
- **Location**: `components/server/forms/BlobUploadWrapper.tsx`
- **Purpose**: File upload form wrapper with Server Actions
- **Integration**: File upload client component with server processing

## Client Components

These components use the `'use client'` directive and handle user interactions, state management, and dynamic behavior.

### Interactive Forms

#### `ContainerCreateForm` (Client)
- **Location**: `components/client/forms/ContainerCreateForm.tsx`
- **Purpose**: Container creation form with validation
- **State**: Form inputs, validation errors, submission state
- **Integration**: Uses Server Action `createContainer` from `azure-actions.ts`

```typescript
'use client';

interface ContainerCreateFormProps {
  onSuccess?: (containerName: string) => void;
  onCancel?: () => void;
}

export function ContainerCreateForm({ onSuccess, onCancel }: ContainerCreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  
  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createContainer(formData);
      if (result.success) {
        onSuccess?.(result.data.name);
      } else {
        setErrors([result.error]);
      }
    });
  };
  
  return (
    <form action={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

#### `FileUploadDropzone` (Client)
- **Location**: `components/client/forms/FileUploadDropzone.tsx`
- **Purpose**: Drag & drop file upload interface
- **State**: File selection, upload progress, validation
- **Features**: Multiple files, progress tracking, error handling

#### `BlobMetadataEditor` (Client)
- **Location**: `components/client/forms/BlobMetadataEditor.tsx`
- **Purpose**: Dynamic key-value editor for metadata/tags
- **State**: Dynamic form fields, validation
- **Integration**: Server Action `updateBlobMetadata`

### Interactive UI Components

#### `SearchInput` (Client)
- **Location**: `components/client/interactions/SearchInput.tsx`
- **Purpose**: Real-time search with debouncing
- **State**: Search query, loading state
- **Integration**: Updates URL params for server-side filtering

#### `FilterControls` (Client)
- **Location**: `components/client/interactions/FilterControls.tsx`
- **Purpose**: Sorting, filtering, and view mode controls
- **State**: Filter options, sort configuration
- **Integration**: URL-based state management

#### `SelectionProvider` (Client)
- **Location**: `components/client/providers/SelectionProvider.tsx`
- **Purpose**: Multi-select functionality for bulk operations
- **State**: Selected items, bulk action state
- **Context**: Provides selection state to child components

```typescript
'use client';

interface SelectionContextType {
  selectedItems: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bulkAction: (action: string) => Promise<void>;
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const contextValue = {
    selectedItems,
    toggleSelection: (id: string) => {
      setSelectedItems(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    // ... other methods
  };
  
  return (
    <SelectionContext.Provider value={contextValue}>
      {children}
    </SelectionContext.Provider>
  );
}
```

#### `PaginationControls` (Client)
- **Location**: `components/client/interactions/PaginationControls.tsx`
- **Purpose**: Pagination navigation with URL updates
- **State**: Current page, page size
- **Integration**: URL-based pagination for server components

### Context Menu Components

#### `BlobContextMenu` (Client)
- **Location**: `components/client/menus/BlobContextMenu.tsx`
- **Purpose**: Right-click context menu for blob operations
- **State**: Menu visibility, selected blob
- **Actions**: Download, delete, copy, properties

#### `ContainerContextMenu` (Client)
- **Location**: `components/client/menus/ContainerContextMenu.tsx`  
- **Purpose**: Context menu for container operations
- **Actions**: Properties, delete, create SAS token

### Modal Components

#### `ConfirmationModal` (Client)
- **Location**: `components/client/modals/ConfirmationModal.tsx`
- **Purpose**: Confirmation dialogs for destructive actions
- **State**: Modal visibility, confirmation state
- **Integration**: Server Actions for confirmed operations

#### `BlobPropertiesModal` (Client)
- **Location**: `components/client/modals/BlobPropertiesModal.tsx`
- **Purpose**: Detailed blob properties and metadata editor
- **State**: Modal state, form data
- **Integration**: Receives data from RSC, uses Server Actions for updates

### Notification Components

#### `ToastProvider` (Client)
- **Location**: `components/client/providers/ToastProvider.tsx`
- **Purpose**: Global toast notifications system
- **State**: Toast queue, timing
- **Integration**: Shows results from Server Actions

#### `ProgressIndicator` (Client)
- **Location**: `components/client/feedback/ProgressIndicator.tsx`
- **Purpose**: Upload progress and operation status
- **State**: Progress percentage, operation details

## Integration Patterns

### Server-to-Client Data Flow

```typescript
// Server Component fetches data
export default async function ContainerPage({ params }: { params: { name: string } }) {
  const container = await azureStorage.getContainer(params.name);
  const blobs = await azureStorage.listBlobs(params.name);
  
  return (
    <div>
      <ContainerHeader container={container} />
      <BlobListServer blobs={blobs} containerName={params.name}>
        <SelectionProvider>
          <BlobGrid blobs={blobs} />
          <BulkActionsBar />
        </SelectionProvider>
      </BlobListServer>
    </div>
  );
}
```

### Client-to-Server Actions

```typescript
// Client component triggering Server Action
'use client';
export function DeleteBlobButton({ containerName, blobName }: Props) {
  const [isPending, startTransition] = useTransition();
  
  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('containerName', containerName);
      formData.set('blobName', blobName);
      
      const result = await deleteBlob(formData);
      if (result.success) {
        toast.success('Blob deleted successfully');
      } else {
        toast.error(result.error);
      }
    });
  };
  
  return (
    <Button onClick={handleDelete} disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
```

### Streaming with Suspense

```typescript
// RSC with Suspense boundaries
export default async function ContainerDashboard() {
  return (
    <div>
      <Suspense fallback={<MetricsSkeleton />}>
        <StorageMetricsServer />
      </Suspense>
      
      <Suspense fallback={<ContainerListSkeleton />}>
        <ContainerListServer />
      </Suspense>
    </div>
  );
}
```

## Development Guidelines

### RSC Guidelines
1. **Pure Functions**: RSCs should be pure, async functions
2. **No State**: Use props and URL params for dynamic behavior  
3. **Error Boundaries**: Wrap in error boundaries for graceful failures
4. **Caching**: Leverage Next.js caching for performance
5. **Composition**: Design for client component integration

### Client Component Guidelines
1. **Minimal JavaScript**: Keep client bundles small
2. **Progressive Enhancement**: Work without JavaScript when possible
3. **Error Handling**: Handle loading and error states gracefully
4. **Accessibility**: Follow WCAG 2.1 AA standards
5. **Performance**: Use React best practices (memo, usCallback, etc.)

### Integration Guidelines
1. **Type Safety**: Strong TypeScript interfaces between components
2. **Props Drilling**: Avoid deep prop drilling, use context when needed
3. **Server Actions**: Always handle errors from Server Actions
4. **Cache Invalidation**: Coordinate between Server Actions and RSCs
5. **URL State**: Use URL params for shareable, bookmarkable state

This specification ensures clear boundaries, optimal performance, and maintainable code while leveraging the full power of the RSC architecture.
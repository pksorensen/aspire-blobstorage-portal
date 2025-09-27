# Blob Operation Components

This directory contains React client components for Azure Blob Storage operations in the Azure Storage Explorer-style web application. All components use Server Actions for mutations and follow the established architectural patterns.

## Components Overview

### 1. FileUploadForm
**Path**: `file-upload-form.tsx`  
**Type**: Client Component (`'use client'`)

A comprehensive file upload component with drag-and-drop functionality, file validation, and metadata/tags support.

**Features**:
- Drag-and-drop file selection
- File preview for images
- Custom blob naming
- Access tier selection (Hot/Cool/Archive)
- Content type override
- Metadata and tags input
- File validation with size and type restrictions
- Progress indicators and error handling

**Props**:
```typescript
interface FileUploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerName: string;
  onUploadComplete?: (fileName: string, size: number) => void;
}
```

**Server Actions Used**: `uploadBlobFromForm`

### 2. BlobDownloadButton
**Path**: `blob-download-button.tsx`  
**Type**: Client Component (`'use client'`)

Download button with dropdown for various download options including direct download, preview in new tab, and copy download link.

**Features**:
- Direct file download
- Open in new tab for previewable files
- Copy download link to clipboard
- File type-specific icons
- Loading states and error handling

**Props**:
```typescript
interface BlobDownloadButtonProps {
  containerName: string;
  blob: BlobItem;
  variant?: 'button' | 'dropdown';
  className?: string;
}
```

**Server Actions Used**: `downloadBlobStream`, `generateBlobDownloadUrl`

### 3. DeleteBlobModal
**Path**: `delete-blob-modal.tsx`  
**Type**: Client Component (`'use client'`)

Confirmation modal for deleting single or multiple blobs with detailed warnings and progress tracking.

**Features**:
- Single and bulk blob deletion
- Detailed blob information display
- Safety warnings and confirmation
- Partial success handling for bulk operations
- Error reporting with specific failure details

**Props**:
```typescript
interface DeleteBlobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerName: string;
  blobs: BlobItem[];
  onDeleteComplete?: (deletedBlobs: string[]) => void;
}
```

**Server Actions Used**: `deleteBlob`, `deleteMultipleBlobs`

### 4. BlobActionToolbar
**Path**: `blob-action-toolbar.tsx`  
**Type**: Client Component (`'use client'`)

Main action toolbar that provides Azure Storage Explorer-style interface for blob operations.

**Features**:
- File upload integration
- Bulk selection controls (Select All/Deselect All)
- Bulk operations (Download, Copy, Cut, Delete)
- Search functionality
- Copy/paste operations with clipboard management
- Status bar showing selection and clipboard state
- Refresh and additional actions dropdown

**Props**:
```typescript
interface BlobActionToolbarProps {
  containerName: string;
  blobs: BlobItem[];
  selectedBlobs: BlobItem[];
  onSelectionChange: (selectedBlobs: BlobItem[]) => void;
  onBlobsRefresh?: () => void;
  onUploadComplete?: (fileName: string, size: number) => void;
  onDeleteComplete?: (deletedBlobs: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  availableContainers?: string[];
}
```

### 5. BlobCopyPasteOperations
**Path**: `blob-copy-paste-operations.tsx`  
**Type**: Client Component (`'use client'`)

Advanced copy/move operations modal with progress tracking and cross-container support.

**Features**:
- Copy or move blobs between containers
- Target container selection
- Optional path prefixes for organization
- Real-time progress tracking
- Batch operation handling with individual success/failure reporting
- Operation cancellation support

**Props**:
```typescript
interface BlobCopyPasteOperationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blobs: BlobItem[];
  sourceContainer: string;
  operation: 'copy' | 'move';
  availableContainers: string[];
  onOperationComplete?: (targetContainer: string, blobNames: string[]) => void;
}
```

**Server Actions Used**: `copyBlob`

## Usage Example

```typescript
'use client';

import { useState } from 'react';
import { BlobActionToolbar } from '@/components/blobs';
import { BlobItem } from '@/types/azure-types';

export function BlobManagerPage({ containerName, initialBlobs }: {
  containerName: string;
  initialBlobs: BlobItem[];
}) {
  const [blobs, setBlobs] = useState(initialBlobs);
  const [selectedBlobs, setSelectedBlobs] = useState<BlobItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleUploadComplete = (fileName: string, size: number) => {
    // Refresh blob list
    refreshBlobs();
  };

  const handleDeleteComplete = (deletedBlobs: string[]) => {
    // Remove deleted blobs from state
    setBlobs(prev => prev.filter(blob => !deletedBlobs.includes(blob.name)));
    setSelectedBlobs([]);
  };

  const refreshBlobs = async () => {
    // Fetch updated blob list
    // Implementation depends on your data fetching strategy
  };

  return (
    <div className="space-y-6">
      <BlobActionToolbar
        containerName={containerName}
        blobs={blobs}
        selectedBlobs={selectedBlobs}
        onSelectionChange={setSelectedBlobs}
        onBlobsRefresh={refreshBlobs}
        onUploadComplete={handleUploadComplete}
        onDeleteComplete={handleDeleteComplete}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        availableContainers={['container1', 'container2']}
      />
      
      {/* Your blob list component here */}
    </div>
  );
}
```

## Architecture Notes

### Server Actions Integration
All components integrate with Server Actions defined in `lib/azure-actions.ts`:
- File uploads use `multipart/form-data` handling
- All mutations include proper cache revalidation
- Error handling follows consistent patterns
- Form validation uses Zod schemas

### State Management
- Components use `useActionState` hook for Server Action integration
- Local state for UI concerns (modals, selection, clipboard)
- Parent components handle data synchronization

### Performance Considerations
- File validation on client-side before upload
- Chunked operations for bulk actions
- Progress tracking for long-running operations
- Lazy loading of modals and heavy components

### Error Handling
- Comprehensive error boundaries
- User-friendly error messages
- Partial success handling for bulk operations
- Retry mechanisms where appropriate

### Security
- File type and size validation
- Signed URL generation for downloads
- Proper form data sanitization
- CSRF protection through Server Actions

## Styling
- Uses shadcn/ui component library
- Tailwind CSS for styling
- Consistent with Azure Storage Explorer design patterns
- Responsive design for mobile and desktop

## Dependencies
- React 19+ with Server Actions support
- Next.js 15+ App Router
- shadcn/ui components
- Lucide React icons
- Azure Storage Blob SDK (server-side)
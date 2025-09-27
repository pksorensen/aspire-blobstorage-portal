'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Download, 
  Trash2, 
  Copy, 
  Scissors, 
  FolderPlus, 
  RefreshCcw, 
  MoreHorizontal,
  CheckSquare,
  Square,
  FileText,
  Search
} from 'lucide-react';
import { BlobItem } from '@/types/azure-types';
import { FileUploadForm } from './file-upload-form';
import { DeleteBlobModal } from './delete-blob-modal';
import { BlobCopyPasteOperations } from './blob-copy-paste-operations';
import { Input } from '@/components/ui/input';

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

interface ClipboardData {
  blobs: BlobItem[];
  operation: 'copy' | 'cut';
  sourceContainer: string;
}

export function BlobActionToolbar({ 
  containerName, 
  blobs, 
  selectedBlobs, 
  onSelectionChange,
  onBlobsRefresh,
  onUploadComplete,
  onDeleteComplete,
  searchQuery,
  onSearchChange,
  availableContainers = []
}: BlobActionToolbarProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCopyPasteModal, setShowCopyPasteModal] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

  const hasSelectedBlobs = selectedBlobs.length > 0;
  const allBlobsSelected = blobs.length > 0 && selectedBlobs.length === blobs.length;
  const someSelected = selectedBlobs.length > 0 && selectedBlobs.length < blobs.length;

  const handleSelectAll = () => {
    if (allBlobsSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(blobs);
    }
  };

  const handleCopy = () => {
    if (hasSelectedBlobs) {
      setClipboard({
        blobs: selectedBlobs,
        operation: 'copy',
        sourceContainer: containerName
      });
    }
  };

  const handleCut = () => {
    if (hasSelectedBlobs) {
      setClipboard({
        blobs: selectedBlobs,
        operation: 'cut',
        sourceContainer: containerName
      });
    }
  };

  const handlePaste = () => {
    if (!clipboard) return;
    setShowCopyPasteModal(true);
  };

  const handleCreateFolder = () => {
    // Create a new "folder" by creating a placeholder blob with / suffix
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      // In a real implementation, you would create a placeholder file
      // to represent the folder structure in blob storage
      // Would create folder: ${folderName}/
    }
  };

  const handleBulkDownload = () => {
    // In a real implementation, you would:
    // 1. Create a ZIP file containing all selected blobs
    // 2. Or initiate individual downloads
    // Would download ${selectedBlobs.length} blobs
  };

  return (
    <div className="space-y-4">
      {/* Main Action Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-background border rounded-lg">
        {/* Left Side - Primary Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowUploadForm(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Selection Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="flex items-center gap-2"
          >
            {allBlobsSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : someSelected ? (
              <CheckSquare className="h-4 w-4 opacity-50" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {allBlobsSelected ? 'Deselect All' : 'Select All'}
            {blobs.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                ({selectedBlobs.length}/{blobs.length})
              </span>
            )}
          </Button>

          {/* Bulk Actions - Show when items are selected */}
          {hasSelectedBlobs && (
            <>
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download ({selectedBlobs.length})
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCut}
                className="flex items-center gap-2"
              >
                <Scissors className="h-4 w-4" />
                Cut
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedBlobs.length})
              </Button>
            </>
          )}

          {/* Paste - Show when clipboard has content */}
          {clipboard && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePaste}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Paste ({clipboard.blobs.length})
                <span className="text-xs text-muted-foreground ml-1">
                  {clipboard.operation === 'cut' ? '(Move)' : '(Copy)'}
                </span>
              </Button>
            </>
          )}
        </div>

        {/* Right Side - Search and More Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search blobs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCreateFolder}>
                <FolderPlus className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span>New Folder</span>
                  <span className="text-xs text-muted-foreground">Create virtual folder</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={onBlobsRefresh}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span>Refresh</span>
                  <span className="text-xs text-muted-foreground">Reload blob list</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span>Properties</span>
                  <span className="text-xs text-muted-foreground">View container info</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Bar - Show selection and clipboard status */}
      {(hasSelectedBlobs || clipboard) && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            {hasSelectedBlobs && (
              <span>{selectedBlobs.length} blob{selectedBlobs.length !== 1 ? 's' : ''} selected</span>
            )}
            
            {clipboard && (
              <span className="flex items-center gap-1">
                <Copy className="h-3 w-3" />
                {clipboard.blobs.length} blob{clipboard.blobs.length !== 1 ? 's' : ''} in clipboard 
                ({clipboard.operation === 'cut' ? 'cut' : 'copied'} from {clipboard.sourceContainer})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasSelectedBlobs && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange([])}
                className="text-xs h-6 px-2"
              >
                Clear Selection
              </Button>
            )}
            
            {clipboard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setClipboard(null)}
                className="text-xs h-6 px-2"
              >
                Clear Clipboard
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upload Form Modal */}
      <FileUploadForm
        open={showUploadForm}
        onOpenChange={setShowUploadForm}
        containerName={containerName}
        onUploadComplete={onUploadComplete}
      />

      {/* Delete Confirmation Modal */}
      <DeleteBlobModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        containerName={containerName}
        blobs={selectedBlobs}
        onDeleteComplete={onDeleteComplete}
      />

      {/* Copy/Paste Operations Modal */}
      {clipboard && (
        <BlobCopyPasteOperations
          open={showCopyPasteModal}
          onOpenChange={setShowCopyPasteModal}
          blobs={clipboard.blobs}
          sourceContainer={clipboard.sourceContainer}
          operation={clipboard.operation === 'cut' ? 'move' : 'copy'}
          availableContainers={availableContainers}
          onOperationComplete={(_targetContainer, _blobNames) => {
            // Handle successful copy/move
            if (clipboard.operation === 'cut') {
              setClipboard(null);
            }
            onBlobsRefresh?.();
          }}
        />
      )}
    </div>
  );
}
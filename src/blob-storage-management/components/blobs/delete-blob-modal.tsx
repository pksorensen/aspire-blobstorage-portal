'use client';

import { useActionState } from 'react';
import { deleteBlobAction, deleteMultipleBlobsAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Loader2, Trash2, FileX } from 'lucide-react';
import { BlobItem } from '@/types/azure-types';
import { formatBytes } from '@/lib/utils';

interface BatchDeleteResult {
  deleted: number;
  errors: string[];
}

interface DeleteBlobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerName: string;
  blobs: BlobItem[]; // Array to support bulk deletion
  onDeleteComplete?: (deletedBlobs: string[]) => void;
}

const initialState = {
  success: false,
  error: undefined,
  data: undefined,
};

export function DeleteBlobModal({ 
  open, 
  onOpenChange, 
  containerName, 
  blobs, 
  onDeleteComplete 
}: DeleteBlobModalProps) {
  const isSingleBlob = blobs.length === 1;
  const isMultipleBlobs = blobs.length > 1;
  
  const [singleDeleteState, singleDeleteAction, singleDeletePending] = useActionState(deleteBlobAction, initialState);
  const [multiDeleteState, multiDeleteAction, multiDeletePending] = useActionState(deleteMultipleBlobsAction, initialState);

  const pending = singleDeletePending || multiDeletePending;
  const state = isSingleBlob ? singleDeleteState : multiDeleteState;

  // Handle successful deletion
  if (state.success && !pending) {
    const deletedBlobNames = isMultipleBlobs && state.data && typeof state.data === 'object' && 'deleted' in state.data
      ? blobs.filter((_, index) => index < (state.data as { deleted: number }).deleted).map(b => b.name)
      : blobs.map(b => b.name);
    
    onDeleteComplete?.(deletedBlobNames);
    
    // Close dialog
    setTimeout(() => {
      onOpenChange(false);
    }, 100);
  }

  const handleDelete = async () => {
    if (isSingleBlob) {
      const formData = new FormData();
      formData.append('containerName', containerName);
      formData.append('blobName', blobs[0].name);
      formData.append('deleteSnapshots', 'include');
      await singleDeleteAction(formData);
    } else {
      const formData = new FormData();
      formData.append('containerName', containerName);
      blobs.forEach(blob => {
        formData.append('blobNames', blob.name);
      });
      await multiDeleteAction(formData);
    }
  };

  const getTotalSize = () => {
    return blobs.reduce((total, blob) => total + (blob.properties.contentLength || 0), 0);
  };

  const getWarningMessage = () => {
    if (isSingleBlob) {
      return "This action cannot be undone. The blob will be permanently deleted from the container.";
    }
    return `This action cannot be undone. All ${blobs.length} selected blobs will be permanently deleted from the container.`;
  };

  const renderBlobList = () => {
    if (isSingleBlob) {
      const blob = blobs[0];
      return (
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <FileX className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm break-all">{blob.name}</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Size: {formatBytes(blob.properties.contentLength)}</p>
            <p>Type: {blob.properties.contentType}</p>
            <p>Last Modified: {new Date(blob.properties.lastModified).toLocaleDateString()}</p>
            {blob.properties.accessTier && (
              <p>Access Tier: {blob.properties.accessTier}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{blobs.length} blobs selected</span>
          <span className="text-xs text-muted-foreground">
            Total Size: {formatBytes(getTotalSize())}
          </span>
        </div>
        
        <div className="max-h-32 overflow-y-auto space-y-1">
          {blobs.slice(0, 10).map((blob) => (
            <div key={blob.name} className="flex items-center gap-2 text-sm">
              <FileX className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="break-all text-xs">{blob.name}</span>
              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                {formatBytes(blob.properties.contentLength)}
              </span>
            </div>
          ))}
          {blobs.length > 10 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              ... and {blobs.length - 10} more blobs
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {isSingleBlob ? 'Delete Blob' : `Delete ${blobs.length} Blobs`}
          </DialogTitle>
          <DialogDescription>
            {getWarningMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Container: {containerName}</h4>
            {renderBlobList()}
          </div>

          {/* Success Message for Multi-delete with Partial Success */}
          {isMultipleBlobs && state.success && state.data && typeof state.data === 'object' && 'errors' in state.data && Array.isArray((state.data as BatchDeleteResult).errors) && (state.data as BatchDeleteResult).errors.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
              <div className="text-sm text-amber-700">
                <p className="font-medium">Partial Success</p>
                <p>Deleted {(state.data as BatchDeleteResult).deleted} of {blobs.length} blobs</p>
                <div className="mt-2 space-y-1">
                  {(state.data as BatchDeleteResult).errors.map((error: string, index: number) => (
                    <p key={index} className="text-xs text-amber-600">{error}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Error Display */}
          {state.error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Deletion Failed</p>
                <p>{state.error}</p>
              </div>
            </div>
          )}

          {/* Warnings */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Important Notes:</p>
                <ul className="mt-1 text-xs space-y-1 list-disc list-inside">
                  <li>This operation cannot be undone</li>
                  <li>All blob snapshots will also be deleted</li>
                  <li>Any applications referencing these blobs may break</li>
                  {isMultipleBlobs && (
                    <li>Some deletions may succeed while others fail</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
            className="min-w-[100px]"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-1" />
                {isSingleBlob ? 'Delete Blob' : `Delete ${blobs.length} Blobs`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
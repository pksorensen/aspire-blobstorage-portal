'use client';

import { useState, useEffect, useCallback } from 'react';
import { useActionState, startTransition } from 'react';
import { copyBlobAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Copy, Move, Loader2, FolderOpen } from 'lucide-react';
import { BlobItem, ActionResult } from '@/types/azure-types';
import { formatBytes } from '@/lib/utils';

interface BlobCopyPasteOperationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blobs: BlobItem[];
  sourceContainer: string;
  operation: 'copy' | 'move';
  availableContainers: string[];
  onOperationComplete?: (targetContainer: string, blobNames: string[]) => void;
}

const initialState: ActionResult<{ name: string }> = {
  success: false,
  error: undefined,
  data: undefined,
};

export function BlobCopyPasteOperations({
  open,
  onOpenChange,
  blobs,
  sourceContainer,
  operation,
  availableContainers,
  onOperationComplete
}: BlobCopyPasteOperationsProps) {
  const [copyState, copyAction] = useActionState(copyBlobAction, initialState);
  const [targetContainer, setTargetContainer] = useState('');
  const [targetPrefix, setTargetPrefix] = useState('');
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [completedOperations, setCompletedOperations] = useState<string[]>([]);
  const [failedOperations, setFailedOperations] = useState<{ blob: string; error: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSingleBlob = blobs.length === 1;
  const isProcessing = isSubmitting;

  const processNextBlob = useCallback(async (index: number) => {
    if (index >= blobs.length) return;
    
    const blob = blobs[index];
    const formData = new FormData();
    formData.append('sourceContainerName', sourceContainer);
    formData.append('sourceBlobName', blob.name);
    formData.append('targetContainerName', targetContainer);
    
    // Handle target blob name with optional prefix
    const targetBlobName = targetPrefix ? `${targetPrefix}/${blob.name}` : blob.name;
    formData.append('targetBlobName', targetBlobName);
    
    startTransition(() => {
      copyAction(formData);
    });
  }, [sourceContainer, targetContainer, targetPrefix, blobs, copyAction]);

  // Handle successful copy
  useEffect(() => {
    if (copyState.success && !isSubmitting && processingIndex >= 0) {
      const completedBlob = blobs[processingIndex]?.name;
      if (completedBlob && !completedOperations.includes(completedBlob)) {
        setCompletedOperations(prev => [...prev, completedBlob]);
      }
      
      // Continue with next blob or complete
      const nextIndex = processingIndex + 1;
      if (nextIndex < blobs.length) {
        setProcessingIndex(nextIndex);
        setTimeout(() => processNextBlob(nextIndex), 100);
      } else {
        // All operations complete
        onOperationComplete?.(targetContainer, completedOperations);
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1000);
      }
    }
  }, [copyState.success, isSubmitting, processingIndex, blobs, completedOperations, targetContainer, onOperationComplete, onOpenChange, processNextBlob]);

  // Handle copy error
  useEffect(() => {
    if (copyState.error && !isSubmitting && processingIndex >= 0) {
      const failedBlob = blobs[processingIndex]?.name;
      if (failedBlob) {
        setFailedOperations(prev => [...prev, { blob: failedBlob, error: copyState.error! }]);
      }
      
      // Continue with next blob
      const nextIndex = processingIndex + 1;
      if (nextIndex < blobs.length) {
        setProcessingIndex(nextIndex);
        setTimeout(() => processNextBlob(nextIndex), 100);
      } else {
        // All operations attempted
        setIsSubmitting(false);
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 2000);
      }
    }
  }, [copyState.error, isSubmitting, processingIndex, blobs, onOpenChange, processNextBlob]);

  const resetState = () => {
    setProcessingIndex(-1);
    setCompletedOperations([]);
    setFailedOperations([]);
    setTargetContainer('');
    setTargetPrefix('');
    setIsSubmitting(false);
  };

  const handleStartOperation = async () => {
    if (!targetContainer || blobs.length === 0) return;
    
    setIsSubmitting(true);
    setProcessingIndex(0);
    processNextBlob(0);
  };

  const getTotalSize = () => {
    return blobs.reduce((total, blob) => total + (blob.properties.contentLength || 0), 0);
  };

  const getProgressPercentage = () => {
    const total = blobs.length;
    const completed = completedOperations.length + failedOperations.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getCurrentOperationText = () => {
    if (processingIndex >= 0 && processingIndex < blobs.length) {
      const blob = blobs[processingIndex];
      return `${operation === 'copy' ? 'Copying' : 'Moving'} ${blob.name}...`;
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {operation === 'copy' ? (
              <Copy className="h-5 w-5" />
            ) : (
              <Move className="h-5 w-5" />
            )}
            {operation === 'copy' ? 'Copy' : 'Move'} {isSingleBlob ? 'Blob' : `${blobs.length} Blobs`}
          </DialogTitle>
          <DialogDescription>
            {operation === 'copy' 
              ? 'Copy selected blobs to another container' 
              : 'Move selected blobs to another container'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source Information */}
          <div className="space-y-2">
            <Label>Source Container</Label>
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{sourceContainer}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {blobs.length} blob{blobs.length !== 1 ? 's' : ''} • {formatBytes(getTotalSize())}
              </div>
            </div>
          </div>

          {/* Target Container Selection */}
          <div className="space-y-2">
            <Label htmlFor="targetContainer">Target Container</Label>
            <Select
              value={targetContainer}
              onValueChange={setTargetContainer}
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target container" />
              </SelectTrigger>
              <SelectContent>
                {availableContainers
                  .filter(container => container !== sourceContainer)
                  .map(container => (
                    <SelectItem key={container} value={container}>
                      {container}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {availableContainers.length <= 1 && (
              <p className="text-xs text-muted-foreground">
                No other containers available. Create a new container first.
              </p>
            )}
          </div>

          {/* Target Prefix/Path */}
          <div className="space-y-2">
            <Label htmlFor="targetPrefix">Target Path (Optional)</Label>
            <Input
              id="targetPrefix"
              value={targetPrefix}
              onChange={(e) => setTargetPrefix(e.target.value)}
              placeholder="e.g., folder/subfolder"
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground">
              Add a path prefix to organize blobs in the target container
            </p>
          </div>

          {/* Blob List Preview */}
          <div className="space-y-2">
            <Label>Blobs to {operation}</Label>
            <div className="bg-muted/50 p-3 rounded-lg max-h-40 overflow-y-auto">
              {blobs.map((blob, index) => (
                <div
                  key={blob.name}
                  className={`flex items-center justify-between py-1 px-2 rounded text-sm ${
                    index === processingIndex
                      ? 'bg-blue-100 border border-blue-200'
                      : completedOperations.includes(blob.name)
                      ? 'bg-green-100 text-green-700'
                      : failedOperations.find(f => f.blob === blob.name)
                      ? 'bg-red-100 text-red-700'
                      : ''
                  }`}
                >
                  <span className="truncate flex-1">{blob.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    {formatBytes(blob.properties.contentLength)}
                  </span>
                  {index === processingIndex && isProcessing && (
                    <Loader2 className="h-3 w-3 animate-spin ml-2" />
                  )}
                  {completedOperations.includes(blob.name) && (
                    <span className="text-green-600 ml-2">✓</span>
                  )}
                  {failedOperations.find(f => f.blob === blob.name) && (
                    <span className="text-red-600 ml-2">✗</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {processingIndex >= 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              {isProcessing && (
                <p className="text-xs text-muted-foreground">
                  {getCurrentOperationText()}
                </p>
              )}
            </div>
          )}

          {/* Failed Operations */}
          {failedOperations.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Some operations failed:</p>
                  <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                    {failedOperations.map((failure, index) => (
                      <div key={index} className="text-xs">
                        <span className="font-medium">{failure.blob}:</span> {failure.error}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {completedOperations.length > 0 && processingIndex >= blobs.length - 1 && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-md">
              <div className="text-sm text-green-700">
                <p className="font-medium">
                  Successfully {operation === 'copy' ? 'copied' : 'moved'} {completedOperations.length} of {blobs.length} blobs
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetState();
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartOperation}
            disabled={!targetContainer || isProcessing || availableContainers.length <= 1}
            className="min-w-[120px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                {operation === 'copy' ? 'Copying...' : 'Moving...'}
              </>
            ) : (
              <>
                {operation === 'copy' ? (
                  <Copy className="h-4 w-4 mr-1" />
                ) : (
                  <Move className="h-4 w-4 mr-1" />
                )}
                {operation === 'copy' ? 'Copy' : 'Move'} {isSingleBlob ? 'Blob' : `${blobs.length} Blobs`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
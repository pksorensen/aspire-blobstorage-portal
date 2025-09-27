'use client';

import { useState, useEffect } from 'react';
import { useActionState, startTransition } from 'react';
import { copyBlobAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  Copy, 
  Move, 
  Loader2, 
  FolderOpen, 
  Clock,
  Database,
  Tag,
  Thermometer,
  CheckCircle,
  Zap,
  Shield
} from 'lucide-react';
import { BlobItem } from '@/types/azure-types';
import { formatBytes } from '@/lib/utils';

interface EnhancedBlobCopyOperationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blobs: BlobItem[];
  sourceContainer: string;
  operation: 'copy' | 'move';
  availableContainers: string[];
  onOperationComplete?: (targetContainer: string, blobNames: string[]) => void;
}

interface CopyActionState {
  success: boolean;
  error?: string;
  data?: any;
}

const initialState: CopyActionState = {
  success: false,
  error: undefined,
  data: undefined,
};

interface CopyOptions {
  preserveMetadata: boolean;
  preserveTags: boolean;
  preserveAccessTier: boolean;
  overwriteExisting: boolean;
  targetPrefix: string;
}

export function EnhancedBlobCopyOperations({
  open,
  onOpenChange,
  blobs,
  sourceContainer,
  operation,
  availableContainers,
  onOperationComplete
}: EnhancedBlobCopyOperationsProps) {
  const [copyState, copyAction] = useActionState(copyBlobAction, initialState);
  const [targetContainer, setTargetContainer] = useState('');
  const [copyOptions, setCopyOptions] = useState<CopyOptions>({
    preserveMetadata: true,
    preserveTags: true,
    preserveAccessTier: true,
    overwriteExisting: false,
    targetPrefix: '',
  });
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [completedOperations, setCompletedOperations] = useState<string[]>([]);
  const [failedOperations, setFailedOperations] = useState<{ blob: string; error: string }[]>([]);
  const [operationStartTime, setOperationStartTime] = useState<Date | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSingleBlob = blobs.length === 1;
  const isPending = isSubmitting;

  // Calculate operation statistics
  const getTotalSize = () => blobs.reduce((total, blob) => total + (blob.properties.contentLength || 0), 0);
  const getProgressPercentage = () => {
    const total = blobs.length;
    const completed = completedOperations.length + failedOperations.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  // Estimate time remaining
  useEffect(() => {
    if (processingIndex > 0 && operationStartTime) {
      const elapsed = Date.now() - operationStartTime.getTime();
      const avgTimePerBlob = elapsed / processingIndex;
      const remaining = (blobs.length - processingIndex) * avgTimePerBlob;
      
      if (remaining > 0) {
        const minutes = Math.ceil(remaining / 60000);
        setEstimatedTimeRemaining(minutes > 1 ? `~${minutes} minutes` : '~1 minute');
      }
    }
  }, [processingIndex, operationStartTime, blobs.length]);

  // Handle successful copy
  useEffect(() => {
    if (copyState.success && !isSubmitting && processingIndex >= 0) {
      const completedBlob = blobs[processingIndex]?.name;
      if (completedBlob && !completedOperations.includes(completedBlob)) {
        setCompletedOperations(prev => [...prev, completedBlob]);
      }
      
      const nextIndex = processingIndex + 1;
      if (nextIndex < blobs.length) {
        setProcessingIndex(nextIndex);
        setTimeout(() => processNextBlob(nextIndex), 100);
      } else {
        // All operations complete
        onOperationComplete?.(targetContainer, completedOperations);
        setIsSubmitting(false);
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1500);
      }
    }
  }, [copyState.success, isSubmitting, processingIndex]);

  // Handle copy error
  useEffect(() => {
    if (copyState.error && !isSubmitting && processingIndex >= 0) {
      const failedBlob = blobs[processingIndex]?.name;
      if (failedBlob) {
        setFailedOperations(prev => [...prev, { blob: failedBlob, error: copyState.error! }]);
      }
      
      const nextIndex = processingIndex + 1;
      if (nextIndex < blobs.length) {
        setProcessingIndex(nextIndex);
        setTimeout(() => processNextBlob(nextIndex), 100);
      } else {
        setIsSubmitting(false);
        setTimeout(() => {
          if (completedOperations.length === 0) {
            onOpenChange(false);
            resetState();
          }
        }, 2000);
      }
    }
  }, [copyState.error, isSubmitting, processingIndex]);

  const resetState = () => {
    setProcessingIndex(-1);
    setCompletedOperations([]);
    setFailedOperations([]);
    setIsSubmitting(false);
    setTargetContainer('');
    setCopyOptions({
      preserveMetadata: true,
      preserveTags: true,
      preserveAccessTier: true,
      overwriteExisting: false,
      targetPrefix: '',
    });
    setOperationStartTime(null);
    setEstimatedTimeRemaining('');
  };

  const processNextBlob = async (index: number) => {
    if (index >= blobs.length) return;
    
    const blob = blobs[index];
    const formData = new FormData();
    formData.append('sourceContainerName', sourceContainer);
    formData.append('sourceBlobName', blob.name);
    formData.append('targetContainerName', targetContainer);
    
    // Handle target blob name with optional prefix
    const targetBlobName = copyOptions.targetPrefix ? `${copyOptions.targetPrefix}/${blob.name}` : blob.name;
    formData.append('targetBlobName', targetBlobName);
    
    // Add copy options (these would need to be implemented in the server action)
    if (copyOptions.preserveMetadata) {
      formData.append('preserveMetadata', 'true');
    }
    if (copyOptions.preserveTags) {
      formData.append('preserveTags', 'true');
    }
    if (copyOptions.preserveAccessTier) {
      formData.append('preserveAccessTier', 'true');
    }
    if (copyOptions.overwriteExisting) {
      formData.append('overwriteExisting', 'true');
    }
    
    startTransition(() => {
      copyAction(formData);
    });
  };

  const handleStartOperation = async () => {
    if (!targetContainer || blobs.length === 0) return;
    
    setIsSubmitting(true);
    setProcessingIndex(0);
    setOperationStartTime(new Date());
    processNextBlob(0);
  };

  const getCurrentOperationText = () => {
    if (processingIndex >= 0 && processingIndex < blobs.length) {
      const blob = blobs[processingIndex];
      return `${operation === 'copy' ? 'Copying' : 'Moving'} ${blob.name}...`;
    }
    return '';
  };

  const hasPreservableData = () => {
    return blobs.some(blob => 
      Object.keys(blob.metadata || {}).length > 0 ||
      Object.keys(blob.tags || {}).length > 0 ||
      blob.properties.accessTier
    );
  };

  const renderPreservationOptions = () => {
    if (!hasPreservableData()) return null;

    return (
      <div className="space-y-4">
        <Separator />
        <div className="space-y-3">
          <Label className="text-sm font-medium">Preservation Options</Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserveMetadata"
                checked={copyOptions.preserveMetadata}
                onCheckedChange={(checked) => 
                  setCopyOptions(prev => ({ ...prev, preserveMetadata: checked === true }))
                }
                disabled={isPending}
              />
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="preserveMetadata" className="text-sm cursor-pointer">
                  Preserve metadata
                </label>
                <Badge variant="outline" className="text-xs">
                  {blobs.filter(b => Object.keys(b.metadata || {}).length > 0).length} have metadata
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserveTags"
                checked={copyOptions.preserveTags}
                onCheckedChange={(checked) => 
                  setCopyOptions(prev => ({ ...prev, preserveTags: checked === true }))
                }
                disabled={isPending}
              />
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="preserveTags" className="text-sm cursor-pointer">
                  Preserve tags
                </label>
                <Badge variant="outline" className="text-xs">
                  {blobs.filter(b => Object.keys(b.tags || {}).length > 0).length} have tags
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserveAccessTier"
                checked={copyOptions.preserveAccessTier}
                onCheckedChange={(checked) => 
                  setCopyOptions(prev => ({ ...prev, preserveAccessTier: checked === true }))
                }
                disabled={isPending}
              />
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <label htmlFor="preserveAccessTier" className="text-sm cursor-pointer">
                  Preserve access tier
                </label>
                <Badge variant="outline" className="text-xs">
                  {blobs.filter(b => b.properties.accessTier && b.properties.accessTier !== 'Hot').length} non-Hot tiers
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedOptions = () => (
    <div className="space-y-4">
      <Separator />
      <div className="space-y-3">
        <Label className="text-sm font-medium">Advanced Options</Label>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="overwriteExisting"
            checked={copyOptions.overwriteExisting}
            onCheckedChange={(checked) => 
              setCopyOptions(prev => ({ ...prev, overwriteExisting: checked === true }))
            }
            disabled={isPending}
          />
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <label htmlFor="overwriteExisting" className="text-sm cursor-pointer">
              Overwrite existing blobs
            </label>
          </div>
        </div>

        {copyOptions.overwriteExisting && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Warning:</strong> Existing blobs with the same names will be replaced. This action cannot be undone.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {operation === 'copy' ? (
              <Copy className="h-5 w-5" />
            ) : (
              <Move className="h-5 w-5" />
            )}
            Enhanced {operation === 'copy' ? 'Copy' : 'Move'} - {isSingleBlob ? blobs[0]?.name : `${blobs.length} Blobs`}
          </DialogTitle>
          <DialogDescription>
            Advanced {operation === 'copy' ? 'copy' : 'move'} operation with preservation options and detailed progress tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Operation Summary */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{sourceContainer}</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="text-sm text-muted-foreground">
                  {targetContainer || 'Select destination'}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
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
              disabled={isPending}
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

          {/* Target Path */}
          <div className="space-y-2">
            <Label htmlFor="targetPrefix">Target Path (Optional)</Label>
            <Input
              id="targetPrefix"
              value={copyOptions.targetPrefix}
              onChange={(e) => setCopyOptions(prev => ({ ...prev, targetPrefix: e.target.value }))}
              placeholder="e.g., backup/2024-01-01"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Add a path prefix to organize blobs in the target container
            </p>
          </div>

          {renderPreservationOptions()}
          {renderAdvancedOptions()}

          {/* Progress Section */}
          {processingIndex >= 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Operation Progress</span>
                  <div className="flex items-center gap-2">
                    <span>{getProgressPercentage()}%</span>
                    {estimatedTimeRemaining && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {estimatedTimeRemaining}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 flex items-center justify-end pr-1"
                    style={{ width: `${getProgressPercentage()}%` }}
                  >
                    {isPending && getProgressPercentage() > 10 && (
                      <Loader2 className="h-2 w-2 animate-spin text-white" />
                    )}
                  </div>
                </div>

                {isPending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    <span>{getCurrentOperationText()}</span>
                  </div>
                )}

                {/* Operation Summary */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-lg font-medium text-green-600">{completedOperations.length}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-medium text-red-600">{failedOperations.length}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-medium text-muted-foreground">
                      {blobs.length - completedOperations.length - failedOperations.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Failed Operations */}
          {failedOperations.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <p className="font-medium text-sm">Some operations failed:</p>
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto text-xs">
                  {failedOperations.map((failure, index) => (
                    <div key={index}>
                      <span className="font-medium">{failure.blob}:</span> {failure.error}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {completedOperations.length > 0 && processingIndex >= blobs.length - 1 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <p className="font-medium text-sm">
                  Successfully {operation === 'copy' ? 'copied' : 'moved'} {completedOperations.length} of {blobs.length} blobs
                </p>
                {operationStartTime && (
                  <p className="text-xs mt-1">
                    Completed in {Math.round((Date.now() - operationStartTime.getTime()) / 1000)}s
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {isPending ? 'Operation in progress...' : `Ready to ${operation} ${blobs.length} blob${blobs.length !== 1 ? 's' : ''}`}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetState();
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStartOperation}
              disabled={!targetContainer || isPending || availableContainers.length <= 1}
              className="min-w-[140px]"
            >
              {isPending ? (
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
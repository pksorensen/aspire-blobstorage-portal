'use client';

import { useState, useEffect, useCallback } from 'react';
import { useActionState, startTransition } from 'react';
import { setBlobTierAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Thermometer, Snowflake, Archive, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { BlobItem, BlobTier, ActionResult } from '@/types/azure-types';
import { formatBytes } from '@/lib/utils';

interface BlobAccessTierManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blobs: BlobItem[];
  containerName: string;
  onTierChanged?: () => void;
}

const initialState: ActionResult = {
  success: false,
  error: undefined,
  data: undefined,
};

const TIER_INFO: Record<BlobTier, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  description: string;
  costLevel: 'lowest' | 'medium' | 'highest';
  accessSpeed: 'instant' | 'fast' | 'slow';
  rehydrationTime?: string;
}> = {
  Hot: {
    icon: Thermometer,
    color: 'text-red-600',
    badgeVariant: 'destructive',
    description: 'Optimized for frequent access. Highest storage cost, lowest access cost.',
    costLevel: 'highest',
    accessSpeed: 'instant',
  },
  Cool: {
    icon: Snowflake,
    color: 'text-blue-600',
    badgeVariant: 'default',
    description: 'Optimized for infrequent access. Medium storage cost, higher access cost.',
    costLevel: 'medium',
    accessSpeed: 'fast',
  },
  Archive: {
    icon: Archive,
    color: 'text-gray-600',
    badgeVariant: 'outline',
    description: 'Optimized for rarely accessed data. Lowest storage cost, highest access cost.',
    costLevel: 'lowest',
    accessSpeed: 'slow',
    rehydrationTime: '1-15 hours',
  },
};

export function BlobAccessTierManager({
  open,
  onOpenChange,
  blobs,
  containerName,
  onTierChanged
}: BlobAccessTierManagerProps) {
  const [tierState, tierAction] = useActionState(setBlobTierAction, initialState);
  const [selectedTier, setSelectedTier] = useState<BlobTier>('Hot');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [completedOperations, setCompletedOperations] = useState<string[]>([]);
  const [failedOperations, setFailedOperations] = useState<{ blob: string; error: string }[]>([]);

  const isSingleBlob = blobs.length === 1;
  const isPending = isSubmitting;

  // Get current tier distribution
  const tierDistribution = blobs.reduce((acc, blob) => {
    const tier = blob.properties.accessTier || 'Hot';
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const processNextBlob = useCallback(async (index: number) => {
    if (index >= blobs.length) return;
    
    const blob = blobs[index];
    const formData = new FormData();
    formData.append('containerName', containerName);
    formData.append('blobName', blob.name);
    formData.append('tier', selectedTier);
    
    startTransition(() => {
      tierAction(formData);
    });
  }, [containerName, selectedTier, blobs, tierAction]);

  // Handle successful tier change
  useEffect(() => {
    if (tierState.success && !isSubmitting && processingIndex >= 0) {
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
        onTierChanged?.();
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1000);
      }
    }
  }, [tierState.success, isSubmitting, processingIndex, blobs, completedOperations, onOpenChange, onTierChanged, processNextBlob]);

  // Handle tier change error
  useEffect(() => {
    if (tierState.error && !isSubmitting && processingIndex >= 0) {
      const failedBlob = blobs[processingIndex]?.name;
      if (failedBlob) {
        setFailedOperations(prev => [...prev, { blob: failedBlob, error: tierState.error || 'Unknown error' }]);
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
          if (completedOperations.length === 0) {
            onOpenChange(false);
            resetState();
          }
        }, 2000);
      }
    }
  }, [tierState.error, isSubmitting, processingIndex, blobs, completedOperations.length, onOpenChange, processNextBlob]);

  const resetState = () => {
    setProcessingIndex(-1);
    setCompletedOperations([]);
    setFailedOperations([]);
    setIsSubmitting(false);
    setSelectedTier('Hot');
  };

  const handleChangeTier = async () => {
    if (blobs.length === 0) return;
    
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
      return `Changing ${blob.name} to ${selectedTier}...`;
    }
    return '';
  };

  const getTierIcon = (tier: BlobTier) => {
    const Icon = TIER_INFO[tier].icon;
    return <Icon className={`h-4 w-4 ${TIER_INFO[tier].color}`} />;
  };

  const getCostIndicator = (costLevel: 'lowest' | 'medium' | 'highest') => {
    switch (costLevel) {
      case 'lowest':
        return <TrendingDown className="h-3 w-3 text-green-600" />;
      case 'medium':
        return <div className="h-3 w-3 bg-yellow-500 rounded-full" />;
      case 'highest':
        return <TrendingUp className="h-3 w-3 text-red-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Manage Access Tier - {isSingleBlob ? blobs[0]?.name : `${blobs.length} Blobs`}
          </DialogTitle>
          <DialogDescription>
            Change the access tier to optimize storage costs and access patterns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Tier Distribution */}
          <div className="space-y-3">
            <Label>Current Tier Distribution</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(tierDistribution).map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                  {getTierIcon(tier as BlobTier)}
                  <span className="text-sm font-medium">{tier}</span>
                  <Badge variant={TIER_INFO[tier as BlobTier].badgeVariant} className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Total size: {formatBytes(getTotalSize())}
            </div>
          </div>

          {/* Tier Selection */}
          <div className="space-y-3">
            <Label htmlFor="targetTier">Target Access Tier</Label>
            <Select
              value={selectedTier}
              onValueChange={(value: BlobTier) => setSelectedTier(value)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select access tier" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIER_INFO).map(([tier, info]) => (
                  <SelectItem key={tier} value={tier}>
                    <div className="flex items-center gap-2">
                      <info.icon className={`h-4 w-4 ${info.color}`} />
                      <span>{tier}</span>
                      {getCostIndicator(info.costLevel)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Tier Information */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                {getTierIcon(selectedTier)}
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">{selectedTier} Tier</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {TIER_INFO[selectedTier].description}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Storage Cost:</span>
                      {getCostIndicator(TIER_INFO[selectedTier].costLevel)}
                      <span className="capitalize">{TIER_INFO[selectedTier].costLevel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Access:</span>
                      <span className="capitalize">{TIER_INFO[selectedTier].accessSpeed}</span>
                    </div>
                    {TIER_INFO[selectedTier].rehydrationTime && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Rehydration:</span>
                        <span>{TIER_INFO[selectedTier].rehydrationTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Archive Warning */}
            {selectedTier === 'Archive' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Archive Tier Notice:</strong> Blobs in the Archive tier cannot be read or modified until rehydrated.
                  Rehydration can take 1-15 hours and incurs additional charges. Choose a rehydration priority when accessing archived blobs.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Blob List */}
          {!isSingleBlob && (
            <div className="space-y-2">
              <Label>Blobs to Update ({blobs.length})</Label>
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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate">{blob.name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getTierIcon(blob.properties.accessTier || 'Hot')}
                        <span className="text-xs text-muted-foreground">
                          {blob.properties.accessTier || 'Hot'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(blob.properties.contentLength)}
                      </span>
                      {index === processingIndex && isPending && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {completedOperations.includes(blob.name) && (
                        <span className="text-green-600">✓</span>
                      )}
                      {failedOperations.find(f => f.blob === blob.name) && (
                        <span className="text-red-600">✗</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              {isPending && (
                <p className="text-xs text-muted-foreground">
                  {getCurrentOperationText()}
                </p>
              )}
            </div>
          )}

          {/* Failed Operations */}
          {failedOperations.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <Info className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <p className="font-medium text-sm">Some tier changes failed:</p>
                <div className="mt-2 space-y-1 max-h-20 overflow-y-auto text-xs">
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
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                <p className="font-medium text-sm">
                  Successfully changed access tier for {completedOperations.length} of {blobs.length} blobs to {selectedTier}
                </p>
              </AlertDescription>
            </Alert>
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
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleChangeTier}
            disabled={isPending || blobs.length === 0}
            className="min-w-[140px]"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Updating...
              </>
            ) : (
              <>
                <Thermometer className="h-4 w-4 mr-1" />
                Change to {selectedTier}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
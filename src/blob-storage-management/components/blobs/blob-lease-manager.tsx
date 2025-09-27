'use client';

import { useState, useEffect } from 'react';
import { useActionState, startTransition } from 'react';
import { manageBlobLeaseAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Lock, 
  Unlock, 
  Info, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Shield,
  Key,
  Timer,
  StopCircle
} from 'lucide-react';
import { BlobItem } from '@/types/azure-types';

interface BlobLeaseManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blob: BlobItem;
  containerName: string;
  onLeaseChanged?: () => void;
}

interface LeaseActionState {
  success: boolean;
  error?: string;
  data?: {
    leaseId?: string;
    leaseTime?: Date;
    leaseDuration?: number;
  };
}

const initialState: LeaseActionState = {
  success: false,
  error: undefined,
  data: undefined,
};

type LeaseOperation = 'acquire' | 'renew' | 'change' | 'release' | 'break';


export function BlobLeaseManager({
  open,
  onOpenChange,
  blob,
  containerName,
  onLeaseChanged
}: BlobLeaseManagerProps) {
  const [leaseState, leaseAction] = useActionState(manageBlobLeaseAction, initialState);
  const [operation, setOperation] = useState<LeaseOperation>('acquire');
  const [leaseDuration, setLeaseDuration] = useState(30);
  const [proposedLeaseId, setProposedLeaseId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLeased = blob.properties.leaseStatus === 'locked';
  const leaseState_current = blob.properties.leaseState;

  useEffect(() => {
    if (open) {
      // Initialize operation based on current lease status
      if (isLeased) {
        setOperation('release');
      } else {
        setOperation('acquire');
      }
      setProposedLeaseId('');
    }
  }, [open, isLeased]);

  useEffect(() => {
    if (leaseState.success && !isSubmitting) {
      onLeaseChanged?.();
      setIsSubmitting(false);
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 1500);
    }
  }, [leaseState.success]);

  useEffect(() => {
    if (leaseState.error && isSubmitting) {
      setIsSubmitting(false);
    }
  }, [leaseState.error]);

  const resetState = () => {
    setIsSubmitting(false);
    setOperation('acquire');
    setLeaseDuration(30);
    setProposedLeaseId('');
  };

  const handleLeaseOperation = async () => {
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('operation', operation);
    formData.append('containerName', containerName);
    formData.append('blobName', blob.name);
    formData.append('leaseDuration', leaseDuration.toString());
    
    if (proposedLeaseId) {
      formData.append('proposedLeaseId', proposedLeaseId);
    }
    
    // For renew, change, release, break operations, we'd need the current lease ID
    // This would typically be stored or retrieved from blob properties
    if (['renew', 'change', 'release', 'break'].includes(operation)) {
      // In a real implementation, this would come from the blob's lease ID
      formData.append('leaseId', 'current-lease-id');
    }
    
    startTransition(() => {
      leaseAction(formData);
    });
  };

  const getLeaseStatusIcon = () => {
    if (isLeased) {
      return <Lock className="h-4 w-4 text-red-600" />;
    }
    return <Unlock className="h-4 w-4 text-green-600" />;
  };

  const getLeaseStatusColor = () => {
    if (isLeased) {
      return 'text-red-600';
    }
    return 'text-green-600';
  };

  const getOperationDescription = (op: LeaseOperation): string => {
    switch (op) {
      case 'acquire':
        return 'Lock the blob to prevent other clients from modifying it';
      case 'renew':
        return 'Extend the lease duration to prevent expiration';
      case 'change':
        return 'Change the lease ID while maintaining the lock';
      case 'release':
        return 'Release the lease and allow other clients to modify the blob';
      case 'break':
        return 'Forcefully break the lease (may have delay based on remaining time)';
      default:
        return '';
    }
  };

  const getOperationIcon = (op: LeaseOperation) => {
    switch (op) {
      case 'acquire':
        return <Lock className="h-4 w-4" />;
      case 'renew':
        return <Timer className="h-4 w-4" />;
      case 'change':
        return <Key className="h-4 w-4" />;
      case 'release':
        return <Unlock className="h-4 w-4" />;
      case 'break':
        return <StopCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const canPerformOperation = (op: LeaseOperation): boolean => {
    switch (op) {
      case 'acquire':
        return !isLeased;
      case 'renew':
      case 'change':
      case 'release':
        return isLeased && leaseState_current === 'leased';
      case 'break':
        return isLeased;
      default:
        return false;
    }
  };

  const getAvailableOperations = (): LeaseOperation[] => {
    if (!isLeased) {
      return ['acquire'];
    } else {
      const ops: LeaseOperation[] = ['release', 'break'];
      if (leaseState_current === 'leased') {
        ops.unshift('renew', 'change');
      }
      return ops;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Blob Lease - {blob.name}
          </DialogTitle>
          <DialogDescription>
            Control exclusive access to the blob through lease management
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Lease Status */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Current Lease Status</Label>
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getLeaseStatusIcon()}
                  <span className={`font-medium ${getLeaseStatusColor()}`}>
                    {isLeased ? 'Locked' : 'Available'}
                  </span>
                </div>
                <Badge variant={isLeased ? 'destructive' : 'default'} className="gap-1">
                  {blob.properties.leaseStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Lease State:</span>
                  <div className="font-medium capitalize">{blob.properties.leaseState}</div>
                </div>
                {blob.properties.leaseDuration && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Duration:</span>
                    <div className="font-medium">
                      {blob.properties.leaseDuration === 'infinite' ? 'Infinite' : '30-60 seconds'}
                    </div>
                  </div>
                )}
              </div>

              {/* Lease Information */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {isLeased ? (
                    <>
                      This blob is currently leased and cannot be modified by other clients. 
                      The lease may expire automatically or can be explicitly released.
                    </>
                  ) : (
                    <>
                      This blob is available for modification. You can acquire a lease to prevent 
                      other clients from modifying it during critical operations.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Operation Selection */}
          <div className="space-y-3">
            <Label htmlFor="operation">Lease Operation</Label>
            <Select
              value={operation}
              onValueChange={(value: LeaseOperation) => setOperation(value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableOperations().map(op => (
                  <SelectItem key={op} value={op} disabled={!canPerformOperation(op)}>
                    <div className="flex items-center gap-2">
                      {getOperationIcon(op)}
                      <span className="capitalize">{op} Lease</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="bg-muted/20 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                {getOperationDescription(operation)}
              </p>
            </div>
          </div>

          {/* Operation-specific Options */}
          {operation === 'acquire' && (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-3">
                <Label htmlFor="leaseDuration">Lease Duration (seconds)</Label>
                <Select
                  value={leaseDuration.toString()}
                  onValueChange={(value) => setLeaseDuration(parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">60 seconds (1 minute)</SelectItem>
                    <SelectItem value="-1">Infinite</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose lease duration. Infinite leases must be explicitly released.
                </p>
              </div>
            </div>
          )}

          {(operation === 'acquire' || operation === 'change') && (
            <div className="space-y-3">
              <Label htmlFor="proposedLeaseId">
                {operation === 'acquire' ? 'Proposed Lease ID (Optional)' : 'New Lease ID'}
              </Label>
              <Input
                id="proposedLeaseId"
                value={proposedLeaseId}
                onChange={(e) => setProposedLeaseId(e.target.value)}
                placeholder="Enter custom lease ID or leave blank for auto-generated"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {operation === 'acquire' 
                  ? 'Optionally specify a lease ID, otherwise one will be generated automatically'
                  : 'Specify the new lease ID to replace the current one'
                }
              </p>
            </div>
          )}

          {/* Warnings */}
          {operation === 'break' && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                <strong>Breaking a lease</strong> may cause a delay before the lease is broken, 
                depending on the remaining lease time. This operation should be used carefully.
              </AlertDescription>
            </Alert>
          )}

          {operation === 'release' && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                <strong>Releasing the lease</strong> will immediately allow other clients to modify the blob. 
                Ensure any critical operations are complete.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {leaseState.error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 text-sm">
                Failed to {operation} lease: {leaseState.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {leaseState.success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 text-sm">
                Successfully performed {operation} operation!
                {leaseState.data?.leaseId && (
                  <div className="mt-1 text-xs font-mono bg-green-100 p-1 rounded">
                    Lease ID: {leaseState.data.leaseId}
                  </div>
                )}
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleLeaseOperation}
            disabled={isSubmitting || !canPerformOperation(operation)}
            className="min-w-[120px]"
            variant={operation === 'break' ? 'destructive' : 'default'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Processing...
              </>
            ) : (
              <>
                {getOperationIcon(operation)}
                <span className="ml-1 capitalize">{operation} Lease</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
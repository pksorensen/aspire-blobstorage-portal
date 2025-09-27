'use client';

import { useActionState, useRef } from 'react';
import { deleteContainerAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface DeleteContainerModalProps {
  containerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

const initialState = {
  success: false,
  error: undefined,
  data: undefined,
};

export function DeleteContainerModal({ 
  containerName, 
  open, 
  onOpenChange, 
  onDeleted 
}: DeleteContainerModalProps) {
  const [state, formAction, pending] = useActionState(deleteContainerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle successful deletion
  if (state.success && !pending) {
    setTimeout(() => {
      onOpenChange(false);
      onDeleted?.();
      formRef.current?.reset();
    }, 100);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Container
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. All blobs in this container will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-4">
            <div className="flex items-center gap-2 text-destructive font-medium mb-2">
              <AlertCircle className="h-4 w-4" />
              Warning: Permanent Deletion
            </div>
            <p className="text-sm text-muted-foreground">
              You are about to delete the container <strong>&quot;{containerName}&quot;</strong> and all of its contents.
              This action cannot be reversed.
            </p>
          </div>

          <form ref={formRef} action={formAction} className="space-y-4">
            <input type="hidden" name="name" value={containerName} />
            
            <div className="space-y-2">
              <Label htmlFor="confirmName">
                Type <strong>{containerName}</strong> to confirm deletion
              </Label>
              <Input
                id="confirmName"
                name="confirmName"
                placeholder={containerName}
                required
                disabled={pending}
                pattern={`^${containerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`}
                aria-describedby="confirm-error"
              />
            </div>

            {state.error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {state.error}
              </div>
            )}

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
                type="submit" 
                variant="destructive" 
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Container
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
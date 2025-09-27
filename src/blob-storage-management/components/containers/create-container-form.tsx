'use client';

import { useActionState, useRef } from 'react';
import { createContainerAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Loader2, Plus } from 'lucide-react';

interface CreateContainerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState = {
  success: false,
  error: undefined,
  data: undefined,
};

export function CreateContainerForm({ open, onOpenChange }: CreateContainerFormProps) {
  const [state, formAction, pending] = useActionState(createContainerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle successful creation
  if (state.success && !pending) {
    // Close dialog and reset form
    setTimeout(() => {
      onOpenChange(false);
      formRef.current?.reset();
    }, 100);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Container
          </DialogTitle>
          <DialogDescription>
            Create a new blob storage container. Container names must be lowercase and between 3-63 characters.
          </DialogDescription>
        </DialogHeader>
        
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Container Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="my-container"
              required
              pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"
              minLength={3}
              maxLength={63}
              disabled={pending}
              className="lowercase"
              aria-describedby="name-error"
            />
            <p className="text-xs text-muted-foreground">
              Must be lowercase alphanumeric with hyphens, cannot start/end with hyphen
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicAccess">Public Access Level</Label>
            <Select name="publicAccess" defaultValue="none" disabled={pending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Private (No public access)</SelectItem>
                <SelectItem value="blob">Blob (Public read access for blobs only)</SelectItem>
                <SelectItem value="container">Container (Public read access for container and blobs)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls anonymous access to container contents
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadata-description">Metadata (Optional)</Label>
            <div className="space-y-2">
              <Input
                name="metadata.description"
                placeholder="Description"
                disabled={pending}
              />
              <Input
                name="metadata.department"
                placeholder="Department"
                disabled={pending}
              />
              <Input
                name="metadata.project"
                placeholder="Project"
                disabled={pending}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Add custom metadata key-value pairs
            </p>
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
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Container
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
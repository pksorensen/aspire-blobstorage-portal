'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Upload, 
  Download, 
  Copy, 
  Settings, 
  MoreHorizontal,
  FolderPlus,
  FileUp,
  Link
} from 'lucide-react';
import { CreateContainerForm } from './create-container-form';
import { DeleteContainerModal } from './delete-container-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ContainerActionToolbarProps {
  selectedContainers?: string[];
  onRefresh?: () => void;
  onContainerDeleted?: () => void;
  className?: string;
}

export function ContainerActionToolbar({ 
  selectedContainers = [], 
  onRefresh,
  onContainerDeleted,
  className 
}: ContainerActionToolbarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const hasSelection = selectedContainers.length > 0;
  const singleSelection = selectedContainers.length === 1;
  const multiSelection = selectedContainers.length > 1;

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        // Add a small delay to show the loading state
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  const handleDeleteContainer = () => {
    if (singleSelection) {
      setShowDeleteModal(true);
    }
  };

  return (
    <>
      <div className={cn(
        "flex items-center gap-1 p-2 border-b bg-background",
        className
      )}>
        {/* Primary Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Container
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create new container</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh container list</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Selection-dependent Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={!singleSelection}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasSelection ? "Upload blobs to selected container" : "Select a container first"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={!singleSelection}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasSelection ? "Download container contents" : "Select a container first"}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={!hasSelection}
                onClick={handleDeleteContainer}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                {multiSelection ? `Delete (${selectedContainers.length})` : 'Delete'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasSelection ? "Delete selected container(s)" : "Select a container first"}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />

        {/* Secondary Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={!singleSelection}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasSelection ? "Copy container properties" : "Select a container first"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                disabled={!singleSelection}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasSelection ? "Container settings" : "Select a container first"}</TooltipContent>
          </Tooltip>

          {/* More Actions Menu */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled={!singleSelection}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Virtual Directory
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!singleSelection}>
                <FileUp className="h-4 w-4 mr-2" />
                Upload Folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!singleSelection}>
                <Link className="h-4 w-4 mr-2" />
                Generate SAS URL
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!singleSelection}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Access URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!singleSelection}>
                <Settings className="h-4 w-4 mr-2" />
                Access Policy
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!singleSelection}>
                <Settings className="h-4 w-4 mr-2" />
                CORS Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modals */}
      <CreateContainerForm 
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
      />

      {singleSelection && (
        <DeleteContainerModal
          containerName={selectedContainers[0]}
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onDeleted={onContainerDeleted}
        />
      )}
    </>
  );
}

// Simplified toolbar for when no containers exist yet
export function EmptyStateToolbar({ onRefresh, className }: { 
  onRefresh?: () => void; 
  className?: string; 
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  return (
    <>
      <div className={cn(
        "flex items-center justify-center gap-4 p-8 border-b bg-muted/20",
        className
      )}>
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">No containers found</h3>
            <p className="text-sm text-muted-foreground">
              Create your first container to start storing blobs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Container
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <CreateContainerForm 
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
      />
    </>
  );
}
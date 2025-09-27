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
import { Download, ExternalLink, Loader2, ChevronDown, FileText, Image, Video } from 'lucide-react';
import { BlobItem } from '@/types/azure-types';
import { downloadBlobStreamAction } from '@/lib/actions/form-action-wrappers';
import { useActionState } from 'react';

interface BlobDownloadButtonProps {
  containerName: string;
  blob: BlobItem;
  variant?: 'button' | 'dropdown';
  className?: string;
}

const initialState = {
  success: false,
  error: undefined,
  data: undefined,
};

export function BlobDownloadButton({ 
  containerName, 
  blob, 
  variant = 'button',
  className 
}: BlobDownloadButtonProps) {
  const [downloadState, downloadAction, downloadPending] = useActionState(downloadBlobStreamAction, initialState);
  const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

  const handleDirectDownload = async () => {
    const formData = new FormData();
    formData.append('containerName', containerName);
    formData.append('blobName', blob.name);
    
    try {
      await downloadAction(formData);
      
      // If successful, trigger browser download
      if (downloadState.success && downloadState.data?.downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadState.data.downloadUrl;
        link.download = blob.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleOpenInNewTab = async () => {
    setIsGeneratingUrl(true);
    
    try {
      const formData = new FormData();
      formData.append('containerName', containerName);
      formData.append('blobName', blob.name);
      
      await downloadAction(formData);
      
      if (downloadState.success && downloadState.data?.downloadUrl) {
        window.open(downloadState.data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to open in new tab:', error);
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  const handleCopyDownloadLink = async () => {
    setIsGeneratingUrl(true);
    
    try {
      const formData = new FormData();
      formData.append('containerName', containerName);
      formData.append('blobName', blob.name);
      
      await downloadAction(formData);
      
      if (downloadState.success && downloadState.data?.downloadUrl) {
        await navigator.clipboard.writeText(downloadState.data.downloadUrl);
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error('Failed to copy download link:', error);
    } finally {
      setIsGeneratingUrl(false);
    }
  };

  const getFileIcon = () => {
    const contentType = blob.properties.contentType.toLowerCase();
    
    if (contentType.startsWith('image/')) return <Image className="h-3 w-3" />;
    if (contentType.startsWith('video/')) return <Video className="h-3 w-3" />;
    if (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml')) {
      return <FileText className="h-3 w-3" />;
    }
    return <Download className="h-3 w-3" />;
  };

  const isPreviewable = () => {
    const contentType = blob.properties.contentType.toLowerCase();
    return contentType.startsWith('image/') || 
           contentType.startsWith('text/') || 
           contentType.includes('json') ||
           contentType.includes('xml') ||
           contentType.includes('pdf');
  };

  if (variant === 'button') {
    return (
      <Button
        onClick={handleDirectDownload}
        disabled={downloadPending}
        size="sm"
        variant="outline"
        className={className}
      >
        {downloadPending ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Download className="h-3 w-3 mr-1" />
        )}
        Download
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={downloadPending || isGeneratingUrl}
          className={className}
        >
          {downloadPending || isGeneratingUrl ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <>
              {getFileIcon()}
              <span className="ml-1 mr-1">Download</span>
            </>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleDirectDownload} disabled={downloadPending}>
          <Download className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Download File</span>
            <span className="text-xs text-muted-foreground">Save to your computer</span>
          </div>
        </DropdownMenuItem>

        {isPreviewable() && (
          <DropdownMenuItem onClick={handleOpenInNewTab} disabled={isGeneratingUrl}>
            <ExternalLink className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Open in New Tab</span>
              <span className="text-xs text-muted-foreground">Preview in browser</span>
            </div>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopyDownloadLink} disabled={isGeneratingUrl}>
          <ExternalLink className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Copy Download Link</span>
            <span className="text-xs text-muted-foreground">Share with others</span>
          </div>
        </DropdownMenuItem>

        {downloadState.error && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-xs text-destructive">
              Error: {downloadState.error}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
'use client';

import { useActionState, useRef, useState } from 'react';
import { uploadBlobAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CloudUpload, File, Loader2, Upload, X } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface FileUploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerName: string;
  onUploadComplete?: (fileName: string, size: number) => void;
}

interface SelectedFile {
  file: File;
  preview?: string;
}

const initialState = {
  success: false,
  error: undefined,
  data: undefined,
};

const ALLOWED_FILE_TYPES = [
  'image/*',
  'text/*',
  'application/json',
  'application/pdf',
  'application/xml',
  'application/zip',
  'video/*',
  'audio/*',
];

const ACCESS_TIERS = [
  { value: 'Hot', label: 'Hot - Frequently accessed data', description: 'Optimized for frequent access' },
  { value: 'Cool', label: 'Cool - Infrequently accessed data', description: 'Lower storage cost, higher access cost' },
  { value: 'Archive', label: 'Archive - Rarely accessed data', description: 'Lowest cost, highest access latency' },
];

export function FileUploadForm({ open, onOpenChange, containerName, onUploadComplete }: FileUploadFormProps) {
  const [state, formAction, pending] = useActionState(uploadBlobAction, initialState);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [customBlobName, setCustomBlobName] = useState('');
  const [useCustomName, setUseCustomName] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle successful upload
  if (state.success && state.data && !pending) {
    onUploadComplete?.(state.data.name, state.data.size);
    // Close dialog and reset form
    setTimeout(() => {
      onOpenChange(false);
      resetForm();
    }, 100);
  }

  const resetForm = () => {
    setSelectedFile(null);
    setCustomBlobName('');
    setUseCustomName(false);
    formRef.current?.reset();
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileObj: SelectedFile = { file };
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fileObj.preview = e.target?.result as string;
        setSelectedFile({ ...fileObj });
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(fileObj);
    }
    
    // Set default blob name to file name
    if (!useCustomName) {
      setCustomBlobName(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setCustomBlobName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('zip')) return '📦';
    if (file.type.includes('json') || file.type.includes('xml')) return '📋';
    return '📄';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File to {containerName}
          </DialogTitle>
          <DialogDescription>
            Upload files to your blob storage container. Files will be stored with configurable access tiers.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-6">
          <input type="hidden" name="containerName" value={containerName} />
          
          {/* File Selection Area */}
          <div className="space-y-4">
            <Label>File Selection</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : selectedFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="text-center space-y-4">
                  {/* File Preview */}
                  <div className="flex items-center justify-center">
                    {selectedFile.preview ? (
                      <img
                        src={selectedFile.preview}
                        alt="Preview"
                        className="max-h-32 max-w-48 object-contain rounded"
                      />
                    ) : (
                      <div className="text-6xl">{getFileIcon(selectedFile.file)}</div>
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="space-y-2">
                    <p className="font-medium text-sm flex items-center justify-center gap-2">
                      <File className="h-4 w-4" />
                      {selectedFile.file.name}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Size: {formatBytes(selectedFile.file.size)}</p>
                      <p>Type: {selectedFile.file.type || 'Unknown'}</p>
                      <p>Last Modified: {selectedFile.file.lastModified ? new Date(selectedFile.file.lastModified).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeFile}
                      className="mt-2"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <CloudUpload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Drag and drop a file here</p>
                    <p className="text-xs text-muted-foreground">or click to browse files</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={pending}
                    >
                      Browse Files
                    </Button>
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                className="hidden"
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={pending}
              />
            </div>
          </div>

          {selectedFile && (
            <>
              {/* Blob Name Configuration */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useCustomName"
                    checked={useCustomName}
                    onChange={(e) => setUseCustomName(e.target.checked)}
                    disabled={pending}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="useCustomName" className="text-sm">
                    Use custom blob name
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="blobName">Blob Name</Label>
                  <Input
                    id="blobName"
                    name="blobName"
                    value={useCustomName ? customBlobName : selectedFile.file.name}
                    onChange={(e) => setCustomBlobName(e.target.value)}
                    placeholder="Enter blob name"
                    required
                    disabled={pending || !useCustomName}
                    maxLength={1024}
                  />
                  <p className="text-xs text-muted-foreground">
                    The name that will be used to store the file in the container
                  </p>
                </div>
              </div>

              {/* Access Tier Selection */}
              <div className="space-y-2">
                <Label htmlFor="tier">Access Tier</Label>
                <Select name="tier" defaultValue="Hot" disabled={pending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_TIERS.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        <div className="space-y-1">
                          <div className="font-medium">{tier.label}</div>
                          <div className="text-xs text-muted-foreground">{tier.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Type Override */}
              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type (Optional)</Label>
                <Input
                  id="contentType"
                  name="contentType"
                  placeholder={selectedFile.file.type || 'application/octet-stream'}
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Override the automatically detected content type
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <Label>Metadata (Optional)</Label>
                <div className="space-y-2">
                  <Input
                    name="metadata.description"
                    placeholder="Description"
                    disabled={pending}
                  />
                  <Input
                    name="metadata.author"
                    placeholder="Author"
                    disabled={pending}
                  />
                  <Input
                    name="metadata.department"
                    placeholder="Department"
                    disabled={pending}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Add custom metadata to the uploaded file
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags (Optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    name="tags.environment"
                    placeholder="Environment (e.g., prod, dev)"
                    disabled={pending}
                  />
                  <Input
                    name="tags.version"
                    placeholder="Version"
                    disabled={pending}
                  />
                  <Input
                    name="tags.category"
                    placeholder="Category"
                    disabled={pending}
                  />
                  <Input
                    name="tags.project"
                    placeholder="Project"
                    disabled={pending}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Add searchable tags to organize your files
                </p>
              </div>
            </>
          )}

          {/* Error Display */}
          {state.error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {state.error}
            </div>
          )}

          {/* Success Message */}
          {state.success && state.data && !pending && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-3 rounded-md">
              <Upload className="h-4 w-4" />
              Successfully uploaded {state.data.name} ({formatBytes(state.data.size)})
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !selectedFile}
              className="min-w-[120px]"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload File
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
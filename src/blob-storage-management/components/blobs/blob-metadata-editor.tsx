'use client';

import { useState, useEffect } from 'react';
import { useActionState, startTransition } from 'react';
import { updateBlobMetadataAction, updateBlobTagsAction } from '@/lib/actions/form-action-wrappers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, X, Tag, Database, Info, AlertCircle, Check } from 'lucide-react';
import { BlobItem, ActionResult } from '@/types/azure-types';

interface BlobMetadataEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blob: BlobItem;
  containerName: string;
  onMetadataChanged?: () => void;
}

const initialState: ActionResult = {
  success: false,
  error: undefined,
  data: undefined,
};

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  isNew: boolean;
  isModified: boolean;
}

export function BlobMetadataEditor({
  open,
  onOpenChange,
  blob,
  containerName,
  onMetadataChanged
}: BlobMetadataEditorProps) {
  const [metadataState, metadataAction] = useActionState(updateBlobMetadataAction, initialState);
  const [tagsState, tagsAction] = useActionState(updateBlobTagsAction, initialState);
  
  const [metadataItems, setMetadataItems] = useState<KeyValuePair[]>([]);
  const [tagItems, setTagItems] = useState<KeyValuePair[]>([]);
  const [activeTab, setActiveTab] = useState<'metadata' | 'tags'>('metadata');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize items when dialog opens
  useEffect(() => {
    if (open) {
      // Initialize metadata
      const initialMetadata = Object.entries(blob.metadata || {}).map(([key, value], index) => ({
        id: `metadata-${index}`,
        key,
        value,
        isNew: false,
        isModified: false,
      }));
      setMetadataItems(initialMetadata);

      // Initialize tags
      const initialTags = Object.entries(blob.tags || {}).map(([key, value], index) => ({
        id: `tag-${index}`,
        key,
        value,
        isNew: false,
        isModified: false,
      }));
      setTagItems(initialTags);
    }
  }, [open, blob]);

  // Handle successful metadata update
  useEffect(() => {
    if (metadataState.success && !isSubmitting) {
      onMetadataChanged?.();
      setIsSubmitting(false);
      // Show success for a moment, then close
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 1500);
    }
  }, [metadataState.success, isSubmitting, onMetadataChanged, onOpenChange]);

  // Handle successful tags update
  useEffect(() => {
    if (tagsState.success && !isSubmitting) {
      onMetadataChanged?.();
      setIsSubmitting(false);
      // Show success for a moment, then close
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 1500);
    }
  }, [tagsState.success, isSubmitting, onMetadataChanged, onOpenChange]);

  // Handle errors
  useEffect(() => {
    if ((metadataState.error || tagsState.error) && isSubmitting) {
      setIsSubmitting(false);
    }
  }, [metadataState.error, tagsState.error, isSubmitting]);

  const resetState = () => {
    setValidationErrors({});
    setIsSubmitting(false);
    setActiveTab('metadata');
  };

  const addItem = (type: 'metadata' | 'tags') => {
    const newItem: KeyValuePair = {
      id: `${type}-new-${Date.now()}`,
      key: '',
      value: '',
      isNew: true,
      isModified: false,
    };

    if (type === 'metadata') {
      setMetadataItems(prev => [...prev, newItem]);
    } else {
      setTagItems(prev => [...prev, newItem]);
    }
  };

  const removeItem = (id: string, type: 'metadata' | 'tags') => {
    if (type === 'metadata') {
      setMetadataItems(prev => prev.filter(item => item.id !== id));
    } else {
      setTagItems(prev => prev.filter(item => item.id !== id));
    }
    
    // Clear any validation errors for this item
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${id}-key`];
      delete newErrors[`${id}-value`];
      return newErrors;
    });
  };

  const updateItem = (id: string, field: 'key' | 'value', value: string, type: 'metadata' | 'tags') => {
    const updateItems = type === 'metadata' ? setMetadataItems : setTagItems;
    
    updateItems(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            [field]: value, 
            isModified: !item.isNew // Only mark as modified if it's not a new item
          }
        : item
    ));

    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${id}-${field}`];
      return newErrors;
    });
  };

  const validateItems = (items: KeyValuePair[], type: 'metadata' | 'tags'): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Check for empty keys/values and duplicates
    const keys = new Set<string>();
    
    items.forEach(item => {
      if (!item.key.trim()) {
        errors[`${item.id}-key`] = 'Key cannot be empty';
        isValid = false;
      } else if (keys.has(item.key.toLowerCase())) {
        errors[`${item.id}-key`] = 'Duplicate key';
        isValid = false;
      } else {
        keys.add(item.key.toLowerCase());
      }

      if (!item.value.trim()) {
        errors[`${item.id}-value`] = 'Value cannot be empty';
        isValid = false;
      }

      // Azure-specific validations
      if (type === 'metadata') {
        if (item.key.length > 256) {
          errors[`${item.id}-key`] = 'Metadata key too long (max 256 chars)';
          isValid = false;
        }
        if (item.value.length > 8192) {
          errors[`${item.id}-value`] = 'Metadata value too long (max 8192 chars)';
          isValid = false;
        }
        // Metadata keys must be valid C# identifiers
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item.key)) {
          errors[`${item.id}-key`] = 'Invalid metadata key format';
          isValid = false;
        }
      } else if (type === 'tags') {
        if (item.key.length > 128) {
          errors[`${item.id}-key`] = 'Tag key too long (max 128 chars)';
          isValid = false;
        }
        if (item.value.length > 256) {
          errors[`${item.id}-value`] = 'Tag value too long (max 256 chars)';
          isValid = false;
        }
      }
    });

    // Check total count limits
    if (type === 'metadata' && items.length > 50) {
      errors['_form'] = 'Too many metadata items (max 50)';
      isValid = false;
    }
    if (type === 'tags' && items.length > 10) {
      errors['_form'] = 'Too many tags (max 10)';
      isValid = false;
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return isValid;
  };

  const handleSubmit = async () => {
    if (activeTab === 'metadata') {
      if (!validateItems(metadataItems, 'metadata')) return;
    } else {
      if (!validateItems(tagItems, 'tags')) return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('containerName', containerName);
    formData.append('blobName', blob.name);

    if (activeTab === 'metadata') {
      // Add metadata
      metadataItems.forEach(item => {
        if (item.key.trim() && item.value.trim()) {
          formData.append(`metadata.${item.key}`, item.value);
        }
      });
      
      startTransition(() => {
        metadataAction(formData);
      });
    } else {
      // Add tags
      tagItems.forEach(item => {
        if (item.key.trim() && item.value.trim()) {
          formData.append(`tags.${item.key}`, item.value);
        }
      });
      
      startTransition(() => {
        tagsAction(formData);
      });
    }
  };

  const renderItems = (items: KeyValuePair[], type: 'metadata' | 'tags') => {
    const Icon = type === 'metadata' ? Database : Tag;
    const currentState = type === 'metadata' ? metadataState : tagsState;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <Label className="text-base font-medium">
              {type === 'metadata' ? 'Metadata' : 'Tags'} ({items.length})
            </Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem(type)}
            disabled={isSubmitting}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add {type === 'metadata' ? 'Metadata' : 'Tag'}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {type} defined</p>
            <p className="text-xs">Click &quot;Add {type === 'metadata' ? 'Metadata' : 'Tag'}&quot; to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border ${
                  item.isNew 
                    ? 'border-blue-200 bg-blue-50/30' 
                    : item.isModified 
                    ? 'border-yellow-200 bg-yellow-50/30' 
                    : 'border-muted bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`${item.id}-key`} className="text-xs text-muted-foreground">
                          Key
                        </Label>
                        <Input
                          id={`${item.id}-key`}
                          value={item.key}
                          onChange={(e) => updateItem(item.id, 'key', e.target.value, type)}
                          placeholder={`Enter ${type === 'metadata' ? 'metadata' : 'tag'} key`}
                          disabled={isSubmitting}
                          className={`text-sm ${validationErrors[`${item.id}-key`] ? 'border-red-300 focus:border-red-300' : ''}`}
                        />
                        {validationErrors[`${item.id}-key`] && (
                          <p className="text-xs text-red-600 mt-1">{validationErrors[`${item.id}-key`]}</p>
                        )}
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`${item.id}-value`} className="text-xs text-muted-foreground">
                          Value
                        </Label>
                        <Input
                          id={`${item.id}-value`}
                          value={item.value}
                          onChange={(e) => updateItem(item.id, 'value', e.target.value, type)}
                          placeholder={`Enter ${type === 'metadata' ? 'metadata' : 'tag'} value`}
                          disabled={isSubmitting}
                          className={`text-sm ${validationErrors[`${item.id}-value`] ? 'border-red-300 focus:border-red-300' : ''}`}
                        />
                        {validationErrors[`${item.id}-value`] && (
                          <p className="text-xs text-red-600 mt-1">{validationErrors[`${item.id}-value`]}</p>
                        )}
                      </div>
                    </div>
                    {(item.isNew || item.isModified) && (
                      <div className="flex items-center gap-1 text-xs">
                        {item.isNew ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            <Plus className="h-2 w-2 mr-1" />
                            New
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            Modified
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id, type)}
                    disabled={isSubmitting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Validation Error Summary */}
        {validationErrors['_form'] && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 text-sm">
              {validationErrors['_form']}
            </AlertDescription>
          </Alert>
        )}

        {/* Action State Messages */}
        {currentState.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 text-sm">
              Failed to update {type}: {currentState.error}
            </AlertDescription>
          </Alert>
        )}

        {currentState.success && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 text-sm">
              {type === 'metadata' ? 'Metadata' : 'Tags'} updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Info about limits */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {type === 'metadata' ? (
              <>
                <strong>Metadata limits:</strong> Max 50 items, keys up to 256 chars, values up to 8KB.
                Keys must be valid C# identifiers (letters, numbers, underscore).
              </>
            ) : (
              <>
                <strong>Tag limits:</strong> Max 10 items, keys up to 128 chars, values up to 256 chars.
                Tags are indexed for search and filtering.
              </>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Edit Blob Properties - {blob.name}
          </DialogTitle>
          <DialogDescription>
            Manage custom metadata and tags for this blob
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'metadata' | 'tags')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="metadata" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Metadata ({metadataItems.length})
              </TabsTrigger>
              <TabsTrigger value="tags" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags ({tagItems.length})
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 overflow-y-auto max-h-[500px] pr-2">
              <TabsContent value="metadata" className="space-y-4 mt-0">
                {renderItems(metadataItems, 'metadata')}
              </TabsContent>

              <TabsContent value="tags" className="space-y-4 mt-0">
                {renderItems(tagItems, 'tags')}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <Separator />

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
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Save {activeTab === 'metadata' ? 'Metadata' : 'Tags'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
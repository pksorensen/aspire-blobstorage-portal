'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  File, 
  Calendar, 
  HardDrive, 
  Shield, 
  Tag, 
  Database, 
  Clock,
  FileText,
  Hash,
  Lock,
  Unlock,
  Thermometer,
  Snowflake,
  Archive,
  Copy,
  Info,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { BlobItem } from '@/types/azure-types';
import { formatBytes, formatDate } from '@/lib/utils';

interface BlobPropertiesPanelProps {
  blob: BlobItem;
  containerName: string;
  className?: string;
}

export function BlobPropertiesPanel({ blob, className }: BlobPropertiesPanelProps) {
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'Hot':
        return <Thermometer className="h-4 w-4 text-red-600" />;
      case 'Cool':
        return <Snowflake className="h-4 w-4 text-blue-600" />;
      case 'Archive':
        return <Archive className="h-4 w-4 text-gray-600" />;
      default:
        return <HardDrive className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTierBadgeVariant = (tier?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (tier) {
      case 'Hot':
        return 'destructive';
      case 'Cool':
        return 'default';
      case 'Archive':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getLeaseStatusIcon = (status: string) => {
    if (status === 'locked') {
      return <Lock className="h-4 w-4 text-red-600" />;
    }
    return <Unlock className="h-4 w-4 text-green-600" />;
  };

  const getLeaseStatusColor = (status: string) => {
    switch (status) {
      case 'locked':
        return 'text-red-600';
      case 'unlocked':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getCopyStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'aborted':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const renderPropertyRow = (label: string, value: React.ReactNode | Date | string | number | boolean, icon?: React.ReactNode, tooltip?: string) => {
    if (value === undefined || value === null || value === '') return null;

    const content = (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-sm font-medium text-right">
          {typeof value === 'boolean' ? (
            <Badge variant={value ? 'default' : 'outline'}>
              {value ? 'Yes' : 'No'}
            </Badge>
          ) : typeof value === 'object' && value instanceof Date ? (
            formatDate(value)
          ) : (
            value
          )}
        </div>
      </div>
    );

    if (tooltip) {
      return (
        <TooltipProvider key={label}>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <div key={label}>{content}</div>;
  };

  const renderMetadataItems = () => {
    const metadata = blob.metadata || {};
    const entries = Object.entries(metadata);

    if (entries.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No metadata defined</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-muted-foreground" />
              <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">{key}</code>
            </div>
            <span className="text-sm font-medium truncate max-w-[200px]" title={value}>
              {value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderTagItems = () => {
    const tags = blob.tags || {};
    const entries = Object.entries(tags);

    if (entries.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tags defined</p>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, value]) => (
          <Badge key={key} variant="outline" className="gap-1">
            <Tag className="h-3 w-3" />
            <span className="font-mono text-xs">{key}</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-xs">{value}</span>
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <File className="h-5 w-5" />
                Properties
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed information for {blob.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {blob.properties.accessTier && (
                <Badge variant={getTierBadgeVariant(blob.properties.accessTier)} className="gap-1">
                  {getTierIcon(blob.properties.accessTier)}
                  {blob.properties.accessTier}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                className="text-xs"
              >
                {showSensitiveInfo ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show Details
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-3 mt-4">
              {/* Basic Properties */}
              <div className="space-y-1">
                {renderPropertyRow('Name', blob.name, <FileText className="h-4 w-4" />)}
                {renderPropertyRow('Size', formatBytes(blob.properties.contentLength), <HardDrive className="h-4 w-4" />)}
                {renderPropertyRow('Content Type', blob.properties.contentType, <File className="h-4 w-4" />)}
                {renderPropertyRow('Blob Type', blob.properties.blobType, <File className="h-4 w-4" />)}
                
                <Separator />
                
                {renderPropertyRow('Last Modified', blob.properties.lastModified, <Calendar className="h-4 w-4" />)}
                {renderPropertyRow('Created On', blob.properties.createdOn, <Calendar className="h-4 w-4" />)}
                {blob.properties.lastAccessedOn && renderPropertyRow('Last Accessed', blob.properties.lastAccessedOn, <Clock className="h-4 w-4" />)}
                
                <Separator />
                
                {/* Access Tier Information */}
                {blob.properties.accessTier && (
                  <>
                    {renderPropertyRow('Access Tier', (
                      <div className="flex items-center gap-2">
                        {getTierIcon(blob.properties.accessTier)}
                        <span>{blob.properties.accessTier}</span>
                      </div>
                    ))}
                    {blob.properties.accessTierChangeTime && renderPropertyRow('Tier Changed', blob.properties.accessTierChangeTime, <Clock className="h-4 w-4" />)}
                    {blob.properties.accessTierInferred && renderPropertyRow('Tier Inferred', 'Yes', <Info className="h-4 w-4" />)}
                    {blob.properties.archiveStatus && renderPropertyRow('Archive Status', blob.properties.archiveStatus, <Archive className="h-4 w-4" />)}
                    {blob.properties.rehydratePriority && renderPropertyRow('Rehydrate Priority', blob.properties.rehydratePriority, <Archive className="h-4 w-4" />)}
                  </>
                )}

                <Separator />

                {/* Lease Information */}
                {renderPropertyRow('Lease Status', (
                  <div className={`flex items-center gap-2 ${getLeaseStatusColor(blob.properties.leaseStatus)}`}>
                    {getLeaseStatusIcon(blob.properties.leaseStatus)}
                    <span className="capitalize">{blob.properties.leaseStatus}</span>
                  </div>
                ))}
                {renderPropertyRow('Lease State', blob.properties.leaseState, <Lock className="h-4 w-4" />)}
                {blob.properties.leaseDuration && renderPropertyRow('Lease Duration', blob.properties.leaseDuration, <Clock className="h-4 w-4" />)}
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              {renderMetadataItems()}
            </TabsContent>

            <TabsContent value="tags" className="mt-4">
              {renderTagItems()}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-3 mt-4">
              {/* ETag and Version Info */}
              <div className="space-y-1">
                {showSensitiveInfo && (
                  <>
                    {renderPropertyRow('ETag', blob.properties.etag, <Hash className="h-4 w-4" />)}
                    {blob.versionId && renderPropertyRow('Version ID', blob.versionId, <Hash className="h-4 w-4" />)}
                    {renderPropertyRow('Is Current Version', blob.isCurrentVersion, <FileText className="h-4 w-4" />)}
                  </>
                )}

                <Separator />

                {/* Content Properties */}
                {blob.properties.contentEncoding && renderPropertyRow('Content Encoding', blob.properties.contentEncoding, <FileText className="h-4 w-4" />)}
                {blob.properties.contentLanguage && renderPropertyRow('Content Language', blob.properties.contentLanguage, <FileText className="h-4 w-4" />)}
                {blob.properties.contentDisposition && renderPropertyRow('Content Disposition', blob.properties.contentDisposition, <FileText className="h-4 w-4" />)}
                {blob.properties.cacheControl && renderPropertyRow('Cache Control', blob.properties.cacheControl, <Clock className="h-4 w-4" />)}

                <Separator />

                {/* Copy Information */}
                {blob.properties.copyStatus && (
                  <>
                    {renderPropertyRow('Copy Status', (
                      <div className="flex items-center gap-2">
                        {getCopyStatusIcon(blob.properties.copyStatus)}
                        <span className="capitalize">{blob.properties.copyStatus}</span>
                      </div>
                    ))}
                    {blob.properties.copySource && renderPropertyRow('Copy Source', blob.properties.copySource, <Copy className="h-4 w-4" />)}
                    {blob.properties.copyProgress && renderPropertyRow('Copy Progress', blob.properties.copyProgress, <Copy className="h-4 w-4" />)}
                    {blob.properties.copyCompletionTime && renderPropertyRow('Copy Completed', blob.properties.copyCompletionTime, <Calendar className="h-4 w-4" />)}
                    {blob.properties.copyId && showSensitiveInfo && renderPropertyRow('Copy ID', blob.properties.copyId, <Hash className="h-4 w-4" />)}
                  </>
                )}

                <Separator />

                {/* Security and Encryption */}
                {renderPropertyRow('Server Encrypted', blob.properties.serverEncrypted, <Shield className="h-4 w-4" />)}
                {blob.properties.encryptionScope && showSensitiveInfo && renderPropertyRow('Encryption Scope', blob.properties.encryptionScope, <Shield className="h-4 w-4" />)}
                {blob.properties.customerProvidedKeySha256 && showSensitiveInfo && renderPropertyRow('Customer Key SHA256', blob.properties.customerProvidedKeySha256, <Shield className="h-4 w-4" />)}

                <Separator />

                {/* Other Properties */}
                {blob.properties.tagCount && renderPropertyRow('Tag Count', blob.properties.tagCount, <Tag className="h-4 w-4" />)}
                {blob.properties.blobSequenceNumber && renderPropertyRow('Sequence Number', blob.properties.blobSequenceNumber, <Hash className="h-4 w-4" />)}
                {blob.properties.isSealed && renderPropertyRow('Is Sealed', blob.properties.isSealed, <Lock className="h-4 w-4" />)}
                {blob.properties.expiresOn && renderPropertyRow('Expires On', blob.properties.expiresOn, <Calendar className="h-4 w-4" />)}

                {/* Immutability and Legal Hold */}
                {blob.properties.immutabilityPolicyExpiresOn && (
                  <>
                    {renderPropertyRow('Immutability Expires', blob.properties.immutabilityPolicyExpiresOn, <Lock className="h-4 w-4" />)}
                    {renderPropertyRow('Immutability Mode', blob.properties.immutabilityPolicyMode, <Lock className="h-4 w-4" />)}
                  </>
                )}
                {blob.properties.legalHold && renderPropertyRow('Legal Hold', blob.properties.legalHold, <Shield className="h-4 w-4" />)}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
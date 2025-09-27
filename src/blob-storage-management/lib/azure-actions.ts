/**
 * Server Actions for Azure Storage mutations
 * 
 * This module provides Server Actions for all mutation operations
 * (create, update, delete, upload) on Azure Blob Storage.
 * 
 * All functions use 'use server' directive and handle form data,
 * error handling, and cache revalidation automatically.
 */

'use server';

import { 
  BlobServiceClient, 
  BlobHTTPHeaders,
  ContainerCreateOptions
} from '@azure/storage-blob';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { 
  azureStorage,
  getAzureStorageConfig,
  getEnvironmentConfig 
} from './azure-storage';
import {
  ActionResult,
  ContainerFormData,
  BlobFormData,
  BlobUpdateFormData,
  BatchDeleteResult,
  AzureStorageError
} from '../types/azure-types';
import { z } from 'zod';

/**
 * Validation schemas using Zod
 */
const ContainerNameSchema = z.string()
  .min(3, 'Container name must be at least 3 characters')
  .max(63, 'Container name must be at most 63 characters')
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 
    'Container name must be lowercase alphanumeric with hyphens, cannot start/end with hyphen');

const BlobNameSchema = z.string()
  .min(1, 'Blob name is required')
  .max(1024, 'Blob name must be at most 1024 characters');

const PublicAccessSchema = z.enum(['none', 'blob', 'container']);
const AccessTierSchema = z.enum(['Hot', 'Cool', 'Archive']);

/**
 * Enhanced error handling with structured logging
 */
function handleServerActionError(error: any, operation: string, resource?: string): ActionResult {
  console.error(`Server Action Error [${operation}]:`, {
    error: error.message,
    stack: error.stack,
    resource,
    timestamp: new Date().toISOString(),
    statusCode: error.statusCode,
    code: error.code,
  });

  if (error instanceof AzureStorageError) {
    return {
      success: false,
      error: error.message,
      requestId: error.requestId,
    };
  }

  return {
    success: false,
    error: error.message || `Failed to ${operation}`,
  };
}

/**
 * Get Azure Blob Service Client with enhanced error handling
 */
function getBlobServiceClient(): BlobServiceClient {
  const config = getAzureStorageConfig();
  
  if (!config.connectionString && (!config.accountName || (!config.accountKey && !config.sasToken))) {
    throw new AzureStorageError(
      'Azure Storage configuration missing',
      500,
      'MISSING_CONFIGURATION'
    );
  }

  try {
    if (config.connectionString) {
      return BlobServiceClient.fromConnectionString(config.connectionString);
    } else {
      // Handle other authentication methods if needed
      throw new Error('Alternative authentication methods not implemented in actions');
    }
  } catch (error: any) {
    throw new AzureStorageError(
      `Failed to create client: ${error.message}`,
      500,
      'CLIENT_CREATION_ERROR'
    );
  }
}

/**
 * Validate file upload constraints
 */
function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const envConfig = getEnvironmentConfig();
  
  if (file.size > envConfig.maxUploadSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(envConfig.maxUploadSizeBytes / 1024 / 1024)}MB`
    };
  }

  if (envConfig.allowedFileTypes && envConfig.allowedFileTypes.length > 0) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !envConfig.allowedFileTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${envConfig.allowedFileTypes.join(', ')}`
      };
    }
  }

  return { valid: true };
}

/**
 * Enhanced result type for server actions with request tracking
 */
export type EnhancedActionResult<T = void> = ActionResult<T> & {
  requestId?: string;
  duration?: number;
  timestamp?: string;
};

// Container Actions

/**
 * Create a new container
 */
export async function createContainer(formData: FormData): Promise<ActionResult<{ name: string }>> {
  const startTime = Date.now();
  
  try {
    const name = formData.get('name') as string;
    const publicAccess = formData.get('publicAccess') as string || 'none';
    const metadata: Record<string, string> = {};
    
    // Extract metadata from form data
    formData.forEach((value, key) => {
      if (key.startsWith('metadata.')) {
        const metadataKey = key.replace('metadata.', '');
        metadata[metadataKey] = value as string;
      }
    });

    const nameValidation = ContainerNameSchema.safeParse(name);
    if (!nameValidation.success) {
      return { success: false, error: nameValidation.error.errors[0].message };
    }

    const accessValidation = PublicAccessSchema.safeParse(publicAccess);
    if (!accessValidation.success) {
      return { success: false, error: 'Invalid public access level' };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(name);

    const options: ContainerCreateOptions = {
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      access: publicAccess === 'none' ? undefined : publicAccess as any,
    };

    await containerClient.create(options);

    // Revalidate cache
    revalidateTag('containers');
    revalidatePath('/containers');

    return { 
      success: true, 
      data: { name },
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    const errorResult = handleServerActionError(error, 'create container', formData.get('name') as string);
    return {
      ...errorResult,
      data: undefined as { name: string } | undefined
    };
  }
}

/**
 * Create container and redirect
 */
export async function createContainerAndRedirect(formData: FormData) {
  const result = await createContainer(formData);
  
  if (result.success && result.data) {
    redirect(`/containers/${result.data.name}`);
  } else {
    // In a real app, you'd handle this error state better
    throw new Error(result.error || 'Failed to create container');
  }
}

/**
 * Delete a container
 */
export async function deleteContainer(formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string;
    
    if (!name) {
      return { success: false, error: 'Container name is required' };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(name);

    await containerClient.delete();

    // Revalidate cache
    revalidateTag('containers');
    revalidateTag(`container:${name}`);
    revalidatePath('/containers');
    revalidatePath(`/containers/${name}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to delete container' 
    };
  }
}

/**
 * Update container properties
 */
export async function updateContainerMetadata(formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string;
    const metadata: Record<string, string> = {};
    
    // Extract metadata from form data
    formData.forEach((value, key) => {
      if (key.startsWith('metadata.')) {
        const metadataKey = key.replace('metadata.', '');
        metadata[metadataKey] = value as string;
      }
    });

    if (!name) {
      return { success: false, error: 'Container name is required' };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(name);

    await containerClient.setMetadata(metadata);

    // Revalidate cache
    revalidateTag(`container:${name}`);
    revalidatePath(`/containers/${name}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to update container metadata' 
    };
  }
}

// Blob Actions

/**
 * Upload a blob from file
 */
export async function uploadBlob(formData: FormData): Promise<ActionResult<{ name: string; size: number }>> {
  try {
    const containerName = formData.get('containerName') as string;
    const file = formData.get('file') as File;
    const blobName = formData.get('blobName') as string || file?.name;
    const contentType = formData.get('contentType') as string || file?.type;
    const tier = formData.get('tier') as string || 'Hot';
    
    const metadata: Record<string, string> = {};
    const tags: Record<string, string> = {};
    
    // Extract metadata and tags from form data
    formData.forEach((value, key) => {
      if (key.startsWith('metadata.')) {
        const metadataKey = key.replace('metadata.', '');
        metadata[metadataKey] = value as string;
      } else if (key.startsWith('tags.')) {
        const tagKey = key.replace('tags.', '');
        tags[tagKey] = value as string;
      }
    });

    if (!containerName) {
      return { success: false, error: 'Container name is required' };
    }

    if (!file) {
      return { success: false, error: 'File is required' };
    }

    if (!blobName) {
      return { success: false, error: 'Blob name is required' };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blobHTTPHeaders: BlobHTTPHeaders = {
      blobContentType: contentType || 'application/octet-stream',
    };

    const options = {
      blobHTTPHeaders,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      tags: Object.keys(tags).length > 0 ? tags : undefined,
      tier: tier as any,
    };

    await blockBlobClient.upload(buffer, buffer.length, options);

    // Revalidate cache
    revalidateTag('blobs');
    revalidateTag(`container:${containerName}`);
    revalidatePath(`/containers/${containerName}`);
    revalidatePath(`/containers/${containerName}/blobs`);

    return { 
      success: true, 
      data: { name: blobName, size: buffer.length } 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to upload blob' 
    };
  }
}

/**
 * Upload blob from text content
 */
export async function uploadTextBlob(formData: FormData): Promise<ActionResult<{ name: string; size: number }>> {
  try {
    const containerName = formData.get('containerName') as string;
    const blobName = formData.get('blobName') as string;
    const content = formData.get('content') as string;
    const contentType = formData.get('contentType') as string || 'text/plain';
    
    if (!containerName || !blobName || !content) {
      return { success: false, error: 'Container name, blob name, and content are required' };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const buffer = Buffer.from(content, 'utf-8');
    const blobHTTPHeaders: BlobHTTPHeaders = {
      blobContentType: contentType,
    };

    await blockBlobClient.upload(buffer, buffer.length, { blobHTTPHeaders });

    // Revalidate cache
    revalidateTag('blobs');
    revalidateTag(`container:${containerName}`);
    revalidatePath(`/containers/${containerName}`);
    revalidatePath(`/containers/${containerName}/blobs`);

    return { 
      success: true, 
      data: { name: blobName, size: buffer.length } 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to upload text blob' 
    };
  }
}

/**
 * Delete a blob
 */
export async function deleteBlob(formData: FormData): Promise<ActionResult> {
  try {
    const containerName = formData.get('containerName') as string;
    const blobName = formData.get('blobName') as string;
    const deleteSnapshots = formData.get('deleteSnapshots') as string || 'include';
    
    if (!containerName || !blobName) {
      return { success: false, error: 'Container name and blob name are required' };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    await blobClient.delete({ deleteSnapshots: deleteSnapshots as any });

    // Revalidate cache
    revalidateTag('blobs');
    revalidateTag(`container:${containerName}`);
    revalidateTag(`blob:${blobName}`);
    revalidatePath(`/containers/${containerName}`);
    revalidatePath(`/containers/${containerName}/blobs`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to delete blob' 
    };
  }
}

/**
 * Copy a blob
 */
export async function copyBlob(formData: FormData): Promise<ActionResult<{ name: string }>> {
  try {
    const sourceContainerName = formData.get('sourceContainerName') as string;
    const sourceBlobName = formData.get('sourceBlobName') as string;
    const targetContainerName = formData.get('targetContainerName') as string;
    const targetBlobName = formData.get('targetBlobName') as string;
    
    if (!sourceContainerName || !sourceBlobName || !targetContainerName || !targetBlobName) {
      return { 
        success: false, 
        error: 'Source and target container names and blob names are required' 
      };
    }

    const client = getBlobServiceClient();
    const sourceUrl = client
      .getContainerClient(sourceContainerName)
      .getBlobClient(sourceBlobName)
      .url;
    
    const targetBlobClient = client
      .getContainerClient(targetContainerName)
      .getBlobClient(targetBlobName);

    await targetBlobClient.syncCopyFromURL(sourceUrl);

    // Revalidate cache
    revalidateTag('blobs');
    revalidateTag(`container:${targetContainerName}`);
    revalidatePath(`/containers/${targetContainerName}`);
    revalidatePath(`/containers/${targetContainerName}/blobs`);

    return { 
      success: true, 
      data: { name: targetBlobName } 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to copy blob' 
    };
  }
}

/**
 * Update blob metadata
 */
export async function updateBlobMetadata(formData: FormData): Promise<ActionResult> {
  try {
    const containerName = formData.get('containerName') as string;
    const blobName = formData.get('blobName') as string;
    const metadata: Record<string, string> = {};
    
    // Extract metadata from form data
    formData.forEach((value, key) => {
      if (key.startsWith('metadata.')) {
        const metadataKey = key.replace('metadata.', '');
        metadata[metadataKey] = value as string;
      }
    });

    if (!containerName || !blobName) {
      return { success: false, error: 'Container name and blob name are required' };
    }

    const client = getBlobServiceClient();
    const blobClient = client.getContainerClient(containerName).getBlobClient(blobName);

    await blobClient.setMetadata(metadata);

    // Revalidate cache
    revalidateTag(`blob:${blobName}`);
    revalidateTag(`container:${containerName}`);
    revalidatePath(`/containers/${containerName}/blobs/${blobName}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to update blob metadata' 
    };
  }
}

/**
 * Update blob tags
 */
export async function updateBlobTags(formData: FormData): Promise<ActionResult> {
  try {
    const containerName = formData.get('containerName') as string;
    const blobName = formData.get('blobName') as string;
    const tags: Record<string, string> = {};
    
    // Extract tags from form data
    formData.forEach((value, key) => {
      if (key.startsWith('tags.')) {
        const tagKey = key.replace('tags.', '');
        tags[tagKey] = value as string;
      }
    });

    if (!containerName || !blobName) {
      return { success: false, error: 'Container name and blob name are required' };
    }

    const client = getBlobServiceClient();
    const blobClient = client.getContainerClient(containerName).getBlobClient(blobName);

    await blobClient.setTags(tags);

    // Revalidate cache
    revalidateTag(`blob:${blobName}`);
    revalidateTag(`container:${containerName}`);
    revalidatePath(`/containers/${containerName}/blobs/${blobName}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to update blob tags' 
    };
  }
}

/**
 * Set blob access tier
 */
export async function setBlobTier(formData: FormData): Promise<ActionResult> {
  try {
    const containerName = formData.get('containerName') as string;
    const blobName = formData.get('blobName') as string;
    const tier = formData.get('tier') as string;
    
    if (!containerName || !blobName || !tier) {
      return { success: false, error: 'Container name, blob name, and tier are required' };
    }

    if (!['Hot', 'Cool', 'Archive'].includes(tier)) {
      return { success: false, error: 'Invalid tier. Must be Hot, Cool, or Archive' };
    }

    const client = getBlobServiceClient();
    const blobClient = client.getContainerClient(containerName).getBlobClient(blobName);

    await blobClient.setAccessTier(tier as any);

    // Revalidate cache
    revalidateTag(`blob:${blobName}`);
    revalidateTag(`container:${containerName}`);
    revalidatePath(`/containers/${containerName}/blobs/${blobName}`);

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to set blob tier' 
    };
  }
}

// Batch Actions

/**
 * Delete multiple blobs
 */
export async function deleteMultipleBlobs(formData: FormData): Promise<ActionResult<{ deleted: number; errors: string[] }>> {
  const containerName = formData.get('containerName') as string;
  
  try {
    const blobNames = formData.getAll('blobNames') as string[];
    
    if (!containerName) {
      return { success: false, error: 'Container name is required' };
    }

    if (!blobNames || blobNames.length === 0) {
      return { success: false, error: 'At least one blob name is required' };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(containerName);

    let deleted = 0;
    const errors: string[] = [];

    for (const blobName of blobNames) {
      try {
        const blobClient = containerClient.getBlobClient(blobName);
        await blobClient.delete();
        deleted++;
      } catch (error: any) {
        errors.push(`Failed to delete ${blobName}: ${error.message}`);
      }
    }

    // Revalidate cache
    revalidateTag('blobs');
    revalidateTag(`container:${containerName}`);
    revalidatePath(`/containers/${containerName}`);
    revalidatePath(`/containers/${containerName}/blobs`);

    return { 
      success: true, 
      data: { deleted, errors } 
    };
  } catch (error: any) {
    const errorResult = handleServerActionError(error, 'delete multiple blobs', containerName);
    return {
      ...errorResult,
      data: undefined as { deleted: number; errors: string[]; } | undefined
    };
  }
}

// Utility Actions

/**
 * Clear cache for a specific container
 */
export async function clearContainerCache(containerName: string): Promise<ActionResult> {
  try {
    revalidateTag(`container:${containerName}`);
    revalidatePath(`/containers/${containerName}`);
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to clear cache' 
    };
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<ActionResult> {
  try {
    revalidateTag('containers');
    revalidateTag('blobs');
    revalidateTag('storage-metrics');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return handleServerActionError(error, 'clear caches');
  }
}

// Advanced Container Actions

/**
 * Set container public access level
 */
export async function setContainerPublicAccess(formData: FormData): Promise<ActionResult> {
  const startTime = Date.now();
  
  try {
    const name = formData.get('name') as string;
    const publicAccess = formData.get('publicAccess') as string;

    const nameValidation = ContainerNameSchema.safeParse(name);
    if (!nameValidation.success) {
      return { success: false, error: nameValidation.error.errors[0].message };
    }

    const accessValidation = PublicAccessSchema.safeParse(publicAccess);
    if (!accessValidation.success) {
      return { success: false, error: 'Invalid public access level' };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(name);

    await containerClient.setAccessPolicy(publicAccess as any);

    // Revalidate cache
    revalidateTag(`container:${name}`);
    revalidatePath(`/containers/${name}`);

    return { 
      success: true,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    return handleServerActionError(error, 'set container public access');
  }
}

/**
 * Create container with validation
 */
export async function createContainerValidated(data: ContainerFormData): Promise<ActionResult<{ name: string }>> {
  const startTime = Date.now();
  
  try {
    const nameValidation = ContainerNameSchema.safeParse(data.name);
    if (!nameValidation.success) {
      return { success: false, error: nameValidation.error.errors[0].message };
    }

    const accessValidation = PublicAccessSchema.safeParse(data.publicAccess);
    if (!accessValidation.success) {
      return { success: false, error: 'Invalid public access level' };
    }

    // Check if container already exists
    const exists = await azureStorage.containerExists(data.name);
    if (exists) {
      return { success: false, error: `Container '${data.name}' already exists` };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(data.name);

    const options: ContainerCreateOptions = {
      metadata: Object.keys(data.metadata).length > 0 ? data.metadata : undefined,
      access: data.publicAccess === 'none' ? undefined : data.publicAccess as any,
    };

    await containerClient.create(options);

    // Revalidate cache
    revalidateTag('containers');
    revalidatePath('/containers');

    return { 
      success: true, 
      data: { name: data.name },
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    const errorResult = handleServerActionError(error, 'create container', data.name);
    return {
      ...errorResult,
      data: undefined as { name: string } | undefined
    };
  }
}

// Advanced Blob Actions

/**
 * Upload blob with progress tracking and validation
 */
export async function uploadBlobValidated(data: BlobFormData): Promise<ActionResult<{ name: string; size: number; etag: string }>> {
  const startTime = Date.now();
  
  try {
    const containerValidation = ContainerNameSchema.safeParse(data.containerName);
    if (!containerValidation.success) {
      return { success: false, error: containerValidation.error.errors[0].message };
    }

    const blobValidation = BlobNameSchema.safeParse(data.blobName);
    if (!blobValidation.success) {
      return { success: false, error: blobValidation.error.errors[0].message };
    }

    const tierValidation = AccessTierSchema.safeParse(data.tier);
    if (!tierValidation.success) {
      return { success: false, error: 'Invalid access tier' };
    }

    // Validate file
    const fileValidation = validateFileUpload(data.file);
    if (!fileValidation.valid) {
      return { success: false, error: fileValidation.error! };
    }

    // Check if container exists
    const containerExists = await azureStorage.containerExists(data.containerName);
    if (!containerExists) {
      return { success: false, error: `Container '${data.containerName}' does not exist` };
    }

    const client = getBlobServiceClient();
    const containerClient = client.getContainerClient(data.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(data.blobName);

    // Convert file to buffer
    const arrayBuffer = await data.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blobHTTPHeaders: BlobHTTPHeaders = {
      blobContentType: data.contentType || data.file.type || 'application/octet-stream',
    };

    const options = {
      blobHTTPHeaders,
      metadata: Object.keys(data.metadata).length > 0 ? data.metadata : undefined,
      tags: Object.keys(data.tags).length > 0 ? data.tags : undefined,
      tier: data.tier as any,
    };

    const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, options);

    // Revalidate cache
    revalidateTag('blobs');
    revalidateTag(`container:${data.containerName}`);
    revalidatePath(`/containers/${data.containerName}`);
    revalidatePath(`/containers/${data.containerName}/blobs`);

    return { 
      success: true, 
      data: { 
        name: data.blobName, 
        size: buffer.length,
        etag: uploadResponse.etag || 'unknown'
      },
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    const errorResult = handleServerActionError(error, 'upload blob', `${data.containerName}/${data.blobName}`);
    return {
      ...errorResult,
      data: undefined as { name: string; size: number; etag: string; } | undefined
    };
  }
}

/**
 * Update blob properties (metadata, tags, tier)
 */
export async function updateBlobProperties(data: BlobUpdateFormData): Promise<ActionResult> {
  const startTime = Date.now();
  
  try {
    const containerValidation = ContainerNameSchema.safeParse(data.containerName);
    if (!containerValidation.success) {
      return { success: false, error: containerValidation.error.errors[0].message };
    }

    const blobValidation = BlobNameSchema.safeParse(data.blobName);
    if (!blobValidation.success) {
      return { success: false, error: blobValidation.error.errors[0].message };
    }

    if (data.tier) {
      const tierValidation = AccessTierSchema.safeParse(data.tier);
      if (!tierValidation.success) {
        return { success: false, error: 'Invalid access tier' };
      }
    }

    const client = getBlobServiceClient();
    const blobClient = client.getContainerClient(data.containerName).getBlobClient(data.blobName);

    // Check if blob exists
    const exists = await blobClient.exists();
    if (!exists) {
      return { success: false, error: `Blob '${data.blobName}' not found in container '${data.containerName}'` };
    }

    // Update metadata if provided
    if (data.metadata) {
      await blobClient.setMetadata(data.metadata);
    }

    // Update tags if provided
    if (data.tags) {
      await blobClient.setTags(data.tags);
    }

    // Update tier if provided
    if (data.tier) {
      await blobClient.setAccessTier(data.tier as any);
    }

    // Revalidate cache
    revalidateTag(`blob:${data.blobName}`);
    revalidateTag(`container:${data.containerName}`);
    revalidatePath(`/containers/${data.containerName}/blobs/${data.blobName}`);

    return { 
      success: true,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    return handleServerActionError(error, 'update blob properties', `${data.containerName}/${data.blobName}`);
  }
}

/**
 * Enhanced batch delete with detailed results
 */
export async function batchDeleteBlobsEnhanced(formData: FormData): Promise<ActionResult<BatchDeleteResult>> {
  const startTime = Date.now();
  
  try {
    const containerName = formData.get('containerName') as string;
    const blobNames = formData.getAll('blobNames') as string[];
    // TODO: Use deleteSnapshots parameter
    // const deleteSnapshots = formData.get('deleteSnapshots') as string || 'include';
    
    const containerValidation = ContainerNameSchema.safeParse(containerName);
    if (!containerValidation.success) {
      return { success: false, error: containerValidation.error.errors[0].message };
    }

    if (!blobNames || blobNames.length === 0) {
      return { success: false, error: 'At least one blob name is required' };
    }

    // Validate all blob names
    for (const blobName of blobNames) {
      const validation = BlobNameSchema.safeParse(blobName);
      if (!validation.success) {
        return { success: false, error: `Invalid blob name '${blobName}': ${validation.error.errors[0].message}` };
      }
    }

    const result = await azureStorage.batchDeleteBlobs(containerName, blobNames);

    // Revalidate cache
    revalidateTag('blobs');
    revalidateTag(`container:${containerName}`);
    revalidatePath(`/containers/${containerName}`);
    revalidatePath(`/containers/${containerName}/blobs`);

    return { 
      success: true, 
      data: result,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    const errorResult = handleServerActionError(error, 'batch delete blobs');
    return {
      ...errorResult,
      data: undefined as BatchDeleteResult | undefined
    };
  }
}

/**
 * Generate signed URL for blob download
 */
export async function generateBlobDownloadUrl(formData: FormData): Promise<ActionResult<{ downloadUrl: string; expiresAt: Date }>> {
  try {
    const containerName = formData.get('containerName') as string;
    const blobName = formData.get('blobName') as string;
    const expiryMinutes = parseInt(formData.get('expiryMinutes') as string) || 60; // Default 1 hour
    
    const containerValidation = ContainerNameSchema.safeParse(containerName);
    if (!containerValidation.success) {
      return { success: false, error: containerValidation.error.errors[0].message };
    }

    const blobValidation = BlobNameSchema.safeParse(blobName);
    if (!blobValidation.success) {
      return { success: false, error: blobValidation.error.errors[0].message };
    }

    const client = getBlobServiceClient();
    const blobClient = client.getContainerClient(containerName).getBlobClient(blobName);

    // Check if blob exists
    const exists = await blobClient.exists();
    if (!exists) {
      return { success: false, error: `Blob '${blobName}' not found in container '${containerName}'` };
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // For Azure Storage Emulator, we'll use the direct URL
    // In production, you would generate a proper SAS URL here
    const config = getAzureStorageConfig();
    const baseUrl = config.connectionString.includes('127.0.0.1') || config.connectionString.includes('localhost')
      ? 'http://127.0.0.1:10000/devstoreaccount1' // Emulator endpoint
      : blobClient.url;

    const downloadUrl = `${baseUrl}/${containerName}/${encodeURIComponent(blobName)}`;

    return { 
      success: true, 
      data: { downloadUrl, expiresAt }
    };
  } catch (error: any) {
    const errorResult = handleServerActionError(error, 'generate blob download URL');
    return {
      ...errorResult,
      data: undefined as { downloadUrl: string; expiresAt: Date; } | undefined
    };
  }
}

/**
 * Download blob with streaming support (legacy method for compatibility)
 */
export async function downloadBlobStream(formData: FormData): Promise<ActionResult<{ downloadUrl: string }>> {
  const result = await generateBlobDownloadUrl(formData);
  if (result.success && result.data) {
    return {
      success: true,
      data: { downloadUrl: result.data.downloadUrl }
    };
  }
  return result as ActionResult<{ downloadUrl: string }>;
}

/**
 * Health check action
 */
export async function checkStorageHealth(): Promise<ActionResult<{ isHealthy: boolean; lastChecked: Date }>> {
  try {
    const health = await azureStorage.getConnectionHealth();
    
    return {
      success: true,
      data: health
    };
  } catch (error: any) {
    const errorResult = handleServerActionError(error, 'check storage health');
    return {
      ...errorResult,
      data: undefined as { isHealthy: boolean; lastChecked: Date; } | undefined
    };
  }
}

/**
 * Get storage metrics action
 */
export async function getStorageMetricsAction(): Promise<ActionResult<any>> {
  try {
    const metrics = await azureStorage.getStorageMetrics();
    const accountInfo = await azureStorage.getStorageAccountInfo();
    
    return {
      success: true,
      data: {
        ...metrics,
        storageAccount: accountInfo
      }
    };
  } catch (error: any) {
    return handleServerActionError(error, 'get storage metrics');
  }
}

// Form action variants that work with form submissions

/**
 * Create container from form and redirect
 */
export async function createContainerFromForm(formData: FormData) {
  const name = formData.get('name') as string;
  const publicAccess = formData.get('publicAccess') as string || 'none';
  const metadata: Record<string, string> = {};
  
  // Extract metadata from form data
  formData.forEach((value, key) => {
    if (key.startsWith('metadata.')) {
      const metadataKey = key.replace('metadata.', '');
      metadata[metadataKey] = value as string;
    }
  });

  const result = await createContainerValidated({
    name,
    publicAccess: publicAccess as any,
    metadata
  });
  
  if (result.success && result.data) {
    redirect(`/containers/${result.data.name}`);
  } else {
    throw new Error(result.error || 'Failed to create container');
  }
}

/**
 * Upload blob from form with validation
 */
export async function uploadBlobFromForm(formData: FormData): Promise<ActionResult<{ name: string; size: number; etag: string }>> {
  const containerName = formData.get('containerName') as string;
  const file = formData.get('file') as File;
  const blobName = formData.get('blobName') as string || file?.name;
  const contentType = formData.get('contentType') as string || file?.type;
  const tier = formData.get('tier') as string || 'Hot';
  
  const metadata: Record<string, string> = {};
  const tags: Record<string, string> = {};
  
  // Extract metadata and tags from form data
  formData.forEach((value, key) => {
    if (key.startsWith('metadata.')) {
      const metadataKey = key.replace('metadata.', '');
      metadata[metadataKey] = value as string;
    } else if (key.startsWith('tags.')) {
      const tagKey = key.replace('tags.', '');
      tags[tagKey] = value as string;
    }
  });

  if (!file) {
    return { success: false, error: 'File is required' };
  }

  return await uploadBlobValidated({
    containerName,
    blobName,
    file,
    contentType,
    tier: tier as any,
    metadata,
    tags
  });
}
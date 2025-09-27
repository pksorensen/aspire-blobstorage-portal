'use server'

import { 
  createContainer, 
  deleteContainer, 
  uploadBlobFromForm, 
  deleteBlob,
  updateBlobMetadata,
  setBlobTier,
  updateBlobTags,
  copyBlob,
  updateContainerMetadata
} from '@/lib/azure-actions'
import { ActionResult } from '@/types/azure-types'

/**
 * Wrapper functions to adapt server actions for useActionState hook
 * 
 * React 19's useActionState expects actions with signature:
 * (state: Awaited<State>, payload: Payload) => State | Promise<State>
 * 
 * Our server actions expect FormData directly, so we need wrappers.
 */

// Container Action Wrappers

export async function createContainerAction(
  prevState: ActionResult<{ name: string }>, 
  formData: FormData
): Promise<ActionResult<{ name: string }>> {
  return createContainer(formData)
}

export async function deleteContainerAction(
  prevState: ActionResult, 
  formData: FormData
): Promise<ActionResult> {
  return deleteContainer(formData)
}

export async function updateContainerMetadataAction(
  prevState: ActionResult, 
  formData: FormData
): Promise<ActionResult> {
  return updateContainerMetadata(formData)
}

// Blob Action Wrappers

export async function uploadBlobAction(
  prevState: ActionResult<{ name: string; size: number; etag: string }>, 
  formData: FormData
): Promise<ActionResult<{ name: string; size: number; etag: string }>> {
  return uploadBlobFromForm(formData)
}

export async function deleteBlobAction(
  prevState: ActionResult, 
  formData: FormData
): Promise<ActionResult> {
  return deleteBlob(formData)
}

export async function updateBlobMetadataAction(
  prevState: ActionResult, 
  formData: FormData
): Promise<ActionResult> {
  return updateBlobMetadata(formData)
}

export async function setBlobTierAction(
  prevState: ActionResult, 
  formData: FormData
): Promise<ActionResult> {
  return setBlobTier(formData)
}

export async function updateBlobTagsAction(
  prevState: ActionResult, 
  formData: FormData
): Promise<ActionResult> {
  return updateBlobTags(formData)
}

export async function copyBlobAction(
  prevState: ActionResult<{ name: string }>, 
  formData: FormData
): Promise<ActionResult<{ name: string }>> {
  return copyBlob(formData)
}

// Additional action wrappers for missing functions
import { deleteMultipleBlobs, downloadBlobStream } from '@/lib/azure-actions'

export async function deleteMultipleBlobsAction(
  prevState: ActionResult<{ deleted: number; errors: string[] }>, 
  formData: FormData
): Promise<ActionResult<{ deleted: number; errors: string[] }>> {
  return deleteMultipleBlobs(formData)
}

export async function downloadBlobStreamAction(
  prevState: ActionResult<{ downloadUrl: string }>, 
  formData: FormData
): Promise<ActionResult<{ downloadUrl: string }>> {
  return downloadBlobStream(formData)
}

// Blob lease management action
export async function manageBlobLeaseAction(
  prevState: ActionResult<{
    leaseId?: string;
    leaseTime?: Date;
    leaseDuration?: number;
  }>, 
  formData: FormData
): Promise<ActionResult<{
  leaseId?: string;
  leaseTime?: Date;
  leaseDuration?: number;
}>> {
  // This would be implemented with actual Azure SDK calls
  try {
    // type LeaseOperation = 'acquire' | 'renew' | 'change' | 'release' | 'break';
    
    // TODO: Implement lease operations
    // const operation = formData.get('operation') as LeaseOperation;
    // const containerName = formData.get('containerName') as string;
    // const blobName = formData.get('blobName') as string;
    // const leaseDuration = parseInt(formData.get('leaseDuration') as string || '30');
    // const leaseId = formData.get('leaseId') as string;
    const proposedLeaseId = formData.get('proposedLeaseId') as string;

    // Simulate API call (would be replaced with actual Azure SDK calls)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock success response
    return {
      success: true,
      data: {
        leaseId: proposedLeaseId || 'mock-lease-id-' + Date.now(),
        leaseTime: new Date(),
        leaseDuration: 30, // Default lease duration
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to manage blob lease',
    };
  }
}
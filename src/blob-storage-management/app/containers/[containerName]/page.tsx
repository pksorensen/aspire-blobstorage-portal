import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FolderOpen, 
  File,
  FileText,
  Image,
  Archive,
  Calendar, 
  Database,
  HardDrive,
  Eye,
  MoreVertical,
  Search,
  Filter,
  Upload,
  RefreshCw,
  Download,
  Copy,
  Trash2,
  Globe,
  Lock,
  Snowflake,
  Zap,
  AlertCircle,
  ChevronRight
} from "lucide-react"
import { 
  getContainerProperties, 
  getContainerMetrics, 
  listBlobs,
  searchBlobs 
} from "@/lib/azure-storage"
import { 
  ContainerItem, 
  ContainerMetrics, 
  BlobItem, 
  BlobSearchCriteria 
} from "@/types/azure-types"
import Link from "next/link"
import { notFound } from "next/navigation"

interface BlobListingProps {
  searchParams?: {
    search?: string
    prefix?: string
    sortBy?: 'name' | 'lastModified' | 'size' | 'type'
    sortOrder?: 'asc' | 'desc'
    filter?: string
  }
  params: {
    containerName: string
  }
}

/**
 * Get blob file type icon based on content type and file extension
 */
function getBlobIcon(blob: BlobItem): JSX.Element {
  const name = blob.name.toLowerCase()
  const contentType = blob.properties.contentType.toLowerCase()
  
  if (contentType.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />
  }
  if (contentType.includes('pdf') || name.endsWith('.pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />
  }
  if (contentType.includes('zip') || contentType.includes('archive') || 
      name.endsWith('.zip') || name.endsWith('.tar') || name.endsWith('.gz')) {
    return <Archive className="h-4 w-4 text-yellow-600" />
  }
  if (contentType.includes('json') || contentType.includes('xml') || 
      name.endsWith('.json') || name.endsWith('.xml')) {
    return <Database className="h-4 w-4 text-green-600" />
  }
  if (contentType.includes('text') || name.endsWith('.txt') || name.endsWith('.log')) {
    return <FileText className="h-4 w-4 text-gray-600" />
  }
  
  return <File className="h-4 w-4 text-gray-500" />
}

/**
 * Get access tier badge with appropriate styling
 */
function getAccessTierBadge(tier?: string): JSX.Element | null {
  if (!tier) return null
  
  switch (tier) {
    case 'Hot':
      return (
        <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
          <Zap className="h-3 w-3 mr-1" />
          Hot
        </Badge>
      )
    case 'Cool':
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
          <Eye className="h-3 w-3 mr-1" />
          Cool
        </Badge>
      )
    case 'Archive':
      return (
        <Badge variant="secondary" className="bg-gray-50 text-gray-700 border-gray-200">
          <Snowflake className="h-3 w-3 mr-1" />
          Archive
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          {tier}
        </Badge>
      )
  }
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format date for blob listing
 */
function formatBlobDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

/**
 * Extract virtual directories from blob names
 */
function getVirtualDirectories(blobs: BlobItem[], currentPrefix: string = ''): string[] {
  const prefixes = new Set<string>()
  
  blobs.forEach(blob => {
    const relativeName = currentPrefix 
      ? blob.name.substring(currentPrefix.length)
      : blob.name
      
    const slashIndex = relativeName.indexOf('/')
    if (slashIndex > 0) {
      const folderName = relativeName.substring(0, slashIndex)
      const fullPrefix = currentPrefix + folderName + '/'
      prefixes.add(fullPrefix)
    }
  })
  
  return Array.from(prefixes).sort()
}

/**
 * Get current directory breadcrumbs from prefix
 */
function getDirectoryBreadcrumbs(containerName: string, prefix?: string): JSX.Element[] {
  const breadcrumbs = [
    <BreadcrumbItem key="root">
      <BreadcrumbLink href={`/containers/${containerName}`}>
        <FolderOpen className="h-4 w-4" />
        {containerName}
      </BreadcrumbLink>
    </BreadcrumbItem>
  ]
  
  if (prefix) {
    const parts = prefix.split('/').filter(Boolean)
    let currentPath = ''
    
    parts.forEach((part, index) => {
      currentPath += part + '/'
      const isLast = index === parts.length - 1
      
      breadcrumbs.push(
        <BreadcrumbSeparator key={`sep-${index}`} />
      )
      
      if (isLast) {
        breadcrumbs.push(
          <BreadcrumbItem key={`part-${index}`}>
            <BreadcrumbPage>{part}</BreadcrumbPage>
          </BreadcrumbItem>
        )
      } else {
        breadcrumbs.push(
          <BreadcrumbItem key={`part-${index}`}>
            <BreadcrumbLink href={`/containers/${containerName}?prefix=${currentPath}`}>
              {part}
            </BreadcrumbLink>
          </BreadcrumbItem>
        )
      }
    })
  }
  
  return breadcrumbs
}

/**
 * Container Information Header Component
 */
async function ContainerInfoHeader({ containerName }: { containerName: string }) {
  let container: ContainerItem | null = null
  let metrics: ContainerMetrics | null = null
  
  try {
    [container, metrics] = await Promise.all([
      getContainerProperties(containerName),
      getContainerMetrics(containerName)
    ])
  } catch (error) {
    // Fallback to basic info
    console.warn(`Failed to load container info for ${containerName}:`, error)
  }
  
  const getPublicAccessIcon = (access?: string) => {
    switch (access) {
      case 'container':
        return <Globe className="h-4 w-4 text-blue-500" />
      case 'blob':
        return <Eye className="h-4 w-4 text-amber-500" />
      default:
        return <Lock className="h-4 w-4 text-gray-500" />
    }
  }
  
  return (
    <div className="bg-muted/30 border-b px-4 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Container Information */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-lg" data-testid="container-name">{containerName}</span>
          </div>
          
          {container && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {getPublicAccessIcon(container.properties.publicAccess)}
                <span className="whitespace-nowrap">
                  {container.properties.publicAccess === 'container' 
                    ? 'Public container'
                    : container.properties.publicAccess === 'blob'
                    ? 'Public blobs'
                    : 'Private'
                  }
                </span>
              </div>
              
              {metrics && (
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="whitespace-nowrap">{metrics.blobCount} blobs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-4 w-4" />
                    <span className="whitespace-nowrap">{formatFileSize(metrics.totalSize)}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span className="whitespace-nowrap">Modified {formatBlobDate(metrics.lastModified)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="button-upload-file">
            <Upload className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Upload</span>
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Refresh</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Blob Table Row Component
 */
function BlobTableRow({ blob }: { blob: BlobItem; containerName: string }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50" data-testid={`blob-${blob.name}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <input type="checkbox" className="rounded" data-testid={`blob-${blob.name}-checkbox`} />
          <div className="flex items-center gap-2">
            {getBlobIcon(blob)}
            <span className="font-medium text-sm truncate max-w-[300px]" data-testid="blob-name">
              {blob.name}
            </span>
          </div>
        </div>
      </td>
      
      <td className="px-4 py-3 text-sm text-gray-600" data-testid="blob-last-modified">
        {formatBlobDate(blob.properties.lastModified)}
      </td>
      
      <td className="px-4 py-3" data-testid="blob-access-tier">
        {getAccessTierBadge(blob.properties.accessTier)}
      </td>
      
      <td className="px-4 py-3 text-sm text-gray-600" data-testid="blob-type">
        <div className="flex items-center gap-1">
          <span>{blob.properties.blobType}</span>
          {blob.properties.blobType === 'BlockBlob' && (
            <Database className="h-3 w-3 text-blue-500" />
          )}
        </div>
      </td>
      
      <td className="px-4 py-3 text-sm text-gray-600 text-right" data-testid="blob-size">
        {formatFileSize(blob.properties.contentLength)}
      </td>
      
      <td className="px-4 py-3 text-sm text-gray-600" data-testid="blob-lease-status">
        <Badge variant={blob.properties.leaseStatus === 'unlocked' ? 'secondary' : 'destructive'}>
          {blob.properties.leaseStatus}
        </Badge>
      </td>
      
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" data-testid={`blob-${blob.name}-download`}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid={`blob-${blob.name}-copy`}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid={`blob-${blob.name}-delete`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

/**
 * Virtual Directory Row Component
 */
function VirtualDirectoryRow({ 
  prefix, 
  containerName, 
  currentPrefix 
}: { 
  prefix: string; 
  containerName: string; 
  currentPrefix?: string 
}) {
  const folderName = prefix.substring(
    currentPrefix?.length || 0, 
    prefix.length - 1
  )
  
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3" colSpan={7}>
        <Link 
          href={`/containers/${containerName}?prefix=${prefix}`}
          className="flex items-center gap-3 text-blue-600 hover:text-blue-800"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="font-medium">{folderName}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  )
}

/**
 * Blob Listing Table Component
 */
async function BlobListingTable({ 
  containerName, 
  searchParams 
}: { 
  containerName: string; 
  searchParams?: BlobListingProps['searchParams'] 
}) {
  let blobs: BlobItem[] = []
  let error: string | null = null
  
  try {
    const { search, prefix, sortBy, sortOrder } = searchParams || {}
    
    if (search) {
      // Use search functionality
      const criteria: BlobSearchCriteria = {
        namePattern: search
      }
      blobs = await searchBlobs(containerName, criteria)
    } else {
      // Regular listing with optional prefix
      blobs = await listBlobs(containerName, prefix)
    }
    
    // Filter blobs to show only those in current directory level
    if (prefix) {
      blobs = blobs.filter(blob => 
        blob.name.startsWith(prefix) && 
        blob.name.substring(prefix.length).indexOf('/') === -1
      )
    } else {
      // Show only root level blobs (no slash in name)
      blobs = blobs.filter(blob => blob.name.indexOf('/') === -1)
    }
    
    // Apply filtering based on filter parameter
    const { filter } = searchParams || {}
    if (filter === 'deleted') {
      blobs = blobs.filter(blob => blob.deleted === true)
    } else if (filter === 'all') {
      // Show all blobs including deleted
    } else {
      // Default: only active blobs (not deleted)
      blobs = blobs.filter(blob => !blob.deleted)
    }
    
    // Apply sorting
    if (sortBy) {
      blobs.sort((a, b) => {
        let compareValue = 0
        
        switch (sortBy) {
          case 'name':
            compareValue = a.name.localeCompare(b.name)
            break
          case 'lastModified':
            compareValue = a.properties.lastModified.getTime() - b.properties.lastModified.getTime()
            break
          case 'size':
            compareValue = a.properties.contentLength - b.properties.contentLength
            break
          case 'type':
            compareValue = a.properties.blobType.localeCompare(b.properties.blobType)
            break
        }
        
        return sortOrder === 'desc' ? -compareValue : compareValue
      })
    }
    
  } catch (err: unknown) {
    error = (err as Error).message || 'Failed to load blobs'
    console.error('Error loading blobs:', err)
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="blob-error">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-medium">Error loading blobs</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }
  
  // Get virtual directories for current prefix
  const allBlobs = await listBlobs(containerName, searchParams?.prefix).catch(() => [])
  const virtualDirectories = getVirtualDirectories(allBlobs, searchParams?.prefix)
  
  const hasContent = blobs.length > 0 || virtualDirectories.length > 0
  
  if (!hasContent) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="blobs-empty-state">
        <div className="text-center">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium" data-testid="empty-state-message">No items found</p>
          <p className="text-sm text-gray-500">
            {searchParams?.search 
              ? 'Try adjusting your search criteria'
              : 'This directory is empty'
            }
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg border" data-testid="blob-list">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Name
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Modified
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Access Tier
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Blob Type
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lease State
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Virtual Directories */}
            {virtualDirectories.map(prefix => (
              <VirtualDirectoryRow
                key={prefix}
                prefix={prefix}
                containerName={containerName}
                currentPrefix={searchParams?.prefix}
              />
            ))}
            
            {/* Blobs */}
            {blobs.map(blob => (
              <BlobTableRow
                key={blob.name}
                blob={blob}
                containerName={containerName}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Card View */}
      <div className="lg:hidden">
        <div className="space-y-2 p-4">
          {/* Virtual Directories */}
          {virtualDirectories.map(prefix => {
            const folderName = prefix.substring(
              (searchParams?.prefix?.length || 0), 
              prefix.length - 1
            )
            return (
              <Link 
                key={prefix}
                href={`/containers/${containerName}?prefix=${prefix}`}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <FolderOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-blue-600">{folderName}</span>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </Link>
            )
          })}
          
          {/* Blobs */}
          {blobs.map(blob => (
            <div key={blob.name} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <input type="checkbox" className="rounded" />
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  {getBlobIcon(blob)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {blob.name}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatBlobDate(blob.properties.lastModified)}</span>
                    <span>•</span>
                    <span>{formatFileSize(blob.properties.contentLength)}</span>
                    <span>•</span>
                    <span>{blob.properties.blobType}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {getAccessTierBadge(blob.properties.accessTier)}
                    <Badge variant={blob.properties.leaseStatus === 'unlocked' ? 'secondary' : 'destructive'}>
                      {blob.properties.leaseStatus}
                    </Badge>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
        Showing {blobs.length} blob(s) {virtualDirectories.length > 0 && `and ${virtualDirectories.length} folder(s)`}
      </div>
    </div>
  )
}

/**
 * Server actions for blob search and filtering
 */
async function handleBlobSearch(formData: FormData) {
  'use server'
  const { redirect } = await import('next/navigation')
  const search = formData.get('search')?.toString()
  const containerName = formData.get('containerName')?.toString()
  const prefix = formData.get('prefix')?.toString()
  
  const urlParams = new URLSearchParams()
  if (search?.trim()) {
    urlParams.set('search', search.trim())
  }
  if (prefix) {
    urlParams.set('prefix', prefix)
  }
  
  const searchUrl = `/containers/${containerName}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`
  redirect(searchUrl)
}

async function clearBlobSearch(formData: FormData) {
  'use server'
  const { redirect } = await import('next/navigation')
  const containerName = formData.get('containerName')?.toString()
  const prefix = formData.get('prefix')?.toString()
  const searchUrl = `/containers/${containerName}${prefix ? `?prefix=${prefix}` : ''}`
  redirect(searchUrl)
}

/**
 * Search and Filter Bar Component
 */
function SearchAndFilterBar({ 
  containerName, 
  searchParams 
}: { 
  containerName: string; 
  searchParams?: BlobListingProps['searchParams'] 
}) {
  return (
    <div className="space-y-4 mb-4">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1 w-full sm:w-auto">
          <form action={handleBlobSearch} className="relative flex-1 w-full sm:max-w-md">
            <input type="hidden" name="containerName" value={containerName} />
            <input type="hidden" name="prefix" value={searchParams?.prefix || ""} />
            
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              placeholder="Search blobs by prefix (case-sensitive)"
              defaultValue={searchParams?.search}
              className="w-full pl-9 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="search-blobs"
            />
            
            {searchParams?.search && (
              <form action={clearBlobSearch} className="absolute right-8 top-1/2 -translate-y-1/2">
                <input type="hidden" name="containerName" value={containerName} />
                <input type="hidden" name="prefix" value={searchParams?.prefix || ""} />
                <button
                  type="submit"
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                  title="Clear search"
                >
                  ×
                </button>
              </form>
            )}
            
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:text-blue-800"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" className="hidden sm:flex">
              <Filter className="h-4 w-4 mr-2" />
              Add filter
            </Button>
            
            <select 
              name="filter"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              defaultValue={searchParams?.filter || "active"}
              disabled
            >
              <option value="active">Only show active blobs</option>
              <option value="all">Show all blobs</option>
              <option value="deleted">Show deleted blobs</option>
            </select>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 flex-1 sm:flex-none">
            <Button variant="outline" size="sm" type="button" className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            
            <Button variant="outline" size="sm" type="button" className="flex-1 sm:flex-none">
              <Copy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            
            <Button variant="outline" size="sm" type="button" className="flex-1 sm:flex-none">
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile-only Filter Button */}
      <div className="sm:hidden">
        <Button variant="outline" size="sm" type="button" className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          Add filter
        </Button>
      </div>
    </div>
  )
}

/**
 * Container Blob Listing Page Breadcrumbs
 */
function ContainerBlobsBreadcrumbs({ containerName, prefix }: { containerName: string; prefix?: string }) {
  const breadcrumbs = [
    <BreadcrumbItem key="storage">
      <BreadcrumbLink href="/dashboard">Storage Account</BreadcrumbLink>
    </BreadcrumbItem>,
    <BreadcrumbSeparator key="sep1" />,
    <BreadcrumbItem key="containers">
      <BreadcrumbLink href="/containers">Blob containers</BreadcrumbLink>
    </BreadcrumbItem>,
    <BreadcrumbSeparator key="sep2" />,
    ...getDirectoryBreadcrumbs(containerName, prefix)
  ]
  
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * Main Blob Listing Page Component
 * 
 * Displays blobs in a container with virtual directory navigation,
 * search, filtering, and batch operations - all using React Server Components
 */
export default async function ContainerBlobListingPage({
  params,
  searchParams
}: BlobListingProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const containerName = decodeURIComponent(resolvedParams.containerName)
  
  // Check if container exists
  let containerExists = false
  try {
    await getContainerProperties(containerName)
    containerExists = true
  } catch (err: unknown) {
    const error = err as { statusCode?: number; code?: string };
    if (error.statusCode === 404 || error.code === 'ContainerNotFound') {
      notFound()
    }
    // Continue with error handling below
  }
  
  if (!containerExists) {
    return notFound()
  }
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset data-testid="blob-page">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4" data-testid="container-header">
          <ContainerBlobsBreadcrumbs 
            containerName={containerName} 
            prefix={resolvedSearchParams?.prefix} 
          />
        </header>
        
        <DashboardHeader 
          title={`Container: ${containerName}`} 
          searchQuery={resolvedSearchParams?.search}
          showSearch={true}
        />
        
        <Suspense fallback={<div className="h-16 bg-muted/10 animate-pulse" />}>
          <ContainerInfoHeader containerName={containerName} />
        </Suspense>
        
        <div className="flex-1 p-4 sm:p-6">
          <SearchAndFilterBar 
            containerName={containerName}
            searchParams={resolvedSearchParams}
          />
          
          <Suspense fallback={
            <div className="bg-white rounded-lg border h-64 animate-pulse flex items-center justify-center">
              <div className="text-gray-500">Loading blobs...</div>
            </div>
          }>
            <BlobListingTable 
              containerName={containerName}
              searchParams={resolvedSearchParams}
            />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Enable static generation with revalidation
export const revalidate = 30
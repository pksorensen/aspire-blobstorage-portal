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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  FolderOpen, 
  FileText, 
  Database,
  Calendar,
  AlertCircle,
  Filter,
  SortAsc,
  MoreVertical,
  Download,
  Copy,
  Eye,
  Globe,
  Lock,
  Zap,
  Snowflake
} from "lucide-react"
import {
  listContainers,
  searchBlobs,
} from "@/lib/azure-storage"
import {
  ContainerItem,
  BlobItem,
  BlobSearchCriteria
} from "@/types/azure-types"
import Link from "next/link"

interface SearchPageProps {
  searchParams?: {
    q?: string
    type?: 'all' | 'containers' | 'blobs'
    container?: string
    size?: 'small' | 'medium' | 'large'
    modified?: 'day' | 'week' | 'month' | 'year'
    tier?: 'Hot' | 'Cool' | 'Archive'
    sortBy?: 'relevance' | 'name' | 'modified' | 'size'
    sortOrder?: 'asc' | 'desc'
    page?: string
  }
}

/**
 * Global Search Results Interface
 */
interface GlobalSearchResults {
  query: string
  containers: ContainerItem[]
  blobs: Array<BlobItem & { containerName: string }>
  totalResults: number
  searchTime: number
}

/**
 * Enhanced Azure Storage Search Function
 * Performs cross-container search with advanced filtering
 */
async function performGlobalSearch(
  query: string,
  filters: {
    type?: string
    container?: string
    size?: string
    modified?: string
    tier?: string
  } = {}
): Promise<GlobalSearchResults> {
  const startTime = Date.now()
  let containers: ContainerItem[] = []
  let allBlobs: Array<BlobItem & { containerName: string }> = []
  
  try {
    // Get all containers first
    const allContainers = await listContainers()
    
    // Filter containers by search query if searching all types or containers specifically
    if (!filters.type || filters.type === 'all' || filters.type === 'containers') {
      containers = allContainers.filter(container =>
        container.name.toLowerCase().includes(query.toLowerCase())
      )
    }
    
    // Search blobs if searching all types or blobs specifically
    if (!filters.type || filters.type === 'all' || filters.type === 'blobs') {
      const containersToSearch = filters.container 
        ? allContainers.filter(c => c.name === filters.container)
        : allContainers
      
      // Search across all containers
      const blobPromises = containersToSearch.map(async (container) => {
        try {
          const criteria: BlobSearchCriteria = {
            namePattern: query
          }
          
          // Add size filters
          if (filters.size) {
            switch (filters.size) {
              case 'small':
                criteria.maxSize = 10 * 1024 * 1024 // 10MB
                break
              case 'medium':
                criteria.minSize = 10 * 1024 * 1024 // 10MB
                criteria.maxSize = 100 * 1024 * 1024 // 100MB
                break
              case 'large':
                criteria.minSize = 100 * 1024 * 1024 // 100MB
                break
            }
          }
          
          // Add modified date filters
          if (filters.modified) {
            const now = new Date()
            switch (filters.modified) {
              case 'day':
                criteria.modifiedAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                break
              case 'week':
                criteria.modifiedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
              case 'month':
                criteria.modifiedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                break
              case 'year':
                criteria.modifiedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
                break
            }
          }
          
          // Add tier filter
          if (filters.tier) {
            criteria.accessTier = filters.tier as "Hot" | "Cool" | "Archive"
          }
          
          const blobs = await searchBlobs(container.name, criteria)
          return blobs.map(blob => ({ ...blob, containerName: container.name }))
        } catch (error) {
          console.warn(`Failed to search in container ${container.name}:`, error)
          return []
        }
      })
      
      const blobResults = await Promise.all(blobPromises)
      allBlobs = blobResults.flat()
    }
    
    const searchTime = Date.now() - startTime
    const totalResults = containers.length + allBlobs.length
    
    return {
      query,
      containers,
      blobs: allBlobs,
      totalResults,
      searchTime
    }
  } catch (error) {
    console.error('Global search failed:', error)
    return {
      query,
      containers: [],
      blobs: [],
      totalResults: 0,
      searchTime: Date.now() - startTime
    }
  }
}

/**
 * Search Results Container Component
 */
async function SearchResults({ searchParams }: { searchParams: SearchPageProps['searchParams'] }) {
  const query = searchParams?.q || ''
  
  if (!query.trim()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Start searching</h3>
          <p className="text-muted-foreground">
            Enter a search term to find containers, blobs, and metadata across your storage account.
          </p>
        </div>
      </div>
    )
  }
  
  const filters = {
    type: searchParams?.type,
    container: searchParams?.container,
    size: searchParams?.size,
    modified: searchParams?.modified,
    tier: searchParams?.tier
  }
  
  const results = await performGlobalSearch(query, filters)
  
  if (results.totalResults === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground">
            No containers or blobs match your search for &quot;{query}&quot;.
            Try adjusting your search criteria or filters.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6" data-testid="search-results-section">
      {/* Search Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Found {results.totalResults} results for &quot;{query}&quot; in {results.searchTime}ms
          {results.containers.length > 0 && (
            <span> • {results.containers.length} containers</span>
          )}
          {results.blobs.length > 0 && (
            <span> • {results.blobs.length} blobs</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            More filters
          </Button>
          <Button variant="outline" size="sm">
            <SortAsc className="h-4 w-4 mr-2" />
            Sort by relevance
          </Button>
        </div>
      </div>
      
      {/* Container Results */}
      {results.containers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              Containers ({results.containers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-2">
              {results.containers.map((container) => (
                <Link
                  key={container.name}
                  href={`/containers/${encodeURIComponent(container.name)}`}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`search-result-${container.name}`}
                >
                  <FolderOpen className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1">{container.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {container.properties.publicAccess === 'container' ? (
                          <Globe className="h-3 w-3" />
                        ) : container.properties.publicAccess === 'blob' ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        <span>
                          {container.properties.publicAccess === 'none' ? 'Private' : 
                           container.properties.publicAccess === 'container' ? 'Public container' : 'Public blobs'}
                        </span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }).format(container.properties.lastModified)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Blob Results */}
      {results.blobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              Blobs ({results.blobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.blobs.map((blob) => (
                <div key={`${blob.containerName}-${blob.name}`} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`search-result-${blob.name}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {getBlobIcon(blob)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1 truncate">{blob.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Badge variant="outline" className="text-xs">
                        {blob.containerName}
                      </Badge>
                      <span>•</span>
                      <span>{formatFileSize(blob.properties.contentLength)}</span>
                      <span>•</span>
                      <span>
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(blob.properties.lastModified)}
                      </span>
                      {blob.properties.accessTier && (
                        <>
                          <span>•</span>
                          {getAccessTierBadge(blob.properties.accessTier)}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/containers/${encodeURIComponent(blob.containerName)}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View in container
                      </Link>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Helper function to get blob icon based on content type
 */
function getBlobIcon(blob: BlobItem): JSX.Element {
  const name = blob.name.toLowerCase()
  const contentType = blob.properties.contentType.toLowerCase()
  
  if (contentType.startsWith('image/')) {
    return <FileText className="h-4 w-4 text-blue-500" />
  }
  if (contentType.includes('pdf') || name.endsWith('.pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />
  }
  if (contentType.includes('json') || contentType.includes('xml') || 
      name.endsWith('.json') || name.endsWith('.xml')) {
    return <Database className="h-4 w-4 text-green-600" />
  }
  
  return <FileText className="h-4 w-4 text-gray-500" />
}

/**
 * Helper function to format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Helper function to get access tier badge
 */
function getAccessTierBadge(tier: string): JSX.Element {
  switch (tier) {
    case 'Hot':
      return (
        <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
          <Zap className="h-2 w-2 mr-1" />
          Hot
        </Badge>
      )
    case 'Cool':
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
          <Eye className="h-2 w-2 mr-1" />
          Cool
        </Badge>
      )
    case 'Archive':
      return (
        <Badge variant="secondary" className="bg-gray-50 text-gray-700 border-gray-200">
          <Snowflake className="h-2 w-2 mr-1" />
          Archive
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {tier}
        </Badge>
      )
  }
}

/**
 * Search Results Loading Skeleton
 */
function SearchResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-64 bg-gray-300 rounded animate-pulse" />
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-300 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-5 h-5 bg-gray-300 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-300 rounded animate-pulse" />
                  <div className="h-3 w-64 bg-gray-300 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Search Page Breadcrumbs
 */
function SearchBreadcrumbs({ query }: { query?: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Storage Account</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {query ? `Search results for "${query}"` : 'Search'}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * Main Search Results Page
 * 
 * Provides comprehensive search functionality across containers and blobs
 * with advanced filtering, sorting, and performance optimizations
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams?.q || ''
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SearchBreadcrumbs query={query} />
        </header>
        <DashboardHeader 
          title={query ? `Search results` : 'Search'} 
          searchQuery={query}
          showSearch={true}
        />
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 pt-0">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Search across all containers, blobs, metadata, and tags in your Azure Storage account.
              Use advanced filters to refine your results.
            </div>
          </div>
          <Separator />
          <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchResults searchParams={resolvedSearchParams} />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Enable static generation where possible and revalidate search data
export const revalidate = 60 // Revalidate search results every minute
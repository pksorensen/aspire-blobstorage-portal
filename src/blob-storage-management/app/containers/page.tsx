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
import { CreateContainerButton } from "@/components/containers/create-container-button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  FolderOpen, 
  Shield, 
  Key, 
  AlertCircle,
  RefreshCw,
  Filter,
  SortAsc,
  Eye,
  Globe,
  Lock
} from "lucide-react"
import { listContainers } from "@/lib/azure-storage"
import { ContainerItem } from "@/types/azure-types"
import Link from "next/link"

/**
 * Container Search and Filter Component (Server-Side Filtering)
 */
async function ContainerSearchAndFilter({ 
  searchQuery 
}: { 
  searchQuery?: string
  sortBy?: string
  sortOrder?: string 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Search and Filter Containers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search containers by name..."
              defaultValue={searchQuery}
              className="pl-10"
              name="search"
              data-testid="search-containers"
            />
          </div>
          <Button variant="outline" size="default">
            <SortAsc className="h-4 w-4 mr-2" />
            Sort
          </Button>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>Sort by:</span>
          <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground">
            Name
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground">
            Modified
          </Button>
          <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground">
            Size
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Container Metadata Display Component
 */
function ContainerMetadata({ container }: { container: ContainerItem }) {
  const formatDate = (date: Date) => {
    // Add validation for invalid dates
    if (!date || isNaN(date.getTime())) {
      return 'Unknown date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getPublicAccessIcon = (access: string) => {
    switch (access) {
      case 'container':
        return <Globe className="h-4 w-4 text-blue-500" />
      case 'blob':
        return <Eye className="h-4 w-4 text-amber-500" />
      default:
        return <Lock className="h-4 w-4 text-gray-500" />
    }
  }

  const getPublicAccessLabel = (access: string) => {
    switch (access) {
      case 'container':
        return 'Container (public read access)'
      case 'blob':
        return 'Blob (public read access for blobs only)'
      default:
        return 'Private (no anonymous access)'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {getPublicAccessIcon(container.properties.publicAccess)}
        <span className="text-sm text-muted-foreground" data-testid="container-public-access">
          {getPublicAccessLabel(container.properties.publicAccess)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Last modified:</span>
          <div className="font-medium" data-testid="container-last-modified">{formatDate(container.properties.lastModified)}</div>
        </div>
        <div>
          <span className="text-muted-foreground">ETag:</span>
          <div className="font-medium text-xs" data-testid="container-etag">{container.properties.etag}</div>
        </div>
      </div>
      {Object.keys(container.metadata).length > 0 && (
        <div>
          <span className="text-sm text-muted-foreground">Metadata:</span>
          <div className="mt-1 space-y-1">
            {Object.entries(container.metadata).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <Badge variant="outline">{key}</Badge>
                <span className="text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {(container.properties.hasImmutabilityPolicy || container.properties.hasLegalHold) && (
        <div className="flex gap-2">
          {container.properties.hasImmutabilityPolicy && (
            <Badge variant="secondary">
              <Shield className="h-3 w-3 mr-1" />
              Immutable
            </Badge>
          )}
          {container.properties.hasLegalHold && (
            <Badge variant="secondary">
              <Key className="h-3 w-3 mr-1" />
              Legal Hold
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Container List Component with Server-Side Data Fetching
 */
async function ContainerList({ searchQuery }: { searchQuery?: string }) {
  let containers: ContainerItem[] = []
  let error: string | null = null

  try {
    containers = await listContainers()
    
    // Server-side filtering
    if (searchQuery) {
      containers = containers.filter(container => 
        container.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Sort by name by default
    containers.sort((a, b) => a.name.localeCompare(b.name))
  } catch (err: unknown) {
    error = (err as Error).message || 'Failed to load containers'
  }

  if (error) {
    return (
      <Card className="border border-destructive/50" data-testid="containers-error">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-base font-medium text-destructive">
              Error Loading Containers
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (containers.length === 0) {
    return (
      <Card data-testid="containers-empty-state">
        <CardContent className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No containers found</h3>
          <p className="text-muted-foreground mb-4" data-testid="empty-state-message">
            {searchQuery 
              ? `No containers match your search for "${searchQuery}"`
              : "You haven't created any containers yet"
            }
          </p>
          {!searchQuery && (
            <CreateContainerButton data-testid="empty-state-create-container">
              Create your first container 2
            </CreateContainerButton>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" data-testid="container-list">
      <div className="text-sm text-muted-foreground">
        {containers.length} container{containers.length !== 1 ? 's' : ''} found
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {containers.map((container) => (
          <Card key={container.name} className="hover:bg-muted/50 transition-colors" data-testid={`container-${container.name}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <Link 
                  href={`/containers/${encodeURIComponent(container.name)}`}
                  className="hover:underline"
                  data-testid={`container-${container.name}-link`}
                >
                  <span data-testid="container-name">{container.name}</span>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContainerMetadata container={container} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Loading skeleton for container list
 */
function ContainerListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-48 bg-gray-300 rounded animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gray-300 rounded animate-pulse" />
                <div className="h-6 w-32 bg-gray-300 rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-300 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-300 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-300 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-gray-300 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-300 rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Container Navigation Breadcrumbs
 */
function ContainerBreadcrumbs() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Storage Account</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Blob containers</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

/**
 * Main Containers Page
 * 
 * Implements 100% React Server Components architecture with:
 * - Direct Azure SDK calls via listContainers()
 * - Server-side search filtering 
 * - Cached data fetching with Next.js unstable_cache
 * - Proper error handling and loading states
 * - Responsive design matching Azure Storage Explorer
 */
export default function ContainersPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const searchQuery = typeof searchParams?.search === 'string' 
    ? searchParams.search 
    : undefined

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset data-testid="containers-page">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4" data-testid="containers-header">
          <ContainerBreadcrumbs />
        </header>
        <DashboardHeader 
          title="Blob containers" 
          searchQuery={searchQuery}
          showSearch={true}
        />
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 pt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Browse and manage containers in your Azure Storage account. 
                Containers organize your blobs and control access permissions.
                Use the search bar above to find containers quickly.
              </div>
              <CreateContainerButton data-testid="header-create-container">
                Create Container
              </CreateContainerButton>
            </div>
            <Suspense fallback={<div className="h-32 bg-muted/10 rounded-lg animate-pulse" />}>
              <ContainerSearchAndFilter 
                searchQuery={searchQuery}
                sortBy="name"
                sortOrder="asc"
              />
            </Suspense>
          </div>
          <Separator />
          <Suspense fallback={<ContainerListSkeleton />}>
            <ContainerList searchQuery={searchQuery} />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Enable static generation where possible and revalidate data
export const revalidate = 60 // Revalidate container data every minute
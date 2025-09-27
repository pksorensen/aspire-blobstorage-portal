import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Suspense } from "react"
import { handleSearch, clearSearch } from "@/lib/actions/search-actions"

interface GlobalSearchProps {
  initialQuery?: string
  className?: string
}

/**
 * Global Search Component with type-ahead suggestions
 * 
 * This component provides a comprehensive search interface that:
 * - Searches across containers, blobs, and metadata
 * - Provides type-ahead suggestions based on search history
 * - Integrates with the application header
 * - Uses server components for data fetching
 */
export async function GlobalSearch({ initialQuery, className }: GlobalSearchProps) {
  return (
    <div className={className}>
      <SearchForm initialQuery={initialQuery} />
    </div>
  )
}

/**
 * Server Component for Global Search Form
 * Uses form actions for search functionality
 */

function SearchForm({ initialQuery }: { initialQuery?: string }) {
  return (
    <form action={handleSearch} className="relative">
      <div className="relative flex items-center">
        <button 
          type="submit" 
          data-testid="global-search-submit" 
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded z-10"
        >
          <Search className="h-4 w-4 text-gray-400" />
        </button>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          name="q"
          type="search"
          placeholder="Search containers, blobs, and metadata..."
          defaultValue={initialQuery}
          className="pl-10 pr-10 w-64 lg:w-96"
          autoComplete="off"
          data-testid="global-search-input"
        />
        {initialQuery && (
          <form action={clearSearch} className="absolute right-1 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Clear search</span>
            </Button>
          </form>
        )}
      </div>
    </form>
  )
}

/**
 * Search Suggestions Component (Server Component)
 * Shows recent searches and quick access items
 * TODO: Implement this component when needed
 */
/* async function SearchSuggestions() {
  // This would typically fetch from a search history service
  const recentSearches = [
    "images",
    "backup-2024",
    "config.json",
    "logs"
  ]

  const quickActions = [
    { label: "All containers", href: "/containers", icon: FolderOpen },
    { label: "Recent uploads", href: "/dashboard/recent", icon: Clock },
    { label: "Large files", href: "/search?filter=size&min=100MB", icon: FileText },
  ]

  return (
    <Card className="absolute top-full left-0 right-0 mt-2 z-50 border shadow-lg">
      <CardContent className="p-4">
        <div className="space-y-4">
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                Recent searches
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <Link
                    key={index}
                    href={`/search?q=${encodeURIComponent(search)}`}
                    className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50"
                  >
                    <Search className="h-3 w-3 text-muted-foreground" />
                    {search}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-2">Quick actions</div>
            <div className="space-y-1">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50"
                >
                  <action.icon className="h-3 w-3 text-muted-foreground" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} */

/**
 * Compact Global Search for Header Integration
 */
export function GlobalSearchCompact({ initialQuery }: { initialQuery?: string }) {
  return (
    <div className="relative">
      <SearchForm initialQuery={initialQuery} />
      <Suspense fallback={null}>
        {/* Suggestions would be shown on focus - this is a placeholder for the enhanced version */}
      </Suspense>
    </div>
  )
}

/**
 * Search Results Preview Component (Server Component)
 * Shows a quick preview of search results in a dropdown
 * TODO: Implement this component when needed
 */
/* async function SearchResultsPreview({ query }: { query: string }) {
  if (!query || query.length < 2) {
    return null
  }

  // This would typically perform a limited search across containers and blobs
  // For now, this is a placeholder structure
  const mockResults = {
    containers: [
      { name: "images-2024", url: "/containers/images-2024" },
      { name: "backup-images", url: "/containers/backup-images" }
    ],
    blobs: [
      { name: "profile-image.jpg", container: "images", url: "/containers/images" },
      { name: "header-image.png", container: "assets", url: "/containers/assets" }
    ]
  }

  const hasResults = mockResults.containers.length > 0 || mockResults.blobs.length > 0

  if (!hasResults) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-2 z-50 border shadow-lg">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          No results found for &quot;{query}&quot;
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="absolute top-full left-0 right-0 mt-2 z-50 border shadow-lg">
      <CardContent className="p-4">
        <div className="space-y-3">
          {mockResults.containers.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Containers</div>
              <div className="space-y-1">
                {mockResults.containers.slice(0, 3).map((container, index) => (
                  <Link
                    key={index}
                    href={container.url}
                    className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50"
                  >
                    <FolderOpen className="h-3 w-3 text-blue-600" />
                    {container.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {mockResults.blobs.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Blobs</div>
              <div className="space-y-1">
                {mockResults.blobs.slice(0, 3).map((blob, index) => (
                  <Link
                    key={index}
                    href={blob.url}
                    className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50"
                  >
                    <FileText className="h-3 w-3 text-gray-600" />
                    <div className="flex-1 truncate">{blob.name}</div>
                    <Badge variant="outline" className="text-xs">
                      {blob.container}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            className="block text-center text-sm text-blue-600 hover:text-blue-800 py-1"
          >
            View all results for &quot;{query}&quot;
          </Link>
        </div>
      </CardContent>
    </Card>
  )
} */
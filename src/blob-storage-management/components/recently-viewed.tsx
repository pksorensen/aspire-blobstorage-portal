import { Star, MoreHorizontal, FolderOpen, FileText, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getCachedRecentlyViewedItems, formatLastViewed } from "@/lib/recently-viewed"
import { Suspense } from "react"
import Link from "next/link"

// Loading skeleton for recently viewed section
function RecentlyViewedSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="h-6 w-32 bg-gray-300 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-300 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
              </div>
              <div className="h-8 w-8 bg-gray-300 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Empty state when no recent items
function EmptyRecentlyViewed() {
  return (
    <Card data-testid="recent-items-section">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold" data-testid="recent-items-title">Recently viewed</CardTitle>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No recently viewed items
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Start browsing containers and blobs to see them here
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Get icon component for item type
function getItemIcon(type: 'container' | 'blob') {
  switch (type) {
    case 'container':
      return FolderOpen;
    case 'blob':
      return FileText;
    default:
      return FileText;
  }
}

// Main recently viewed component with live data
async function LiveRecentlyViewed() {
  try {
    const recentItems = await getCachedRecentlyViewedItems();
    
    if (recentItems.length === 0) {
      return <EmptyRecentlyViewed />;
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Recently viewed</CardTitle>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentItems.map((item) => {
              const ItemIcon = getItemIcon(item.type);
              const isUnavailable = !item.exists;
              
              return (
                <div
                  key={`${item.type}-${item.name}`}
                  className={`flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors ${
                    isUnavailable ? 'opacity-60' : ''
                  }`}
                  data-testid={`recent-item-${item.name}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                      item.type === 'container' 
                        ? 'bg-blue-500/20' 
                        : 'bg-green-500/20'
                    }`}>
                      <ItemIcon className={`h-3 w-3 ${
                        item.type === 'container' 
                          ? 'text-blue-500' 
                          : 'text-green-500'
                      } ${isUnavailable ? 'opacity-60' : ''}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isUnavailable ? (
                          <span className="text-sm font-medium text-muted-foreground line-through truncate" data-testid="recent-item-name">
                            {item.name}
                          </span>
                        ) : (
                          <Link 
                            href={item.url}
                            className="text-sm font-medium text-blue-600 hover:underline cursor-pointer truncate"
                            data-testid="recent-item-name"
                          >
                            {item.name}
                          </Link>
                        )}
                        
                        <Badge variant="secondary" className="text-xs" data-testid="recent-item-type">
                          {item.type}
                        </Badge>
                        
                        {isUnavailable && (
                          <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground" data-testid="recent-item-date">
                        {formatLastViewed(item.lastViewed)}
                        <span data-testid="recent-item-path">
                          {item.containerName && ` • in ${item.containerName}`}
                        </span>
                        {isUnavailable && ' • Deleted or moved'}
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          
          <div className="text-xs text-muted-foreground mt-4 pt-3 border-t">
            Showing recent {recentItems.length} items • Updates automatically
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error('Error rendering recently viewed items:', error);
    
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Recently viewed</CardTitle>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              Unable to load recent items
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please try refreshing the page
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
}

// Main exported component with Suspense boundary
export function RecentlyViewed() {
  return (
    <Suspense fallback={<RecentlyViewedSkeleton />}>
      <LiveRecentlyViewed />
    </Suspense>
  )
}
"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, Clock, TrendingUp, Filter as FilterIcon, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { 
  searchHistory, 
  SearchSuggestion, 
  getTrendingSearches,
  getSearchSuggestionIcon 
} from "@/lib/search-history"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface EnhancedSearchProps {
  initialQuery?: string
  placeholder?: string
  className?: string
  showSuggestions?: boolean
  autoFocus?: boolean
  onSearch?: (query: string) => void
}

/**
 * Enhanced Search Component with History and Suggestions
 * 
 * This component provides an advanced search experience with:
 * - Real-time search suggestions
 * - Search history integration
 * - Trending searches
 * - Keyboard navigation
 * - Quick actions
 */
export function EnhancedSearch({
  initialQuery = "",
  placeholder = "Search containers, blobs, and metadata...",
  className,
  showSuggestions = true,
  autoFocus = false,
  onSearch
}: EnhancedSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [trending, setTrending] = useState<SearchSuggestion[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Load trending searches on mount
  useEffect(() => {
    getTrendingSearches(5).then(setTrending)
  }, [])

  // Update suggestions when query changes
  useEffect(() => {
    if (query.trim()) {
      const newSuggestions = searchHistory.generateSuggestions(query, 6)
      setSuggestions(newSuggestions)
    } else {
      setSuggestions([])
    }
    setSelectedIndex(-1)
  }, [query])

  // Handle search submission
  const handleSearch = (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) return

    // Add to search history
    searchHistory.addToHistory({
      query: trimmedQuery,
      timestamp: new Date(),
      results: 0, // Will be updated when results are loaded
      type: 'global'
    })

    setShowDropdown(false)
    
    if (onSearch) {
      onSearch(trimmedQuery)
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setShowDropdown(showSuggestions && value.length > 0)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSearch(query)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          const selectedSuggestion = suggestions[selectedIndex]
          setQuery(selectedSuggestion.text)
          handleSearch(selectedSuggestion.text)
        } else {
          handleSearch(query)
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    handleSearch(suggestion.text)
  }

  // Handle clear search
  const handleClear = () => {
    setQuery("")
    setShowDropdown(false)
    setSelectedIndex(-1)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Handle input focus
  const handleFocus = () => {
    if (showSuggestions) {
      setShowDropdown(query.length > 0 || trending.length > 0)
    }
  }

  // Handle input blur (with delay to allow clicks)
  const handleBlur = () => {
    setTimeout(() => {
      setShowDropdown(false)
      setSelectedIndex(-1)
    }, 150)
  }

  // Get icon for suggestion type
  const getSuggestionIcon = (suggestion: SearchSuggestion) => {
    const iconName = getSearchSuggestionIcon(suggestion)
    switch (iconName) {
      case 'clock':
        return <Clock className="h-3 w-3" />
      case 'trending':
        return <TrendingUp className="h-3 w-3" />
      default:
        return <Search className="h-3 w-3" />
    }
  }

  const hasContent = query.length > 0 || trending.length > 0
  const displaySuggestions = suggestions.length > 0 ? suggestions : trending

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
          autoComplete="off"
        />
        
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {showDropdown && showSuggestions && hasContent && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 border shadow-lg max-h-96 overflow-y-auto"
        >
          <CardContent className="p-0">
            {/* Search Suggestions */}
            {displaySuggestions.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {query ? "Suggestions" : "Trending searches"}
                  </div>
                </div>
                {displaySuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.text}-${index}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/50 transition-colors",
                      selectedIndex === index && "bg-muted/50"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="text-muted-foreground">
                      {getSuggestionIcon(suggestion)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {suggestion.text}
                      </div>
                      {suggestion.metadata?.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {suggestion.metadata.description}
                        </div>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            {query.length === 0 && (
              <>
                <Separator />
                <div className="py-2">
                  <div className="px-4 py-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Quick actions
                    </div>
                  </div>
                  <Link
                    href="/containers"
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <FilterIcon className="h-3 w-3 text-muted-foreground" />
                    <span>Browse all containers</span>
                  </Link>
                  <Link
                    href="/search?filter=recent"
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>Recently modified files</span>
                  </Link>
                  <Link
                    href="/search?filter=large"
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span>Large files</span>
                  </Link>
                </div>
              </>
            )}

            {/* Search Instructions */}
            {query.length > 0 && displaySuggestions.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Press Enter to search for &quot;{query}&quot;</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Compact Enhanced Search for Headers
 */
export function EnhancedSearchCompact(props: Omit<EnhancedSearchProps, 'className'>) {
  return (
    <EnhancedSearch
      {...props}
      className="w-64 lg:w-96"
      showSuggestions={true}
    />
  )
}

/**
 * Search History Display Component
 */
export function SearchHistoryDisplay() {
  const [recentSearches, setRecentSearches] = useState<any[]>([])
  const [popularSearches, setPopularSearches] = useState<any[]>([])

  useEffect(() => {
    setRecentSearches(searchHistory.getRecentQueries(10))
    setPopularSearches(searchHistory.getPopularQueries(10))
  }, [])

  const handleClearHistory = () => {
    searchHistory.clearHistory()
    setRecentSearches([])
    setPopularSearches([])
  }

  if (recentSearches.length === 0 && popularSearches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No search history yet. Start searching to see your history here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {recentSearches.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Recent searches</h3>
              <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                Clear
              </Button>
            </div>
            <div className="space-y-1">
              {recentSearches.map((search, index) => (
                <Link
                  key={index}
                  href={`/search?q=${encodeURIComponent(search.query)}`}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{search.query}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {search.results} results
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {popularSearches.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3">
              <h3 className="text-sm font-medium">Popular searches</h3>
            </div>
            <div className="space-y-1">
              {popularSearches.map((search, index) => (
                <Link
                  key={index}
                  href={`/search?q=${encodeURIComponent(search.query)}`}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{search.query}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {search.results} results
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
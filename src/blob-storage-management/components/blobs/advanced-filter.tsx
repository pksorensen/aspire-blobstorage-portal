import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Filter, 
  X, 
  Calendar,
  HardDrive,
  FileText,
  Image,
  Archive,
  Database,
  Zap,
  Eye,
  Snowflake
} from "lucide-react"

interface BlobFilter {
  namePattern?: string
  contentType?: string
  blobType?: 'all' | 'BlockBlob' | 'PageBlob' | 'AppendBlob'
  accessTier?: 'all' | 'Hot' | 'Cool' | 'Archive'
  minSize?: number
  maxSize?: number
  modifiedAfter?: string
  modifiedBefore?: string
  hasMetadata?: boolean
  hasTags?: boolean
  isDeleted?: boolean
  sortBy?: 'name' | 'size' | 'modified' | 'type' | 'tier'
  sortOrder?: 'asc' | 'desc'
}

interface AdvancedBlobFilterProps {
  currentFilters: BlobFilter
  onFiltersChange: (filters: BlobFilter) => void
  onReset: () => void
  isOpen: boolean
  onClose: () => void
  containerName?: string
}

/**
 * Advanced Blob Filter Component (Server Component)
 * 
 * Provides comprehensive filtering options for blob searches including:
 * - Name pattern matching with regex support
 * - Content type and blob type filtering
 * - Access tier filtering
 * - Size range filtering
 * - Date range filtering
 * - Metadata and tags filtering
 * - Sorting options
 */
export function AdvancedBlobFilter({
  currentFilters,
  onFiltersChange,
  onReset,
  isOpen,
  onClose,
  containerName
}: AdvancedBlobFilterProps) {
  if (!isOpen) {
    return null
  }

  const handleFilterChange = (key: keyof BlobFilter, value: string | number | boolean | undefined) => {
    onFiltersChange({
      ...currentFilters,
      [key]: value
    })
  }

  const getActiveFilterCount = () => {
    return Object.entries(currentFilters).filter(([key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return false
      return value !== undefined && value !== '' && value !== 'all' && value !== false
    }).length
  }

  const activeFilterCount = getActiveFilterCount()

  // File size presets in bytes
  const sizePresets = [
    { label: '< 1 MB', max: 1024 * 1024 },
    { label: '1-10 MB', min: 1024 * 1024, max: 10 * 1024 * 1024 },
    { label: '10-100 MB', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
    { label: '> 100 MB', min: 100 * 1024 * 1024 }
  ]

  const commonContentTypes = [
    { value: 'image/', label: 'Images', icon: Image },
    { value: 'application/pdf', label: 'PDF', icon: FileText },
    { value: 'application/json', label: 'JSON', icon: Database },
    { value: 'application/xml', label: 'XML', icon: Database },
    { value: 'text/', label: 'Text files', icon: FileText },
    { value: 'application/zip', label: 'Archives', icon: Archive }
  ]

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Blob Filters
            {containerName && (
              <Badge variant="outline">in {containerName}</Badge>
            )}
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Name Pattern */}
        <div className="space-y-3">
          <Label htmlFor="blob-name-pattern" className="text-sm font-medium">
            Blob Name Pattern
          </Label>
          <Input
            id="blob-name-pattern"
            type="text"
            placeholder="Enter name pattern, extension, or regex..."
            value={currentFilters.namePattern || ''}
            onChange={(e) => handleFilterChange('namePattern', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Examples: *.jpg, config.*, backup-*, /logs/.*\.txt$
          </p>
        </div>

        <Separator />

        {/* Content Type */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Content Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {commonContentTypes.map(type => (
              <Button
                key={type.value}
                variant={currentFilters.contentType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newValue = currentFilters.contentType === type.value 
                    ? undefined 
                    : type.value
                  handleFilterChange('contentType', newValue)
                }}
                className="justify-start"
              >
                <type.icon className="h-3 w-3 mr-2" />
                {type.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Custom content type..."
              value={currentFilters.contentType || ''}
              onChange={(e) => handleFilterChange('contentType', e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <Separator />

        {/* Blob Type and Access Tier */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Blob Type</Label>
              <Select 
                value={currentFilters.blobType || 'all'}
                onValueChange={(value) => handleFilterChange('blobType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="BlockBlob">Block Blob</SelectItem>
                  <SelectItem value="PageBlob">Page Blob</SelectItem>
                  <SelectItem value="AppendBlob">Append Blob</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Access Tier</Label>
              <Select 
                value={currentFilters.accessTier || 'all'}
                onValueChange={(value) => handleFilterChange('accessTier', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tiers</SelectItem>
                  <SelectItem value="Hot">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-red-500" />
                      Hot
                    </div>
                  </SelectItem>
                  <SelectItem value="Cool">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3 text-blue-500" />
                      Cool
                    </div>
                  </SelectItem>
                  <SelectItem value="Archive">
                    <div className="flex items-center gap-2">
                      <Snowflake className="h-3 w-3 text-gray-500" />
                      Archive
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* File Size */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            File Size
          </Label>
          
          {/* Size Presets */}
          <div className="grid grid-cols-2 gap-2">
            {sizePresets.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  handleFilterChange('minSize', preset.min)
                  handleFilterChange('maxSize', preset.max)
                }}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          {/* Custom Size Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="min-size" className="text-xs text-muted-foreground">
                Min size (bytes)
              </Label>
              <Input
                id="min-size"
                type="number"
                placeholder="0"
                value={currentFilters.minSize || ''}
                onChange={(e) => handleFilterChange('minSize', 
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-size" className="text-xs text-muted-foreground">
                Max size (bytes)
              </Label>
              <Input
                id="max-size"
                type="number"
                placeholder="No limit"
                value={currentFilters.maxSize || ''}
                onChange={(e) => handleFilterChange('maxSize', 
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Date Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Last Modified Date Range
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="modified-after" className="text-xs text-muted-foreground">
                Modified after
              </Label>
              <Input
                id="modified-after"
                type="date"
                value={currentFilters.modifiedAfter || ''}
                onChange={(e) => handleFilterChange('modifiedAfter', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modified-before" className="text-xs text-muted-foreground">
                Modified before
              </Label>
              <Input
                id="modified-before"
                type="date"
                value={currentFilters.modifiedBefore || ''}
                onChange={(e) => handleFilterChange('modifiedBefore', e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Blob Properties */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Blob Properties</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-blob-metadata"
                checked={currentFilters.hasMetadata || false}
                onCheckedChange={(checked) => 
                  handleFilterChange('hasMetadata', checked || undefined)
                }
              />
              <Label htmlFor="has-blob-metadata" className="text-sm font-normal cursor-pointer">
                Has custom metadata
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-tags"
                checked={currentFilters.hasTags || false}
                onCheckedChange={(checked) => 
                  handleFilterChange('hasTags', checked || undefined)
                }
              />
              <Label htmlFor="has-tags" className="text-sm font-normal cursor-pointer">
                Has tags
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-deleted"
                checked={currentFilters.isDeleted || false}
                onCheckedChange={(checked) => 
                  handleFilterChange('isDeleted', checked || undefined)
                }
              />
              <Label htmlFor="is-deleted" className="text-sm font-normal cursor-pointer">
                Include deleted blobs
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Sorting Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sorting</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="blob-sort-by" className="text-xs text-muted-foreground">
                Sort by
              </Label>
              <Select 
                value={currentFilters.sortBy || 'name'}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                  <SelectItem value="modified">Last Modified</SelectItem>
                  <SelectItem value="type">Blob Type</SelectItem>
                  <SelectItem value="tier">Access Tier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blob-sort-order" className="text-xs text-muted-foreground">
                Order
              </Label>
              <Select 
                value={currentFilters.sortOrder || 'asc'}
                onValueChange={(value) => handleFilterChange('sortOrder', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(currentFilters).map(([key, value]) => {
                  if (!value || value === 'all' || key === 'sortBy' || key === 'sortOrder') {
                    return null
                  }
                  
                  let displayValue = String(value)
                  if (key === 'minSize' || key === 'maxSize') {
                    const sizeInMB = Number(value) / (1024 * 1024)
                    displayValue = `${key === 'minSize' ? '>=' : '<='} ${sizeInMB.toFixed(1)}MB`
                  } else if (typeof value === 'boolean') {
                    displayValue = key.replace(/([A-Z])/g, ' $1').toLowerCase().replace('has ', '')
                  }
                  
                  return (
                    <Badge key={key} variant="secondary" className="gap-1">
                      {displayValue}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleFilterChange(key as keyof BlobFilter, undefined)}
                      />
                    </Badge>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Blob Filter Quick Actions
 * Provides one-click filter presets for common searches
 */
export function BlobFilterQuickActions({
  onApplyFilter
}: {
  onApplyFilter: (filter: BlobFilter) => void
}) {
  const quickFilters = [
    {
      label: 'Images only',
      filter: { contentType: 'image/' },
      icon: Image
    },
    {
      label: 'Large files',
      filter: { minSize: 100 * 1024 * 1024, sortBy: 'size' as const, sortOrder: 'desc' as const },
      icon: HardDrive
    },
    {
      label: 'Recent files',
      filter: { 
        modifiedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sortBy: 'modified' as const,
        sortOrder: 'desc' as const
      },
      icon: Calendar
    },
    {
      label: 'Hot tier',
      filter: { accessTier: 'Hot' as const },
      icon: Zap
    },
    {
      label: 'With metadata',
      filter: { hasMetadata: true },
      icon: Database
    },
    {
      label: 'Archive tier',
      filter: { accessTier: 'Archive' as const },
      icon: Snowflake
    }
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {quickFilters.map((preset, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onApplyFilter(preset.filter)}
          className="flex items-center gap-2"
        >
          <preset.icon className="h-3 w-3" />
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
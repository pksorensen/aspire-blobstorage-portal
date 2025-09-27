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
  Shield,
  Key,
  Globe,
  Lock,
  Eye
} from "lucide-react"

interface ContainerFilter {
  namePattern?: string
  publicAccess?: 'all' | 'none' | 'blob' | 'container'
  hasMetadata?: boolean
  hasImmutabilityPolicy?: boolean
  hasLegalHold?: boolean
  createdAfter?: string
  createdBefore?: string
  sortBy?: 'name' | 'lastModified' | 'size'
  sortOrder?: 'asc' | 'desc'
}

interface AdvancedContainerFilterProps {
  currentFilters: ContainerFilter
  onFiltersChange: (filters: ContainerFilter) => void
  onReset: () => void
  isOpen: boolean
  onClose: () => void
}

/**
 * Advanced Container Filter Component (Server Component)
 * 
 * Provides comprehensive filtering options for container searches including:
 * - Name pattern matching
 * - Public access level filtering
 * - Metadata and policy filtering
 * - Date range filtering
 * - Sorting options
 */
export function AdvancedContainerFilter({
  currentFilters,
  onFiltersChange,
  onReset,
  isOpen,
  onClose
}: AdvancedContainerFilterProps) {
  if (!isOpen) {
    return null
  }

  const handleFilterChange = (key: keyof ContainerFilter, value: any) => {
    onFiltersChange({
      ...currentFilters,
      [key]: value
    })
  }

  const getActiveFilterCount = () => {
    return Object.entries(currentFilters).filter(([key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return false
      return value !== undefined && value !== '' && value !== 'all'
    }).length
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Container Filters
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
          <Label htmlFor="name-pattern" className="text-sm font-medium">
            Container Name Pattern
          </Label>
          <Input
            id="name-pattern"
            type="text"
            placeholder="Enter name pattern or regex..."
            value={currentFilters.namePattern || ''}
            onChange={(e) => handleFilterChange('namePattern', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Supports wildcards (*) and regular expressions. Leave empty to search all containers.
          </p>
        </div>

        <Separator />

        {/* Public Access Level */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Public Access Level</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'all', label: 'All containers', icon: null },
              { value: 'none', label: 'Private only', icon: Lock },
              { value: 'blob', label: 'Public blobs', icon: Eye },
              { value: 'container', label: 'Public container', icon: Globe }
            ].map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`access-${option.value}`}
                  checked={currentFilters.publicAccess === option.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleFilterChange('publicAccess', option.value)
                    }
                  }}
                />
                <Label
                  htmlFor={`access-${option.value}`}
                  className="text-sm font-normal flex items-center gap-2 cursor-pointer"
                >
                  {option.icon && <option.icon className="h-3 w-3" />}
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Container Properties */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Container Properties</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-metadata"
                checked={currentFilters.hasMetadata || false}
                onCheckedChange={(checked) => 
                  handleFilterChange('hasMetadata', checked || undefined)
                }
              />
              <Label htmlFor="has-metadata" className="text-sm font-normal cursor-pointer">
                Has custom metadata
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-immutability"
                checked={currentFilters.hasImmutabilityPolicy || false}
                onCheckedChange={(checked) => 
                  handleFilterChange('hasImmutabilityPolicy', checked || undefined)
                }
              />
              <Label 
                htmlFor="has-immutability" 
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <Shield className="h-3 w-3" />
                Has immutability policy
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-legal-hold"
                checked={currentFilters.hasLegalHold || false}
                onCheckedChange={(checked) => 
                  handleFilterChange('hasLegalHold', checked || undefined)
                }
              />
              <Label 
                htmlFor="has-legal-hold" 
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <Key className="h-3 w-3" />
                Has legal hold
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Date Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Creation Date Range
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="created-after" className="text-xs text-muted-foreground">
                Created after
              </Label>
              <Input
                id="created-after"
                type="date"
                value={currentFilters.createdAfter || ''}
                onChange={(e) => handleFilterChange('createdAfter', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="created-before" className="text-xs text-muted-foreground">
                Created before
              </Label>
              <Input
                id="created-before"
                type="date"
                value={currentFilters.createdBefore || ''}
                onChange={(e) => handleFilterChange('createdBefore', e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Sorting Options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sorting</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sort-by" className="text-xs text-muted-foreground">
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
                  <SelectItem value="lastModified">Last Modified</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort-order" className="text-xs text-muted-foreground">
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
                  if (key === 'publicAccess') {
                    displayValue = value === 'none' ? 'Private' : 
                                  value === 'blob' ? 'Public blobs' : 'Public container'
                  } else if (typeof value === 'boolean') {
                    displayValue = key.replace(/([A-Z])/g, ' $1').toLowerCase()
                  }
                  
                  return (
                    <Badge key={key} variant="secondary" className="gap-1">
                      {displayValue}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleFilterChange(key as keyof ContainerFilter, undefined)}
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
 * Container Filter Quick Actions
 * Provides one-click filter presets
 */
export function ContainerFilterQuickActions({
  onApplyFilter
}: {
  onApplyFilter: (filter: ContainerFilter) => void
}) {
  const quickFilters = [
    {
      label: 'Public containers',
      filter: { publicAccess: 'container' as const },
      icon: Globe
    },
    {
      label: 'With metadata',
      filter: { hasMetadata: true },
      icon: Key
    },
    {
      label: 'Recently created',
      filter: { 
        createdAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sortBy: 'lastModified' as const,
        sortOrder: 'desc' as const
      },
      icon: Calendar
    },
    {
      label: 'With policies',
      filter: { hasImmutabilityPolicy: true },
      icon: Shield
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
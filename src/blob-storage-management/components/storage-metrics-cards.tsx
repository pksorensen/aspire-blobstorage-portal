import { FolderOpen, FileText, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getStorageMetrics, getConnectionHealth } from "@/lib/azure-storage"
import { AzureStorageError } from "@/types/azure-types"
import { Suspense } from "react"

// Helper function to format bytes to human-readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const formattedValue = (bytes / Math.pow(1024, i)).toFixed(2)
  
  return `${formattedValue} ${sizes[i]}`
}

// Loading skeleton for metrics cards
function MetricsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="border border-border/50">
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10 animate-pulse">
                <div className="h-4 w-4 bg-gray-300 rounded" />
              </div>
              <div className="h-5 w-24 bg-gray-300 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex justify-between text-sm">
                <div className="h-4 w-32 bg-gray-300 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-300 rounded animate-pulse" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Error display component
function MetricsError({ error }: { error: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
      <Card className="border border-destructive/50">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-base font-medium text-destructive">
              Connection Error
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Badge variant="destructive" className="mt-2">
            Azure Storage Unavailable
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}

// Main metrics component that fetches live data
async function LiveStorageMetrics() {
  try {
    // Check connection health first
    const healthStatus = await getConnectionHealth()
    if (!healthStatus.isHealthy) {
      return <MetricsError error={healthStatus.error || 'Unable to connect to Azure Storage'} />
    }

    // Fetch live metrics from Azure Storage
    const metrics = await getStorageMetrics()
    
    // Current implementation focuses on blob storage only
    const blobMetrics = {
      title: "Blob containers",
      icon: FolderOpen,
      metrics: [
        { label: "Number of containers", value: metrics.containerCount.toString() },
        { label: "Number of blobs", value: metrics.blobCount.toString() },
        { label: "Total data stored", value: formatBytes(metrics.totalSize) },
        { label: "Used capacity", value: "0%" }, // Placeholder for used capacity
      ],
      disabled: false,
    }

    // Placeholder for future storage services
    const placeholderServices = [
      {
        title: "File shares",
        icon: FileText,
        metrics: [
          { label: "Number of file shares", value: "0" },
          { label: "Number of files", value: "0" },
          { label: "Total data stored", value: "0 B" },
        ],
        disabled: true,
      },
    ]

    const allServices = [blobMetrics, ...placeholderServices]

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2" data-testid="metrics-cards">
        {allServices.map((service) => {
          const Icon = service.icon
          const isDisabled = service.disabled || false
          
          return (
            <Card key={service.title} className={`border ${isDisabled ? 'border-border/30 opacity-60' : 'border-border/50'}`} data-testid={`storage-metrics-card`}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-md ${isDisabled ? 'bg-gray-100' : 'bg-primary/10'}`}>
                    <Icon className={`h-4 w-4 ${isDisabled ? 'text-gray-400' : 'text-primary'}`} />
                  </div>
                  <CardTitle className={`text-base font-medium ${isDisabled ? 'text-gray-500' : ''}`}>
                    {service.title}
                  </CardTitle>
                  {isDisabled && (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.metrics.map((metric) => {
                  let testId = '';
                  if (service.title === 'Blob containers') {
                    if (metric.label === 'Number of containers') testId = 'metric-container-count';
                    else if (metric.label === 'Number of blobs') testId = 'metric-blob-count';
                    else if (metric.label === 'Total data stored') testId = 'metric-total-size';
                    else if (metric.label === 'Used capacity') testId = 'metric-used-capacity';
                  }
                  
                  return (
                    <div key={metric.label} className="flex justify-between text-sm">
                      <span className={`${isDisabled ? 'text-gray-400' : 'text-muted-foreground'}`}>
                        {metric.label}
                      </span>
                      <span className={`font-medium ${isDisabled ? 'text-gray-500' : ''}`} data-testid={testId || undefined}>
                        {metric.value}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
        <div className="col-span-full">
          <div className="text-xs text-muted-foreground">
            Last updated: {metrics.lastUpdated.toLocaleString()} • Data refreshes every 5 minutes
          </div>
        </div>
      </div>
    )
  } catch (error) {
    const errorMessage = error instanceof AzureStorageError 
      ? `${error.message} (${error.code})`
      : error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while fetching storage metrics'
    
    return <MetricsError error={errorMessage} />
  }
}

// Main exported component with Suspense boundary
export function StorageMetricsCards() {
  return (
    <Suspense fallback={<MetricsCardsSkeleton />}>
      <LiveStorageMetrics />
    </Suspense>
  )
}
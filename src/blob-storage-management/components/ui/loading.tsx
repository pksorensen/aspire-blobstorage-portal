"use client"

import { Loader2, Download, Upload, Database, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface LoadingProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  text?: string
  variant?: "default" | "card" | "inline"
}

interface ProgressLoadingProps extends LoadingProps {
  progress?: number
  maxProgress?: number
  showPercentage?: boolean
}

export function Loading({ className, size = "md", text, variant = "default" }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-10 w-10"
  }

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {text && (
        <p className={cn(
          "text-muted-foreground",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          {text}
        </p>
      )}
    </div>
  )

  if (variant === "card") {
    return (
      <Card>
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    )
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
        {text && (
          <span className="text-sm text-muted-foreground">{text}</span>
        )}
      </div>
    )
  }

  return content
}

export function LoadingSpinner({ className, size = "md" }: Omit<LoadingProps, "text">) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-10 w-10"
  }

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  )
}

export function ProgressLoading({ 
  className, 
  size = "md", 
  text, 
  variant = "default",
  progress,
  maxProgress = 100,
  showPercentage = true
}: ProgressLoadingProps) {
  const percentage = progress !== undefined && maxProgress > 0 
    ? Math.round((progress / maxProgress) * 100) 
    : undefined

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loading size={size} />
      {text && (
        <p className={cn(
          "text-muted-foreground",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          {text}
        </p>
      )}
      {percentage !== undefined && (
        <div className="w-full max-w-xs space-y-1">
          <Progress value={percentage} className="h-2" />
          {showPercentage && (
            <div className="text-xs text-muted-foreground text-center">
              {percentage}%
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (variant === "card") {
    return (
      <Card>
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    )
  }

  return content
}

/**
 * Specialized Loading Components for Azure Storage Operations
 */

export function AzureStorageLoading({ 
  operation, 
  containerName, 
  blobCount 
}: { 
  operation?: string
  containerName?: string
  blobCount?: number
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-blue-600" />
          Azure Storage Operation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Loading size="md" />
        {operation && (
          <div className="text-sm text-muted-foreground text-center">
            {operation}
          </div>
        )}
        {containerName && (
          <div className="flex justify-center">
            <Badge variant="outline">{containerName}</Badge>
          </div>
        )}
        {blobCount !== undefined && (
          <div className="text-xs text-muted-foreground text-center">
            Processing {blobCount} items...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DataFetchLoading({ 
  operation = "Loading data", 
  size = "md" 
}: { 
  operation?: string
  size?: "sm" | "md" | "lg"
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <RefreshCw className={cn(
        "animate-spin text-blue-500",
        size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-6 w-6"
      )} />
      <p className={cn(
        "text-muted-foreground",
        size === "sm" ? "text-xs" : "text-sm"
      )}>
        {operation}...
      </p>
    </div>
  )
}

export function UploadLoading({ 
  filename, 
  progress, 
  speed 
}: { 
  filename?: string
  progress?: number
  speed?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4 text-green-600" />
          Uploading File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {filename && (
          <div className="text-sm font-medium truncate">
            {filename}
          </div>
        )}
        <ProgressLoading 
          progress={progress}
          text={speed ? `Upload speed: ${speed}` : undefined}
        />
      </CardContent>
    </Card>
  )
}

export function DownloadLoading({ 
  filename, 
  progress, 
  size: fileSize 
}: { 
  filename?: string
  progress?: number
  size?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4 text-blue-600" />
          Downloading File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {filename && (
          <div className="text-sm font-medium truncate">
            {filename}
          </div>
        )}
        {fileSize && (
          <div className="text-xs text-muted-foreground">
            File size: {fileSize}
          </div>
        )}
        <ProgressLoading progress={progress} />
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton Loading Components
 */

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number, cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div 
              key={j} 
              className={cn(
                "bg-gray-300 rounded animate-pulse",
                j === 0 ? "h-4 w-32" : "h-4 w-24"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-300 rounded animate-pulse" />
              <div className="h-6 w-32 bg-gray-300 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 w-48 bg-gray-300 rounded animate-pulse" />
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
  )
}
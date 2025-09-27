"use client"

import { Component, ReactNode } from "react"
import { AlertTriangle, RefreshCw, WifiOff, Server, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  context?: string // For identifying where the error occurred
  onRetry?: () => void
  showRefresh?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
  retryAttempts?: number
}

interface ErrorType {
  type: 'network' | 'server' | 'client' | 'azure' | 'unknown'
  icon: ReactNode
  title: string
  description: string
  canRetry: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, retryAttempts: 0 }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, retryAttempts: 0 }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Log error context for debugging
    console.error('Error context:', {
      context: this.props.context,
      retryAttempts: this.state.retryAttempts,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown'
    })

    // Report error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private reportError = (_error: Error, _errorInfo: any) => {
    // This would integrate with your error reporting service (e.g., Sentry, Application Insights)
    if (typeof window !== 'undefined' && window.performance) {
      const performanceData = {
        navigation: window.performance.getEntriesByType('navigation')[0],
        memory: (window.performance as any).memory,
        connection: (window.navigator as any).connection
      }
      
      console.warn('Performance data at error time:', performanceData)
    }
  }

  private getErrorType = (error: Error): ErrorType => {
    const errorMessage = error.message.toLowerCase()
    
    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('offline')) {
      return {
        type: 'network',
        icon: <WifiOff className="h-5 w-5 text-amber-600" />,
        title: 'Network Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        canRetry: true
      }
    }
    
    // Azure Storage specific errors
    if (errorMessage.includes('azure') || errorMessage.includes('storage') || errorMessage.includes('blob')) {
      return {
        type: 'azure',
        icon: <Database className="h-5 w-5 text-blue-600" />,
        title: 'Azure Storage Error',
        description: 'There was an issue connecting to Azure Storage. This might be temporary.',
        canRetry: true
      }
    }
    
    // Server errors
    if (errorMessage.includes('500') || errorMessage.includes('server') || errorMessage.includes('internal')) {
      return {
        type: 'server',
        icon: <Server className="h-5 w-5 text-red-600" />,
        title: 'Server Error',
        description: 'The server encountered an error. Our team has been notified.',
        canRetry: true
      }
    }
    
    // Client-side errors
    if (errorMessage.includes('render') || errorMessage.includes('component') || errorMessage.includes('undefined')) {
      return {
        type: 'client',
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
        title: 'Application Error',
        description: 'A client-side error occurred. Please try refreshing the page.',
        canRetry: false
      }
    }
    
    // Unknown errors
    return {
      type: 'unknown',
      icon: <AlertTriangle className="h-5 w-5 text-gray-600" />,
      title: 'Unexpected Error',
      description: 'An unexpected error occurred. Please try again.',
      canRetry: true
    }
  }

  private handleRetry = () => {
    const currentAttempts = this.state.retryAttempts || 0
    
    if (currentAttempts >= 3) {
      console.warn('Max retry attempts reached')
      return
    }

    this.setState({ 
      hasError: false, 
      error: undefined,
      retryAttempts: currentAttempts + 1 
    })
    
    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  private handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorType = this.getErrorType(this.state.error)
      const retryAttempts = this.state.retryAttempts || 0
      const canRetry = errorType.canRetry && retryAttempts < 3

      return (
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              {errorType.icon}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-gray-900">{errorType.title}</CardTitle>
              {this.props.context && (
                <Badge variant="outline" className="text-xs">
                  {this.props.context}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {errorType.description}
            </p>
            
            {retryAttempts > 0 && (
              <div className="text-xs text-muted-foreground">
                Retry attempts: {retryAttempts}/3
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry}
                  variant="default"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              {(this.props.showRefresh !== false) && (
                <Button 
                  onClick={this.handleRefresh}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Technical Details
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-gray-600">
                    <strong>Error Type:</strong> {errorType.type}
                  </div>
                  <div className="text-xs text-gray-600">
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-800 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <CardTitle className="text-red-900">Something went wrong</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          We encountered an unexpected error. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm font-medium">
              Error details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-red-800 bg-red-50 p-2 rounded">
              {error.stack}
            </pre>
          </details>
        )}
        <Button onClick={resetError} className="w-full">
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Specialized Error Boundaries for specific contexts
 */

// Azure Storage Error Boundary
export function AzureStorageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary 
      context="Azure Storage"
      onRetry={() => {
        // Could add Azure-specific retry logic here
        console.log('Retrying Azure Storage operation...')
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Data Fetching Error Boundary
export function DataFetchErrorBoundary({ children, operation }: { children: ReactNode, operation?: string }) {
  return (
    <ErrorBoundary 
      context={operation ? `Data Fetch: ${operation}` : 'Data Fetch'}
      onRetry={() => {
        console.log(`Retrying data fetch operation: ${operation || 'unknown'}`)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Component Error Boundary
export function ComponentErrorBoundary({ children, componentName }: { children: ReactNode, componentName: string }) {
  return (
    <ErrorBoundary 
      context={`Component: ${componentName}`}
      showRefresh={false} // Component errors usually don't need page refresh
      fallback={
        <Card className="border border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Component Error</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              The {componentName} component failed to render.
            </p>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Inline Error Display Component
export function InlineError({ 
  message, 
  onRetry, 
  canRetry = true,
  size = "sm" 
}: { 
  message: string
  onRetry?: () => void
  canRetry?: boolean
  size?: "sm" | "lg" 
}) {
  return (
    <Card className="border border-red-200 bg-red-50">
      <CardContent className={`p-${size === 'sm' ? '3' : size === 'lg' ? '6' : '4'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className={`h-${size === 'sm' ? '4' : '5'} w-${size === 'sm' ? '4' : '5'} flex-shrink-0`} />
            <span className={`text-${size} font-medium`}>{message}</span>
          </div>
          {canRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="ghost"
              size={size}
              className="text-red-700 hover:text-red-800 hover:bg-red-100"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
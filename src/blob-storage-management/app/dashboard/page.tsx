import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { StorageMetricsCards } from "@/components/storage-metrics-cards"
import { RecentlyViewed } from "@/components/recently-viewed"
import { OtherManagementOptions } from "@/components/other-management-options"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Suspense } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"


// Loading skeleton for the entire dashboard
function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 pt-0">
      <div className="space-y-4">
        <div className="h-4 w-96 bg-gray-300 rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border border-border/50">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-300 rounded animate-pulse" />
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
      </div>
      
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-300 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-6 h-6 bg-gray-300 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-300 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Dashboard page with live Azure Storage metrics
 * 
 * This page demonstrates the RSC architecture with:
 * - Direct Azure SDK calls in Server Components
 * - Proper caching with Next.js built-in caching
 * - Error boundaries for graceful failure handling
 * - Loading states with Suspense
 * - Real-time metrics from Azure Storage
 */
export default function DashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset data-testid="dashboard-container">
        <DashboardHeader title="Storage account metrics" />
        <Suspense fallback={<DashboardSkeleton />}>
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 pt-0">
            <div className="space-y-4" data-testid="metrics-section">
              <div className="text-sm text-muted-foreground">
                Live metrics from your Azure Storage account. Data refreshes automatically 
                and is cached for optimal performance.
              </div>
              <StorageMetricsCards />
            </div>
            <RecentlyViewed />
            <OtherManagementOptions />
          </div>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Enable static generation for this page where possible
export const revalidate = 300; // Revalidate every 5 minutes at the page level

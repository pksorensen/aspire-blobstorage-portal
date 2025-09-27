"use client"

import { Settings, HelpCircle } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { GlobalSearchCompact } from "@/components/global-search"

interface DashboardHeaderProps {
  title: string
  showActions?: boolean
  showSearch?: boolean
  searchQuery?: string
}

export function DashboardHeader({ 
  title, 
  showActions = true, 
  showSearch = true,
  searchQuery 
}: DashboardHeaderProps) {
  const { isMobile } = useSidebar()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" data-testid="sidebar-toggle" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center section with global search */}
      {showSearch && !isMobile && (
        <div className="flex-1 flex justify-center max-w-2xl mx-4">
          <GlobalSearchCompact initialQuery={searchQuery} />
        </div>
      )}

      {showActions && (
        <div className="flex items-center gap-2 px-4">
          {!isMobile && (
            <>
              <Button variant="ghost" size="icon" data-testid="nav-settings">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Help</span>
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  )
}
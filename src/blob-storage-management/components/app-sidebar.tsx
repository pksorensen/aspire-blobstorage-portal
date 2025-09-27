"use client"

import * as React from "react"
import {
  Star,
  Clock,
  FolderOpen,
  FileText,
  Database,
  Grid3X3,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { StorageAccountHeader } from "@/components/storage-account-header"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Azure Storage Explorer navigation data
const data = {
  storageAccount: {
    name: "stmcweuprd",
    type: "Standard_LRS",
  },
  navMain: [
    {
      title: "Favorites",
      url: "/dashboard/favorites",
      icon: Star,
      isActive: false,
    },
    {
      title: "Recently viewed",
      url: "/dashboard/recent",
      icon: Clock,
      isActive: false,
    },
  ],
  storageServices: [
    {
      name: "Blob containers",
      url: "/containers",
      icon: FolderOpen,
    },
    {
      name: "File shares",
      url: "/dashboard/files",
      icon: FileText,
    },
    {
      name: "Queues",
      url: "/dashboard/queues",
      icon: Database,
    },
    {
      name: "Tables",
      url: "/dashboard/tables",
      icon: Grid3X3,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" data-testid="sidebar-navigation" {...props}>
      <SidebarHeader>
        <StorageAccountHeader storageAccount={data.storageAccount} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.storageServices} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

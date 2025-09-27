"use client"

import * as React from "react"
import { Database } from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface StorageAccount {
  name: string
  type: string
}

interface StorageAccountHeaderProps {
  storageAccount: StorageAccount
}

export function StorageAccountHeader({ storageAccount }: StorageAccountHeaderProps) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Database className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {storageAccount.name}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              {storageAccount.type}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
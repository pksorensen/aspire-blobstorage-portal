"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function OtherManagementOptions() {
  return (
    <Card data-testid="quick-actions-section">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Common storage management tasks to get you started quickly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="flex-1 sm:flex-none" data-testid="quick-action-create-container">
            Create Container
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none" data-testid="quick-action-upload-file">
            Upload File
          </Button>
          <Button variant="ghost" className="flex-1 sm:flex-none text-blue-600" data-testid="quick-action-view-containers">
            View Containers
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
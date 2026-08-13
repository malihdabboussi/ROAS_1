'use client'

import { Suspense, type ReactNode } from 'react'
import { QuickMissionsHubHost } from '@/components/global-chat/components/QuickMissionsHubHost'
import { ShellWorkspace } from '@/components/shell/ShellWorkspace'

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        }
      >
        <ShellWorkspace>{children}</ShellWorkspace>
      </Suspense>
      <QuickMissionsHubHost />
    </div>
  )
}

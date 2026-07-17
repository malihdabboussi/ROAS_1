'use client'

import { Suspense, type ReactNode } from 'react'
import { ShellTopBar } from '@/components/shell/ShellTopBar'
import { ShellOpenInProvider } from '@/components/shell/ShellOpenInProvider'

function DashboardFrameInner({
  sidebar,
  children,
}: {
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <ShellOpenInProvider>
      <div className="flex h-dvh flex-col overflow-y-hidden overflow-x-visible bg-[var(--background)]">
        <ShellTopBar />
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {sidebar}
          <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </ShellOpenInProvider>
  )
}

/**
 * Full-width top bar above sidebar + main (T-junction).
 * Sidebar stretches under the top bar — never overlays it.
 */
export function DashboardFrame({
  sidebar,
  children,
}: {
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh flex-col overflow-hidden bg-[var(--background)]">
          <div className="border-border h-[52px] shrink-0 border-b" />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {sidebar}
            <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
          </div>
        </div>
      }
    >
      <DashboardFrameInner sidebar={sidebar}>{children}</DashboardFrameInner>
    </Suspense>
  )
}

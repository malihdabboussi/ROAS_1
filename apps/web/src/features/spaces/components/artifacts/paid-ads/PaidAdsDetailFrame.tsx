'use client'

import type { ReactNode } from 'react'

/** Right-hand paid ads detail surface — matches Channels sidebar card chrome. */
export function PaidAdsDetailFrame({ children }: { children: ReactNode }) {
  return (
    <div className="border-border bg-background rounded-spacing-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border">
      {children}
    </div>
  )
}

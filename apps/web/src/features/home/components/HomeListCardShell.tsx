'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export function HomeListCardShell({
  icon: Icon,
  title,
  titleSuffix,
  headerRight,
  loading,
  emptyMessage,
  hasRows,
  children,
  footer,
}: {
  icon: LucideIcon
  title: string
  titleSuffix?: ReactNode
  headerRight?: ReactNode
  loading: boolean
  emptyMessage: ReactNode
  hasRows: boolean
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="group/home-feed-head section-card card-elevated flex h-[420px] min-w-0 flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
          <span className="body-2 text-foreground font-medium">{title}</span>
          {titleSuffix ? (
            <span className="typo-caption text-muted-foreground shrink-0 tabular-nums">
              {titleSuffix}
            </span>
          ) : null}
        </div>
        {headerRight ? <div className="flex shrink-0 items-center gap-2">{headerRight}</div> : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <VibeyLoadingOrb state="processing" size="sm" />
          </div>
        ) : !hasRows ? (
          <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center px-4 py-10 text-center">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-2 py-1">{children}</div>
            {footer ? (
              <div className="border-border shrink-0 border-t px-3 py-1.5">{footer}</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export function formatHomeShortDate(d: Date, now: Date = new Date()): string {
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

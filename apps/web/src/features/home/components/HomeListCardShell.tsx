'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { useHomeDashboardVisual } from '@/features/home/context/home-dashboard-visual-context'

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
  variant: variantProp,
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
  variant?: 'default' | 'v4'
}) {
  const visualVariant = useHomeDashboardVisual()
  const variant = variantProp ?? visualVariant
  if (variant === 'v4') {
    return (
      <div className="hd4-card-shell">
        <div className="hd4-card-shell-header">
          <Icon className="h-[15px] w-[15px] text-[var(--hd4-text-2)]" aria-hidden />
          <span className="hd4-card-shell-title">{title}</span>
          {titleSuffix ? (
            <span className="text-[11px] tabular-nums text-[var(--hd4-text-3)]">{titleSuffix}</span>
          ) : null}
          <div className="flex-1" />
          {headerRight}
        </div>
        <div className="hd4-card-shell-body">
          {loading ? (
            <div className="flex-1 px-4 py-3">
              <ListSkeleton rows={5} label={`Loading ${title}…`} />
            </div>
          ) : !hasRows ? (
            <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-[13px] text-[var(--hd4-text-3)]">
              {emptyMessage}
            </div>
          ) : (
            <>
              <div className="px-2 py-1">{children}</div>
              {footer ? (
                <div className="border-t border-[var(--hd4-border)] px-3 py-1.5">{footer}</div>
              ) : null}
            </>
          )}
        </div>
      </div>
    )
  }

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
          <div className="flex-1 px-4 py-3">
            <ListSkeleton rows={5} label={`Loading ${title}…`} />
          </div>
        ) : !hasRows ? (
          <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center px-4 py-10 text-center">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-1">{children}</div>
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

'use client'

import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function HomeDashboardV4Shell({
  children,
  chatCollapsed = false,
}: {
  children: ReactNode
  chatCollapsed?: boolean
}) {
  return (
    <div
      className={cn(
        'home-dashboard-v4 relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto',
        chatCollapsed && 'home-dashboard-v4-chat-collapsed',
      )}
    >
      <div className="home-dashboard-v4-hero-glow" aria-hidden />
      <div className="home-dashboard-v4-hero-grid" aria-hidden />
      <div
        className={cn(
          'home-dashboard-v4-column',
          chatCollapsed && 'home-dashboard-v4-column-chat-collapsed',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function HomeDashboardV4Greeting({
  greeting,
  firstName,
}: {
  greeting: string
  firstName: string
}) {
  return (
    <div className="text-center">
      <h1 className="home-dashboard-v4-greeting">
        {greeting}
        {firstName ? `, ${firstName}` : ''}
      </h1>
    </div>
  )
}

/** Tiny control to collapse or expand a home-style hero / composer. */
export function HomeChatHeroToggle({
  collapsed,
  onToggle,
  expandLabel = 'Chat',
  collapseLabel = 'Minimize',
  expandAriaLabel,
  collapseAriaLabel,
}: {
  collapsed: boolean
  onToggle: () => void
  expandLabel?: string
  collapseLabel?: string
  expandAriaLabel?: string
  collapseAriaLabel?: string
}) {
  return (
    <div className={cn('flex justify-center', collapsed ? 'pt-0' : 'pt-1')}>
      <button
        type="button"
        onClick={onToggle}
        className="hd4-chat-hero-toggle"
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? (expandAriaLabel ?? `Expand ${expandLabel.toLowerCase()}`)
            : (collapseAriaLabel ?? `Minimize ${expandLabel.toLowerCase()}`)
        }
      >
        {collapsed ? (
          <>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            <span>{expandLabel}</span>
          </>
        ) : (
          <>
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            <span>{collapseLabel}</span>
          </>
        )}
      </button>
    </div>
  )
}

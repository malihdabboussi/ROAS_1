'use client'

import { Info } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import type { TeamOverviewAgent } from '../../services/team-overview.service'

export function CardShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'surface-card border-subtle rounded-spacing-3 p-spacing-4 flex min-h-0 flex-col border',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  label,
  info,
  trailing,
}: {
  label: string
  info?: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="gap-spacing-2 flex items-center justify-between">
      <span className="gap-spacing-1 flex min-w-0 items-center">
        <span className="body-4 text-muted-foreground truncate font-medium uppercase tracking-wide">
          {label}
        </span>
        {info ? <InfoIcon label={info} /> : null}
      </span>
      {trailing ?? null}
    </div>
  )
}

export function InfoIcon({ label }: { label: string }) {
  return (
    <Tooltip label={label} side="top" wide>
      <span
        className="text-muted-foreground/60 hover:text-foreground inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full transition-colors"
        aria-label="What is this?"
      >
        <Info className="h-3 w-3" />
      </span>
    </Tooltip>
  )
}

export function Legend({ indicatorClass, label }: { indicatorClass: string; label: string }) {
  return (
    <span className="gap-spacing-1 flex items-center">
      <span className={cn('indicator-dot-glass-sm shrink-0', indicatorClass)} />
      <span className="body-4 text-muted-foreground">{label}</span>
    </span>
  )
}

export function AgentAvatar({
  agent,
  size = 'sm',
}: {
  agent: TeamOverviewAgent
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  if (agent.image_url) {
    return (
      <img src={agent.image_url} alt="" className={cn('shrink-0 rounded-full object-cover', dim)} />
    )
  }
  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        dim,
      )}
    >
      {(agent.name?.[0] ?? '?').toUpperCase()}
    </span>
  )
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="body-4 text-muted-foreground/70 px-spacing-2 py-spacing-4 text-center">
      {children}
    </p>
  )
}

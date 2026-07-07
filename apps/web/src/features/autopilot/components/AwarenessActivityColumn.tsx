'use client'

import { Clock } from 'lucide-react'
import { formatRelativeTime } from '@/features/mission-control/components/dialogs/detail-helpers'
import type { AwarenessPoint, MissionAgent } from '@/features/mission-control/types'

interface AwarenessActivityColumnProps {
  points: AwarenessPoint[]
  loading: boolean
  className?: string
  /** Mobile full-bleed stack vs desktop right sidebar (matches ActivityTimeline flex shell) */
  layout?: 'sidebar' | 'full'
  /** Resolve avatar + label per `agent_key` (same as Activity timeline) */
  agents?: MissionAgent[]
}

export function AwarenessActivityColumn({
  points,
  loading,
  className,
  layout = 'sidebar',
  agents = [],
}: AwarenessActivityColumnProps) {
  const sorted = [...points].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const outerClass =
    layout === 'full'
      ? `flex min-h-0 min-w-0 flex-1 flex-col ${className ?? ''}`
      : `pb-spacing-2 hidden min-w-0 flex-[3] shrink-0 lg:flex lg:flex-col ${className ?? ''}`

  return (
    <div className={outerClass}>
      <div className="card-glass lg:rounded-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="px-spacing-6 py-spacing-3 flex-shrink-0">
          <h3 className="body-3 font-semibold text-[var(--color-foreground)]">Awareness</h3>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-spacing-6 py-spacing-3 min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="body-3 text-[var(--color-muted-foreground)]">Loading...</p>
            ) : sorted.length === 0 ? (
              <div className="text-[var(--color-muted-foreground)]/40 flex flex-col items-center py-8">
                <Clock className="h-6 w-6" />
                <p className="body-3 mt-2">No awareness activity yet.</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute bottom-2 left-[5px] top-2 w-px bg-[var(--color-border)]" />

                <div className="space-y-4">
                  {sorted.map((p) => {
                    const agent = agents.find((a) => a.agent_key === p.agent_key)
                    const label = agent?.name ?? p.agent_key
                    return (
                      <div key={p.id} className="pl-spacing-6 relative flex">
                        <div className="indicator-dot-glass-purple absolute left-[5px] top-1.5 z-10 h-[11px] w-[11px] shrink-0 -translate-x-1/2 rounded-full" />

                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="gap-spacing-1 flex shrink-0 items-center">
                              {agent?.image_url ? (
                                <img
                                  src={agent.image_url}
                                  alt={agent.name}
                                  className="h-4 w-4 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[8px] font-bold text-[var(--color-muted-foreground)]">
                                  {label.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="body-3 text-[var(--color-muted-foreground)]">
                                {label}
                              </span>
                            </div>
                            <span className="body-3 text-[var(--color-muted-foreground)]/50 shrink-0">
                              {formatRelativeTime(p.created_at)}
                            </span>
                          </div>
                          <p className="body-3 mt-0.5 whitespace-pre-wrap text-[var(--color-foreground)]">
                            {p.content}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

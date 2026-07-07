'use client'

import { useState } from 'react'
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Eye,
  Inbox,
  Target,
} from 'lucide-react'
import type { KanbanStatus, Mission } from '../../types'
import { MissionCard } from './MissionCard'

const INITIAL_LIMIT = 8

interface MissionKanbanColumnProps {
  title: string
  status: KanbanStatus
  missions: Mission[]
  onMissionClick?: (mission: Mission) => void
}

const columnConfig: Record<KanbanStatus, { Icon: typeof Circle; glassClass: string }> = {
  planning: { Icon: Target, glassClass: 'kanban-column-glass-indigo' },
  todo: { Icon: Circle, glassClass: 'kanban-column-glass-cyan' },
  in_progress: { Icon: Clock, glassClass: 'kanban-column-glass-amber' },
  review: { Icon: Eye, glassClass: 'kanban-column-glass-violet' },
  blocked: { Icon: Ban, glassClass: 'kanban-column-glass-red' },
  done: { Icon: CheckCircle2, glassClass: 'kanban-column-glass-emerald' },
}

export function MissionKanbanColumn({
  title,
  status,
  missions,
  onMissionClick,
}: MissionKanbanColumnProps) {
  const config = columnConfig[status]
  const [expanded, setExpanded] = useState(false)

  const hasMore = missions.length > INITIAL_LIMIT
  const visibleMissions = expanded ? missions : missions.slice(0, INITIAL_LIMIT)
  const hiddenCount = missions.length - INITIAL_LIMIT

  return (
    <div
      className={`kanban-column-glass flex min-w-[240px] flex-1 flex-col md:min-w-0 ${config.glassClass}`}
    >
      <div className="border-[var(--color-border)]/50 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <config.Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <h3 className="body-2 font-semibold text-[var(--color-foreground)]">{title}</h3>
          </div>
          <span className="body-4 rounded-full bg-[var(--color-background)] px-2 py-0.5 text-[var(--color-muted-foreground)]">
            {missions.length}
          </span>
        </div>
      </div>

      <div className="min-h-[200px] flex-1 space-y-3 p-3">
        {visibleMissions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onClick={() => onMissionClick?.(mission)}
          />
        ))}

        {missions.length === 0 && (
          <div className="text-[var(--color-muted-foreground)]/40 flex flex-col items-center justify-center py-12">
            <Inbox className="h-9 w-9" />
            <p className="body-2 mt-2 italic">No missions</p>
          </div>
        )}

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="body-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                {hiddenCount} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

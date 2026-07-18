'use client'

import { ArrowDown, Flame, Minus, Zap } from 'lucide-react'
import type { Mission, MissionPriority } from '../../types'

interface MissionCardProps {
  mission: Mission
  onClick?: () => void
}

const priorityConfig: Record<MissionPriority, { className: string; Icon: typeof Flame }> = {
  urgent: { className: 'text-destructive', Icon: Flame },
  high: { className: 'text-warning', Icon: Zap },
  medium: { className: 'text-warning', Icon: Minus },
  low: { className: 'text-muted-foreground', Icon: ArrowDown },
}

function formatAgent(agent: string | null): string {
  if (!agent) return ''
  return agent.charAt(0).toUpperCase() + agent.slice(1)
}

export function MissionCard({ mission, onClick }: MissionCardProps) {
  const priority = priorityConfig[mission.priority]

  return (
    <button
      type="button"
      onClick={onClick}
      className="kanban-card-glass w-full cursor-pointer p-3 text-left"
    >
      <div className="flex items-start gap-2">
        <h3 className="body-2 text-foreground line-clamp-2 min-w-0 flex-1 font-semibold">
          {mission.title}
        </h3>
        <span title={mission.priority} className="mt-0.5 shrink-0">
          <priority.Icon className={`h-4 w-4 ${priority.className}`} />
        </span>
      </div>

      {mission.status === 'blocked' && mission.progress_notes && (
        <p className="body-4 text-destructive mt-1.5 line-clamp-2">{mission.progress_notes}</p>
      )}

      {mission.status !== 'blocked' && mission.progress_notes && (
        <p className="body-4 text-muted-foreground mt-1.5 line-clamp-2">{mission.progress_notes}</p>
      )}

      <div className="mt-2 flex items-center">
        {(
          mission.subtask_agent_keys ??
          (mission.assigned_agent_key ? [mission.assigned_agent_key] : [])
        ).map((key, i) => (
          <div key={key} className={i > 0 ? '-ml-1' : ''} title={formatAgent(key)}>
            <div className="bg-primary/20 text-primary typo-2xs ring-border flex h-4 w-4 items-center justify-center rounded-full font-bold ring-1">
              {formatAgent(key).charAt(0)}
            </div>
          </div>
        ))}
      </div>
    </button>
  )
}

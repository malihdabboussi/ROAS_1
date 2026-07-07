'use client'

import { ArrowDown, Flame, Minus, Zap } from 'lucide-react'
import type { Mission, MissionPriority } from '../../types'

interface MissionCardProps {
  mission: Mission
  onClick?: () => void
}

const priorityConfig: Record<MissionPriority, { className: string; Icon: typeof Flame }> = {
  urgent: { className: 'text-red-400', Icon: Flame },
  high: { className: 'text-orange-400', Icon: Zap },
  medium: { className: 'text-yellow-400', Icon: Minus },
  low: { className: 'text-[var(--color-muted-foreground)]', Icon: ArrowDown },
}

function formatAgent(agent: string | null): string {
  if (!agent) return ''
  return agent.charAt(0).toUpperCase() + agent.slice(1)
}

export function MissionCard({ mission, onClick }: MissionCardProps) {
  const priority = priorityConfig[mission.priority]

  return (
    <div onClick={onClick} className="kanban-card-glass cursor-pointer p-3">
      <div className="flex items-start gap-2">
        <h3 className="body-2 line-clamp-2 min-w-0 flex-1 font-semibold text-[var(--color-foreground)]">
          {mission.title}
        </h3>
        <span title={mission.priority} className="mt-0.5 shrink-0">
          <priority.Icon className={`h-4 w-4 ${priority.className}`} />
        </span>
      </div>

      {mission.status === 'blocked' && mission.progress_notes && (
        <p className="body-4 mt-1.5 line-clamp-2 text-red-400">{mission.progress_notes}</p>
      )}

      {mission.status !== 'blocked' && mission.progress_notes && (
        <p className="body-4 mt-1.5 line-clamp-2 text-[var(--color-muted-foreground)]">
          {mission.progress_notes}
        </p>
      )}

      <div className="mt-2 flex items-center">
        {(
          mission.subtask_agent_keys ??
          (mission.assigned_agent_key ? [mission.assigned_agent_key] : [])
        ).map((key, i) => (
          <div key={key} className={i > 0 ? '-ml-1' : ''} title={formatAgent(key)}>
            <div className="bg-primary/20 text-primary typo-2xs flex h-4 w-4 items-center justify-center rounded-full font-bold ring-1 ring-[var(--color-card)]">
              {formatAgent(key).charAt(0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

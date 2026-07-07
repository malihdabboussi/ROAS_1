'use client'

import type { KanbanStatus, Mission } from '../../types'
import { MissionKanbanColumn } from './MissionKanbanColumn'

const KANBAN_COLUMNS: { status: KanbanStatus; title: string }[] = [
  { status: 'planning', title: 'Planning' },
  { status: 'todo', title: 'To-Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'review', title: 'Review' },
  { status: 'blocked', title: 'Blocked' },
  { status: 'done', title: 'Done' },
]

const STATUS_TO_COLUMN: Record<string, KanbanStatus> = {
  planning: 'planning',
  pending_approval: 'review',
  awaiting_access_approval: 'blocked',
  todo: 'todo',
  in_progress: 'in_progress',
  review: 'review',
  blocked: 'blocked',
  done: 'done',
}

interface MissionKanbanBoardProps {
  missions: Mission[]
  onMissionClick?: (mission: Mission) => void
}

const PRIORITY_RANK: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 }

export function MissionKanbanBoard({ missions, onMissionClick }: MissionKanbanBoardProps) {
  const missionsByColumn = KANBAN_COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = missions
        .filter((m) => STATUS_TO_COLUMN[m.status] === col.status)
        .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3))
      return acc
    },
    {} as Record<KanbanStatus, Mission[]>,
  )

  return (
    <div className="flex gap-4 overflow-x-auto p-4 md:p-6">
      {KANBAN_COLUMNS.map((col) => (
        <MissionKanbanColumn
          key={col.status}
          title={col.title}
          status={col.status}
          missions={missionsByColumn[col.status] || []}
          onMissionClick={onMissionClick}
        />
      ))}
    </div>
  )
}

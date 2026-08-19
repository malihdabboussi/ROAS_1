'use client'

import { MISSION_CONTROL_MESSAGES } from '../config/messages.config'
import type { Mission, MissionLog, MissionPlan } from '../types'
import { MissionPlanView } from './MissionPlanView'

interface MissionDetailPanelProps {
  mission: Mission | null
  logs: MissionLog[]
  plan: MissionPlan | null
  loading?: boolean
}

const TIMELINE_EVENT_LABELS: Record<string, string> = {
  'awareness.comment': 'Awareness note',
  'awareness.reassigned': 'Awareness reassigned',
  'awareness.subtask_nudged': 'Awareness subtask nudge',
  'awareness.progress_notes': 'Awareness progress notes',
}

const STATUS_STYLE: Record<string, string> = {
  inbox: 'bg-slate-500/15 text-slate-300',
  planning: 'bg-indigo-500/15 text-indigo-300',
  pending_approval: 'bg-orange-500/15 text-orange-300',
  awaiting_access_approval: 'bg-orange-500/15 text-orange-300',
  todo: 'bg-cyan-500/15 text-cyan-300',
  in_progress: 'bg-amber-500/15 text-amber-400',
  review: 'bg-violet-500/15 text-violet-300',
  blocked: 'bg-red-500/15 text-destructive',
  done: 'bg-emerald-500/15 text-emerald-400',
  error: 'bg-red-500/15 text-destructive',
  failed: 'bg-red-700/20 text-destructive',
}

export function MissionDetailPanel({
  mission,
  logs,
  plan,
  loading = false,
}: MissionDetailPanelProps) {
  if (loading) {
    return <div className="body-2 text-muted-foreground">Loading mission detail...</div>
  }

  if (!mission) {
    return (
      <div className="body-2 text-muted-foreground">{MISSION_CONTROL_MESSAGES.DETAIL_EMPTY}</div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="surface-card border-subtle rounded-xl p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="body-2 text-foreground font-medium">{mission.title}</p>
          <span
            className={`typo-caption rounded-full px-2 py-0.5 ${STATUS_STYLE[mission.status] || ''}`}
          >
            {mission.status}
          </span>
        </div>
        <div className="body-4 text-muted-foreground grid grid-cols-1 gap-1 md:grid-cols-2">
          <span>Priority: {mission.priority}</span>
          <span>Retries: {mission.retry_count}</span>
          <span>Assigned: {mission.assigned_agent_key || '—'}</span>
          <span>Current: {mission.current_agent_key || '—'}</span>
        </div>
        {mission.progress_notes && (
          <p className="body-4 text-muted-foreground mt-2 rounded-md bg-[var(--color-secondary)] px-2 py-1">
            {mission.progress_notes}
          </p>
        )}
        {mission.error && (
          <p className="body-4 text-destructive mt-2 rounded-md bg-red-500/10 px-2 py-1">
            {mission.error}
          </p>
        )}
      </div>

      {plan && (
        <div className="surface-card border-subtle rounded-xl p-3">
          <p className="body-2 text-foreground mb-2 font-medium">Plan</p>
          <MissionPlanView content={plan.content} />
        </div>
      )}

      {mission.output && Object.keys(mission.output).length > 0 && (
        <div className="surface-card border-subtle rounded-xl p-3">
          <p className="body-2 text-foreground mb-2 font-medium">Output</p>
          <pre className="body-4 text-muted-foreground max-h-44 overflow-auto whitespace-pre-wrap break-words">
            {JSON.stringify(mission.output, null, 2)}
          </pre>
        </div>
      )}

      <div className="surface-card border-subtle rounded-xl p-3">
        <p className="body-2 text-foreground mb-2 font-medium">Timeline</p>
        <div className="max-h-64 space-y-2 overflow-auto">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md bg-[var(--color-secondary)] px-2 py-1.5">
              <p className="body-4 text-foreground">
                {TIMELINE_EVENT_LABELS[log.event_type] ?? log.event_type}
              </p>
              <p className="body-4 text-muted-foreground">
                {new Date(log.created_at).toLocaleString()} · {log.agent_key || 'system'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

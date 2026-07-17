'use client'

import { cn } from '@/lib/utils/cn'
import { TEAM_OPS_DESK_MESSAGES } from '../config/messages.config'
import type { OpsDeskSummary } from '../lib/ops-desk-summary'
import type { Team2StatusFilter } from './Team2Toolbar'

interface VibeyOpsDeskBriefingProps {
  firstName: string
  summary: OpsDeskSummary
  autopilotEnabled?: boolean
  statusFilters?: Team2StatusFilter[]
  onStatusFilterClick?: (filter: 'working' | 'idle') => void
}

export function VibeyOpsDeskBriefing({
  firstName,
  summary,
  autopilotEnabled = false,
  statusFilters = [],
  onStatusFilterClick,
}: VibeyOpsDeskBriefingProps) {
  const { statusCounts, missionStats, liveFocus, idleAgents } = summary
  const hasLiveWork = liveFocus.length > 0 || missionStats.active > 0 || statusCounts.working > 0
  const workingActive = statusFilters.length === 1 && statusFilters[0] === 'working'
  const idleActive = statusFilters.length === 1 && statusFilters[0] === 'idle'

  return (
    <div className="gap-spacing-3 flex flex-col">
      <div className="gap-spacing-1 flex flex-col">
        <h2 className="title-h6 text-foreground">Hey {firstName}.</h2>
        <p className="body-2 text-muted-foreground">{TEAM_OPS_DESK_MESSAGES.BRIEFING_INTRO}</p>
      </div>

      <div className="gap-spacing-2 flex flex-wrap">
        <button
          type="button"
          aria-pressed={workingActive}
          title={
            workingActive
              ? TEAM_OPS_DESK_MESSAGES.FILTER_CLEAR
              : TEAM_OPS_DESK_MESSAGES.FILTER_WORKING
          }
          onClick={() => onStatusFilterClick?.('working')}
          className={cn(
            'badge-glass badge-glass-orange body-4 transition-opacity',
            onStatusFilterClick && 'cursor-pointer',
            idleActive && 'opacity-50',
          )}
        >
          {statusCounts.working} {TEAM_OPS_DESK_MESSAGES.COUNTS_WORKING}
        </button>
        <button
          type="button"
          aria-pressed={idleActive}
          title={
            idleActive ? TEAM_OPS_DESK_MESSAGES.FILTER_CLEAR : TEAM_OPS_DESK_MESSAGES.FILTER_IDLE
          }
          onClick={() => onStatusFilterClick?.('idle')}
          className={cn(
            'badge-glass badge-glass-blue body-4 transition-opacity',
            onStatusFilterClick && 'cursor-pointer',
            workingActive && 'opacity-50',
          )}
        >
          {statusCounts.idle} {TEAM_OPS_DESK_MESSAGES.COUNTS_IDLE}
        </button>
        {missionStats.blocked > 0 ? (
          <span className="badge-glass badge-glass-red body-4">
            {missionStats.blocked} {TEAM_OPS_DESK_MESSAGES.COUNTS_BLOCKED}
          </span>
        ) : null}
        {autopilotEnabled ? (
          <span className="badge-glass badge-glass-green body-4">Autopilot on</span>
        ) : null}
      </div>

      {hasLiveWork ? (
        <ul className="gap-spacing-1 flex flex-col">
          {liveFocus.slice(0, 5).map((row) => (
            <li key={`${row.agentKey}:${row.missionId ?? row.kind}`} className="body-3 text-foreground">
              <span className="text-muted-foreground">{row.agentName}</span>
              {' → '}
              {row.label}
            </li>
          ))}
          {!workingActive
            ? idleAgents.slice(0, 3).map((row) => (
                <li key={`idle:${row.agentKey}`} className="body-3 text-muted-foreground">
                  {row.agentName} is free
                </li>
              ))
            : null}
        </ul>
      ) : (
        <p className="body-3 text-muted-foreground">
          {autopilotEnabled
            ? TEAM_OPS_DESK_MESSAGES.BRIEFING_EMPTY_AUTOPILOT
            : TEAM_OPS_DESK_MESSAGES.BRIEFING_EMPTY_FLOOR}
        </p>
      )}
    </div>
  )
}

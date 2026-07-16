'use client'

import { TEAM_OPS_DESK_MESSAGES } from '../config/messages.config'
import type { OpsDeskSummary } from '../lib/ops-desk-summary'

interface VibeyOpsDeskBriefingProps {
  firstName: string
  summary: OpsDeskSummary
  autopilotEnabled?: boolean
}

export function VibeyOpsDeskBriefing({
  firstName,
  summary,
  autopilotEnabled = false,
}: VibeyOpsDeskBriefingProps) {
  const { statusCounts, missionStats, liveFocus, idleAgents } = summary
  const hasLiveWork = liveFocus.length > 0 || missionStats.active > 0

  return (
    <div className="gap-spacing-3 flex flex-col">
      <div className="gap-spacing-1 flex flex-col">
        <h2 className="title-h6 text-foreground">Hey {firstName}.</h2>
        <p className="body-2 text-muted-foreground">{TEAM_OPS_DESK_MESSAGES.BRIEFING_INTRO}</p>
      </div>

      <div className="gap-spacing-2 flex flex-wrap">
        <span className="badge-glass badge-glass-orange body-4">
          {statusCounts.working} {TEAM_OPS_DESK_MESSAGES.COUNTS_WORKING}
        </span>
        <span className="badge-glass badge-glass-blue body-4">
          {statusCounts.idle} {TEAM_OPS_DESK_MESSAGES.COUNTS_IDLE}
        </span>
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
            <li key={`${row.agentKey}:${row.missionId ?? row.label}`} className="body-3 text-foreground">
              <span className="text-muted-foreground">{row.agentName}</span>
              {' → '}
              {row.label}
            </li>
          ))}
          {idleAgents.slice(0, 3).map((row) => (
            <li key={`idle:${row.agentKey}`} className="body-3 text-muted-foreground">
              {row.agentName} is free
            </li>
          ))}
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

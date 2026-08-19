'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { AgentTeam, MissionAgentSidebar } from '@/lib/agents'
import { TeamAgentAvatarStack } from './TeamAgentAvatarStack'
import {
  formatTeamAccessCount,
  formatTeamAccessSummary,
  formatTeamUpdatedAt,
  teamPeopleCount,
} from './teams-index.utils'

const LIST_GRID_COLS = 'grid-cols-[1.35fr_0.9fr_0.6fr_0.75fr_0.85fr]'

function formatTeamPeopleSummary(team: AgentTeam): string | null {
  const people = teamPeopleCount(team)
  if (people === 0) return null
  return `${people} ${people === 1 ? 'person' : 'people'}`
}

export function TeamIndexCard({
  team,
  teamAgents,
  embedded,
  onSelectTeam,
}: {
  team: AgentTeam
  teamAgents: MissionAgentSidebar[]
  embedded: boolean
  onSelectTeam?: (teamId: string) => void
}) {
  const palette = getIconColor(team.color)
  const peopleSummary = formatTeamPeopleSummary(team)
  const cardClassName =
    'surface-card border-subtle hover:bg-hover-subtle rounded-spacing-3 gap-spacing-2 p-spacing-4 group flex flex-col border text-left transition-colors'
  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${palette.glassClass}`}
          >
            <LucideIcon name={team.icon || 'users'} className={`h-4 w-4 ${palette.textColor}`} />
          </span>
          <span className="body-2 text-foreground gap-spacing-1 flex min-w-0 items-center font-semibold">
            <span className="truncate" title={team.name}>{team.name}</span>
            {team.is_system ? (
              <ShieldCheck
                className="icon-xs text-muted-foreground shrink-0"
                aria-label="System team"
              />
            ) : null}
          </span>
        </div>
        <span className="body-4 text-muted-foreground shrink-0">{formatTeamUpdatedAt(team)}</span>
      </div>
      <div className="gap-spacing-2 flex flex-wrap items-center">
        <TeamAgentAvatarStack agents={teamAgents} emptyLabel="No agents" />
        {peopleSummary ? (
          <span className="body-4 text-muted-foreground">{peopleSummary}</span>
        ) : null}
      </div>
      <span className="body-4 text-muted-foreground">{formatTeamAccessSummary(team)}</span>
    </>
  )

  if (embedded && onSelectTeam) {
    return (
      <button type="button" onClick={() => onSelectTeam(team.id)} className={cardClassName}>
        {cardBody}
      </button>
    )
  }

  return (
    <Link href={`/team/teams/${team.id}`} className={cardClassName}>
      {cardBody}
    </Link>
  )
}

export function TeamListRow({
  team,
  teamAgents,
  embedded,
  onSelectTeam,
}: {
  team: AgentTeam
  teamAgents: MissionAgentSidebar[]
  embedded: boolean
  onSelectTeam?: (teamId: string) => void
}) {
  const palette = getIconColor(team.color)
  const rowClassName = `gap-spacing-3 border-border body-4 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 grid w-full ${LIST_GRID_COLS} items-center border-b text-left transition-colors last:border-b-0 cursor-pointer`

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${palette.glassClass}`}
        >
          <LucideIcon name={team.icon || 'users'} className={`h-3 w-3 ${palette.textColor}`} />
        </span>
        <span className="body-4 gap-spacing-1 flex min-w-0 items-center font-medium">
          <span className="truncate" title={team.name}>{team.name}</span>
          {team.is_system ? (
            <ShieldCheck
              className="icon-xs text-muted-foreground shrink-0"
              aria-label="System team"
            />
          ) : null}
        </span>
      </div>
      <div className="flex min-w-0 items-center">
        <TeamAgentAvatarStack agents={teamAgents} />
      </div>
      <div className="text-muted-foreground tabular-nums">{teamPeopleCount(team) || '—'}</div>
      <div className="text-muted-foreground tabular-nums">{formatTeamAccessCount(team)}</div>
      <div className="text-muted-foreground">{formatTeamUpdatedAt(team)}</div>
    </>
  )

  if (embedded && onSelectTeam) {
    return (
      <button type="button" onClick={() => onSelectTeam(team.id)} className={rowClassName}>
        {content}
      </button>
    )
  }

  return (
    <Link href={`/team/teams/${team.id}`} className={rowClassName}>
      {content}
    </Link>
  )
}

export function TeamsListHeader() {
  return (
    <div
      className={`gap-spacing-3 border-border body-4 text-muted-foreground px-spacing-3 py-spacing-2 grid shrink-0 ${LIST_GRID_COLS} border-b font-medium uppercase tracking-wide`}
    >
      <div>Name</div>
      <div>Agents</div>
      <div>People</div>
      <div>Access</div>
      <div>Updated</div>
    </div>
  )
}

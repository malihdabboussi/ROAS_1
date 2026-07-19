'use client'

import Link from 'next/link'
import { LayoutGrid, UserRoundSearch, Users } from 'lucide-react'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'
import type { AgentTeam } from '@/lib/agents'
import type { TeamManageSection } from '../../lib/team-manage-nav'
import { TeamBreadcrumbTeamDropdown } from './TeamBreadcrumbTeamDropdown'

const crumbParentClass =
  'text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1 transition-colors'
const crumbCurrentClass = 'text-foreground flex min-w-0 items-center gap-1 font-medium'

export function TeamManageBreadcrumbHeader({
  section,
  onNavigateAgentsRoot,
  onNavigateTeamsRoot,
  onNavigateTeamOverview,
  teams,
  selectedTeamId,
  onSelectTeam,
  agentName,
  moveAgentKey,
  moveAgentTeamId,
  canMoveAgent,
  onMoveAgentToTeam,
  showTeamPicker,
}: {
  section: TeamManageSection
  onNavigateAgentsRoot: () => void
  onNavigateTeamsRoot: () => void
  onNavigateTeamOverview: () => void
  teams: AgentTeam[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string | null) => void
  agentName?: string | null
  moveAgentKey?: string | null
  moveAgentTeamId?: string | null
  canMoveAgent?: boolean
  onMoveAgentToTeam?: (agentKey: string, teamId: string | null) => void | Promise<void>
  showTeamPicker: boolean
}) {
  const trimmedAgentName = agentName?.trim() ?? ''
  const selectedTeam = selectedTeamId ? teams.find((team) => team.id === selectedTeamId) : null

  const trail =
    section === 'people' ? (
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <button type="button" onClick={onNavigateTeamOverview} className={crumbParentClass}>
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-30 truncate">Team</span>
        </button>
        <span className="text-muted-foreground/50 select-none">/</span>
        <div className={crumbCurrentClass}>
          <UserRoundSearch className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-36 truncate">People</span>
        </div>
      </div>
    ) : section === 'teams' ? (
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={onNavigateTeamsRoot}
          className={!selectedTeamId ? crumbCurrentClass : crumbParentClass}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[140px] truncate">Teams</span>
        </button>

        {selectedTeamId ? (
          <>
            <span className="text-muted-foreground/50 select-none">/</span>
            {showTeamPicker ? (
              <TeamBreadcrumbTeamDropdown
                teams={teams}
                selectedTeamId={selectedTeamId}
                onSelectTeam={onSelectTeam}
              />
            ) : (
              <Link href={`/team/teams/${selectedTeamId}`} className={crumbCurrentClass}>
                <span className="max-w-[200px] truncate">{selectedTeam?.name ?? 'Team'}</span>
              </Link>
            )}
          </>
        ) : null}
      </div>
    ) : (
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <button type="button" onClick={onNavigateTeamOverview} className={crumbParentClass}>
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[120px] truncate">Team</span>
        </button>
        <span className="text-muted-foreground/50 select-none">/</span>

        {showTeamPicker ? (
          <>
            <TeamBreadcrumbTeamDropdown
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelectTeam={onSelectTeam}
              moveAgentKey={moveAgentKey}
              moveAgentTeamId={moveAgentTeamId}
              canMoveAgent={canMoveAgent}
              onMoveAgentToTeam={onMoveAgentToTeam}
            />
            <span className="text-muted-foreground/50 select-none">/</span>
          </>
        ) : null}

        <button
          type="button"
          onClick={onNavigateAgentsRoot}
          className={!trimmedAgentName ? crumbCurrentClass : crumbParentClass}
        >
          <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[140px] truncate">Agents</span>
        </button>

        {trimmedAgentName ? (
          <>
            <span className="text-muted-foreground/50 select-none">/</span>
            <div className={crumbCurrentClass}>
              <span className="max-w-[200px] truncate">{trimmedAgentName}</span>
            </div>
          </>
        ) : null}
      </div>
    )

  return <ShellBreadcrumb>{trail}</ShellBreadcrumb>
}

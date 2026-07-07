'use client'

import { LayoutGrid, Users } from 'lucide-react'
import type { AgentTeam } from '@/lib/agents'
import type { TeamManageSection } from '../../lib/team-manage-nav'
import { TeamBreadcrumbTeamDropdown } from './TeamBreadcrumbTeamDropdown'

export function TeamManageBreadcrumbHeader({
  section,
  onNavigateAgentsRoot,
  onNavigateTeamsRoot,
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

  if (section === 'teams') {
    const teamsRootActive = !selectedTeamId

    return (
      <div className="px-4 py-3">
        <div className="pl-spacing-2 flex min-w-0 items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={onNavigateTeamsRoot}
            className={`flex min-w-0 items-center gap-1 transition-colors ${
              teamsRootActive
                ? 'font-medium text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[140px] truncate">Teams</span>
          </button>

          {selectedTeamId ? (
            <>
              <span className="text-[var(--color-muted-foreground)]/50 select-none">/</span>
              {showTeamPicker ? (
                <TeamBreadcrumbTeamDropdown
                  teams={teams}
                  selectedTeamId={selectedTeamId}
                  onSelectTeam={onSelectTeam}
                />
              ) : (
                <div className="flex min-w-0 items-center gap-1 font-medium text-[var(--foreground)]">
                  <span className="max-w-[200px] truncate">{selectedTeam?.name ?? 'Team'}</span>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    )
  }

  const agentsRootActive = !trimmedAgentName

  return (
    <div className="px-4 py-3">
      <div className="pl-spacing-2 flex min-w-0 items-center gap-1.5 text-sm">
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
            <span className="text-[var(--color-muted-foreground)]/50 select-none">/</span>
          </>
        ) : (
          <div className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[120px] truncate">Team</span>
            <span className="text-[var(--color-muted-foreground)]/50 select-none">/</span>
          </div>
        )}

        <button
          type="button"
          onClick={onNavigateAgentsRoot}
          className={`flex min-w-0 items-center gap-1 transition-colors ${
            agentsRootActive
              ? 'font-medium text-[var(--foreground)]'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[140px] truncate">Agents</span>
        </button>

        {trimmedAgentName ? (
          <>
            <span className="text-[var(--color-muted-foreground)]/50 select-none">/</span>
            <div className="flex min-w-0 items-center gap-1 font-medium text-[var(--foreground)]">
              <span className="max-w-[200px] truncate">{trimmedAgentName}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

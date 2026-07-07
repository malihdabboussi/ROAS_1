'use client'

import type { AgentTeam, MissionAgent } from '@/lib/agents'
import type { TeamManageSection } from '../../lib/team-manage-nav'
import { TeamManageBreadcrumbHeader } from './TeamManageBreadcrumbHeader'
import { TeamManageSectionTabs } from './TeamManageSectionTabs'

export function Team2ManageShell({
  section,
  onSectionChange,
  teams,
  selectedTeamId,
  onSelectTeam,
  onNavigateAgentsRoot,
  selectedAgent,
  canMoveAgent,
  onMoveAgentToTeam,
  showOrgTeams,
  children,
}: {
  section: TeamManageSection
  onSectionChange: (section: TeamManageSection) => void
  teams: AgentTeam[]
  selectedTeamId: string | null
  onSelectTeam: (teamId: string | null) => void
  onNavigateAgentsRoot: () => void
  selectedAgent: MissionAgent | null
  canMoveAgent: boolean
  onMoveAgentToTeam: (agentKey: string, teamId: string | null) => void | Promise<void>
  showOrgTeams: boolean
  children: React.ReactNode
}) {
  const moveAgentKey = selectedAgent?.agent_key ?? null
  const moveAgentTeamId = selectedAgent?.team_id ?? null
  const breadcrumbTeamId =
    section === 'agents' && selectedAgent ? (selectedAgent.team_id ?? null) : selectedTeamId

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)]">
      <TeamManageBreadcrumbHeader
        section={section}
        onNavigateAgentsRoot={() => {
          onSectionChange('agents')
          onNavigateAgentsRoot()
        }}
        onNavigateTeamsRoot={() => {
          onSectionChange('teams')
          onSelectTeam(null)
        }}
        teams={teams}
        selectedTeamId={breadcrumbTeamId}
        onSelectTeam={onSelectTeam}
        agentName={selectedAgent?.name ?? null}
        moveAgentKey={moveAgentKey}
        moveAgentTeamId={moveAgentTeamId}
        canMoveAgent={canMoveAgent && Boolean(moveAgentKey)}
        onMoveAgentToTeam={onMoveAgentToTeam}
        showTeamPicker={showOrgTeams}
      />

      {showOrgTeams ? (
        <TeamManageSectionTabs activeSection={section} onSelectSection={onSectionChange} />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { useOrgStore, type OrgRole } from '@/lib/org/org-context-store'
import type { MissionAgent } from './mission-agents-api'
import { isTeam2SystemAgent } from './team-system-agent-keys'
import { useMyTeamMemberships } from './use-agent-teams'

function hasAdminAccess(role: OrgRole | null): boolean {
  return role === 'owner' || role === 'admin'
}

function hasCreatorAccess(role: OrgRole | null): boolean {
  return hasAdminAccess(role) || role === 'creator'
}

export function useTeam2Perms() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const myRole = useOrgStore((s) => s.myRole)
  const isOrgContext = useOrgStore((s) => s.isOrgContext)
  const { teamIds, loading, error, reload } = useMyTeamMemberships()

  return useMemo(() => {
    const personal = !isOrgContext() || !activeOrgId
    const isAdmin = personal || hasAdminAccess(myRole)
    const isCreator = personal || hasCreatorAccess(myRole)
    const teamSet = new Set(teamIds)

    const canEditAgent = (agent: Pick<MissionAgent, 'agent_key' | 'team_id'> | null) => {
      if (!agent) return false
      if (isTeam2SystemAgent(agent.agent_key)) return false
      if (isAdmin) return true
      return isCreator && !!agent.team_id && teamSet.has(agent.team_id)
    }

    const canManageSystemPreferences = (agent: Pick<MissionAgent, 'agent_key'> | null) => {
      if (!agent) return false
      return isTeam2SystemAgent(agent.agent_key) && isAdmin
    }

    return {
      activeOrgId,
      myRole,
      isPersonal: personal,
      isAdmin,
      isCreator,
      teamIds,
      loading,
      error,
      reload,
      canSeeTeam2: true,
      canHire: isCreator,
      canCreateTeam: isAdmin,
      canEditTeam: () => isAdmin,
      canManageTeamMembers: () => isAdmin,
      canDeleteTeam: () => isAdmin,
      canEditAgent,
      canFireAgent: () => isAdmin,
      canMoveAgentBetweenTeams: () => isAdmin,
      canAllowExtra: () => isAdmin,
      canManageSystemPreferences,
    }
  }, [activeOrgId, error, isOrgContext, loading, myRole, reload, teamIds])
}

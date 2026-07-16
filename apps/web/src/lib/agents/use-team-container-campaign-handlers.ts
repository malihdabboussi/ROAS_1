'use client'

import { useCallback } from 'react'
import {
  assignAgentToCampaign,
  fetchAgentCampaignAssignments,
  unassignAgentFromCampaign,
} from '@/lib/campaigns'
import { CAMPAIGN_CORE_AGENT_KEYS } from './agent-team-display'
import type { TeamContainerHandlersData } from './team-container-handlers.types'

export function useTeamContainerCampaignHandlers(data: TeamContainerHandlersData) {
  const refreshAssignedCampaigns = useCallback(
    async (agentKey: string) => {
      const campaignIds = await fetchAgentCampaignAssignments(agentKey)
      const assignedSet = new Set(campaignIds)
      const assigned = data.nonGeneralCampaigns.filter((campaign) => assignedSet.has(campaign.id))
      data.setAssignedCampaigns(assigned)
    },
    [data],
  )

  const handleAssignCampaign = useCallback(
    async (campaignId: string) => {
      if (!data.selectedAgentKey || !campaignId) return
      data.setCampaignActionLoading(true)
      data.setCampaignError(null)
      try {
        await assignAgentToCampaign(campaignId, data.selectedAgentKey)
        await refreshAssignedCampaigns(data.selectedAgentKey)
      } catch (err) {
        data.setCampaignError(err instanceof Error ? err.message : 'Failed to assign campaign')
      } finally {
        data.setCampaignActionLoading(false)
      }
    },
    [data, refreshAssignedCampaigns],
  )

  const handleUnassignCampaign = useCallback(
    async (campaignId: string) => {
      if (!data.selectedAgentKey) return
      if (CAMPAIGN_CORE_AGENT_KEYS.has(data.selectedAgentKey)) {
        data.setCampaignError('ROAS and Atlas are always assigned to every campaign.')
        return
      }
      data.setCampaignActionLoading(true)
      data.setCampaignError(null)
      try {
        await unassignAgentFromCampaign(campaignId, data.selectedAgentKey)
        await refreshAssignedCampaigns(data.selectedAgentKey)
      } catch (err) {
        data.setCampaignError(err instanceof Error ? err.message : 'Failed to unassign campaign')
      } finally {
        data.setCampaignActionLoading(false)
      }
    },
    [data, refreshAssignedCampaigns],
  )

  const refreshAssignmentsForAgent = useCallback(
    async (agentKey: string) => {
      if (data.selectedAgentKey === agentKey) {
        await refreshAssignedCampaigns(agentKey)
      }
    },
    [data.selectedAgentKey, refreshAssignedCampaigns],
  )

  return {
    handleAssignCampaign,
    handleUnassignCampaign,
    refreshAssignmentsForAgent,
  }
}

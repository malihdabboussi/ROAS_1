import { Injectable } from '@nestjs/common'
import { ArtifactLegacyTeamBrainRepository } from '../repositories/artifact-legacy-team-brain.repository'

@Injectable()
export class ArtifactLegacyCampaignTeamService {
  constructor(
    private readonly repository: ArtifactLegacyTeamBrainRepository = new ArtifactLegacyTeamBrainRepository(),
  ) {}

  async listCampaignTeam(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }

    const { data: campaignAgents, error: campaignError } =
      await this.repository.listCampaignAgents(supabase, { userId, campaignId })
    if (campaignError) throw campaignError

    const keys = Array.from(
      new Set((campaignAgents ?? []).map((row) => String(row.agent_key ?? '')).filter(Boolean)),
    )
    let roleMap = new Map<string, { role: string | null; level: string | null }>()
    if (keys.length > 0) {
      const listOrgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
      const { data: agents, error: agentsError } = await this.repository.listAgentRoles(supabase, {
        userId,
        orgId: listOrgId,
        agentKeys: keys,
      })
      if (agentsError) throw agentsError
      roleMap = new Map(
        (agents ?? []).map((row) => [
          String(row.agent_key ?? ''),
          {
            role: (row.role as string | null) ?? null,
            level: (row.level as string | null) ?? null,
          },
        ]),
      )
    }

    return {
      success: true,
      campaign_id: campaignId,
      team: (campaignAgents ?? []).map((row) => ({
        agent_key: row.agent_key,
        name: row.name,
        status: row.status,
        role: roleMap.get(String(row.agent_key ?? ''))?.role ?? null,
        level: roleMap.get(String(row.agent_key ?? ''))?.level ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    }
  }

  async assignAgentToCampaign(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const rawAgentKey = String(input.agent_key ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
    if (!rawAgentKey) return { success: false, error: 'agent_key is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }

    const assignOrgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const { data: agent, error: agentError } =
      await this.repository.findAgentAssignmentCandidate(supabase, {
        userId,
        orgId: assignOrgId,
        agentKey: rawAgentKey,
      })
    if (agentError) throw agentError
    if (!agent?.agent_key) {
      return { success: false, error: `Agent "${rawAgentKey}" not found.` }
    }

    const { data, error } = await this.repository.upsertCampaignAgent(supabase, {
      campaign_id: campaignId,
      user_id: userId,
      org_id: assignOrgId ?? null,
      agent_key: rawAgentKey,
      name: agent.name ?? rawAgentKey,
      status: 'idle',
    })
    if (error) throw error

    return { success: true, assignment: data }
  }

  async unassignAgentFromCampaign(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const rawAgentKey = String(input.agent_key ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
    if (!rawAgentKey) return { success: false, error: 'agent_key is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }

    const unassignOrgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const { error } = await this.repository.deleteCampaignAgent(supabase, {
      userId,
      orgId: unassignOrgId,
      campaignId,
      agentKey: rawAgentKey,
    })
    if (error) throw error

    return { success: true, campaign_id: campaignId, agent_key: rawAgentKey }
  }
}

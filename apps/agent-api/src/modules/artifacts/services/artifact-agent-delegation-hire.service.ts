import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactAgentHireApiClient } from '../integrations/artifact-agent-hire-api.client'
import { ArtifactAgentDelegationRepository } from '../repositories/artifact-agent-delegation.repository'

export class ArtifactAgentDelegationHireService {
  constructor(
    private readonly repository: ArtifactAgentDelegationRepository,
    private readonly hireClient = new ArtifactAgentHireApiClient(),
  ) {}

  async approveAgentHire(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<unknown> {
    const roleKey = String(data.role_key ?? '').trim()
    const campaignId = String(data.campaign_id ?? '').trim()
    const agentName = typeof data.agent_name === 'string' ? data.agent_name.trim() : undefined
    if (!roleKey) return { success: false, error: 'role_key is required' }

    const userId = target.resolveUserId(sessionKey)
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null

    try {
      const mainApiUrl =
        target.config?.get?.('MAIN_API_URL') ?? process.env.MAIN_API_URL ?? 'http://localhost:3001'
      const internalToken =
        target.config?.get?.('INTERNAL_API_TOKEN') ?? process.env.INTERNAL_API_TOKEN ?? ''

      await onProgress?.(`Hiring ${agentName || roleKey}...`)

      const hired = await this.hireClient.hireReady({
        mainApiUrl,
        internalToken,
        userId,
        orgId,
        roleKey,
        name: agentName,
      })
      const hiredAgentKey = hired.agent_key ?? hired.data?.agent_key

      if (campaignId && hiredAgentKey) {
        await onProgress?.(`Assigning ${hired.name || hiredAgentKey} to campaign...`)

        const supabase: SupabaseClient = await target.getUserClient(userId, sessionKey)
        const { data: agent } = await this.repository.findHireAssignmentAgent(
          supabase,
          hiredAgentKey,
        )

        if (agent) {
          await this.repository.upsertCampaignAgent(supabase, {
            campaign_id: campaignId,
            user_id: userId,
            org_id: orgId,
            agent_key: hiredAgentKey,
            name: agent.name ?? hiredAgentKey,
            status: 'idle',
          })
        }
      }

      return {
        success: true,
        hired_agent_key: hiredAgentKey,
        hired_agent_name: hired.name ?? hiredAgentKey,
        campaign_id: campaignId || null,
        assigned_to_campaign: !!campaignId,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to hire agent',
      }
    }
  }
}

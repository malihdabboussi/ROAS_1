import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainHandoffTargetRepository } from '../repositories/brain-handoff-target.repository'
import type { BrainHandoffTarget } from './brain-handoff.service'

export type BrainHandoffTargetResolution =
  | { type: 'brain'; brainId: string; agentId: string | null }
  | { type: 'campaign'; campaignId: string }

@Injectable()
export class BrainHandoffTargetResolverService {
  constructor(private readonly targetRepository: BrainHandoffTargetRepository) {}

  async resolveTarget(
    supabase: SupabaseClient,
    userId: string,
    target: BrainHandoffTarget,
    orgId: string | null,
  ): Promise<BrainHandoffTargetResolution> {
    if (target.type === 'campaign') {
      const campaignId = target.campaignId?.trim()
      if (!campaignId) throw new Error('campaignId is required for campaign target')
      const resolvedCampaignId = await this.targetRepository.resolveCampaignId(supabase, {
        campaignId,
        userId,
        orgId,
      })
      if (!resolvedCampaignId) throw new Error('Target campaign not found')
      return { type: 'campaign', campaignId: resolvedCampaignId }
    }

    if (target.type === 'default') {
      const brainId = await this.resolveOrCreateDefaultBrain(supabase, userId)
      return { type: 'brain', brainId, agentId: null }
    }

    const agentKey = target.agentKey?.trim()
    if (!agentKey) throw new Error('agentKey is required for agent target')
    const brainId = await this.resolveOrCreateAgentBrain(supabase, userId, agentKey, orgId)
    return { type: 'brain', brainId, agentId: agentKey }
  }

  private async resolveOrCreateDefaultBrain(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<string> {
    return (
      (await this.targetRepository.findDefaultBrainId(supabase, userId)) ??
      (await this.targetRepository.createDefaultBrain(supabase, userId))
    )
  }

  private async resolveOrCreateAgentBrain(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId: string | null,
  ): Promise<string> {
    return (
      (await this.targetRepository.findAgentBrainId(supabase, { userId, agentKey, orgId })) ??
      (await this.targetRepository.createAgentBrain(supabase, { userId, agentKey, orgId }))
    )
  }
}

import { Injectable } from '@nestjs/common'
import { temporalInsertFields } from '@vibey/api-shared'

@Injectable()
export class ArtifactCampaignBrainContextService {
  async save(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    campaignId: string,
    content: string,
    title: string,
  ) {
    const userId = String(target.resolveUserId(sessionKey) ?? '').trim()
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    if (!userId) return { success: false, error: 'Could not resolve user' }

    let campaignQuery = target.serviceClient
      .from('campaigns')
      .select('id, name, config')
      .eq('id', campaignId)
    campaignQuery = orgId
      ? campaignQuery.eq('org_id', orgId)
      : campaignQuery.eq('user_id', userId)
    const { data: campaign, error: campaignError } = await campaignQuery.maybeSingle()
    if (campaignError) {
      return { success: false, error: `Failed to verify campaign access: ${campaignError.message}` }
    }
    if (!campaign) {
      return { success: false, error: `Campaign not found or not accessible: ${campaignId}` }
    }
    if (this.isGeneralCampaign(campaign)) {
      return {
        success: false,
        error: 'Campaign Brain context cannot be saved to the General campaign.',
      }
    }

    const { data: brain, error: brainError } = await target.serviceClient
      .from('ns_brains')
      .select('id')
      .eq('campaign_id', campaignId)
      .maybeSingle()
    if (brainError) {
      return { success: false, error: `Failed to resolve campaign brain: ${brainError.message}` }
    }
    if (!brain?.id) {
      return { success: false, error: `No Campaign Brain found for campaign_id ${campaignId}` }
    }

    const contentHash = target.embeddingService.computeContentHash(content)
    const duplicate = await target.memoriesRepo.checkDuplicate(
      target.serviceClient,
      contentHash,
      undefined,
      brain.id,
    )
    if (duplicate) {
      return {
        success: true,
        duplicate: true,
        target_action: 'save_campaign_brain_context',
        brain_id: brain.id,
      }
    }

    const embedding = await target.embeddingService.getEmbedding(content, {
      taskType: 'RETRIEVAL_DOCUMENT',
      billing: { userId, orgId },
    })
    if (!embedding?.length) {
      return { success: false, error: 'Failed to create Campaign Brain retrieval embedding' }
    }

    const temporal = temporalInsertFields(input)
    const sourceType = String(input.source_type ?? input.sourceType ?? 'mcp').trim()
    const sourceId = String(input.source_id ?? input.sourceId ?? '').trim()
    const sourceTitle = String(input.source_title ?? input.sourceTitle ?? title).trim()
    const memory = await target.memoriesRepo.create(target.serviceClient, {
      brain_id: brain.id,
      content,
      content_hash: contentHash,
      memory_type: this.memoryTypeForIntent(input.intent),
      source_type: sourceType || 'mcp',
      source_id: sourceId || null,
      source_title: sourceTitle || title,
      ...temporal,
      agent_id: target.parseAgentIdFromSessionKey?.(sessionKey ?? '') ?? 'atlas',
      speaker: userId,
      confidence: 0.8,
      significance: 0.7,
      tags: ['campaign_brain'],
      metadata: {
        user_id: userId,
        campaign_id: campaignId,
        import_source: sourceType || 'mcp',
        temporal,
      },
      embedding: JSON.stringify(embedding),
    })

    return {
      success: true,
      target_action: 'save_campaign_brain_context',
      brain_id: brain.id,
      memory_id: memory.id,
    }
  }

  private isGeneralCampaign(campaign: Record<string, unknown>): boolean {
    const config =
      campaign.config && typeof campaign.config === 'object' && !Array.isArray(campaign.config)
        ? (campaign.config as Record<string, unknown>)
        : {}
    return (
      String(campaign.name ?? '').trim().toLowerCase() === 'general' ||
      config.system_kind === 'general' ||
      config.is_general === true ||
      config.isSystemGeneral === true
    )
  }

  private memoryTypeForIntent(intent: unknown): string {
    const normalized = String(intent ?? '').trim().toLowerCase()
    if (['decision', 'preference', 'fact', 'story', 'framework', 'event'].includes(normalized)) {
      return normalized
    }
    return 'insight'
  }
}

import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'

export class ArtifactMissionsMediaCatalogService {
  constructor(private readonly mediaAssetsRepository: ArtifactMediaAssetsRepository) {}

  async getMediaGenerationStatus(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return {
        success: false,
        enabled: false,
        error: 'campaign_id required. Select a campaign first.',
      }
    }

    const enabled = await this.isMediaGenerationEnabled(target, campaignId)
    return { success: true, campaign_id: campaignId, enabled }
  }

  async listCampaignMedia(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)

    const requestedLimit = Number(input.limit ?? 30)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 30
    const assetType = typeof input.asset_type === 'string' ? input.asset_type.trim() : null

    const { data, error } = await this.mediaAssetsRepository.listCampaignMediaAssets(
      target.serviceClient,
      {
        userId,
        campaignId: campaignId ?? null,
        assetType,
        limit,
      },
    )

    if (error) {
      return { success: false, error: error.message }
    }

    const assets = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      filename: row.original_filename,
      url: row.public_url,
      mime_type: row.mime_type,
      asset_type: row.asset_type,
      category: row.category,
      tags: row.tags,
      created_at: row.created_at,
    }))

    return {
      success: true,
      campaign_id: campaignId ?? null,
      count: assets.length,
      assets,
    }
  }

  private async isMediaGenerationEnabled(
    target: Record<string, any>,
    campaignId: string,
  ): Promise<boolean> {
    const { data, error } = await this.mediaAssetsRepository.findCampaignMediaGenerationConfig(
      target.serviceClient,
      campaignId,
    )

    if (error) throw error
    if (!data) return true

    const config = (data.config ?? {}) as Record<string, unknown>
    const agentSettings = (config.agent_settings ?? {}) as Record<string, unknown>
    return agentSettings.media_generation_enabled !== false
  }
}

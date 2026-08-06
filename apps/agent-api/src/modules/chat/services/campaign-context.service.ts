import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatContextRepository } from '../repositories/chat-context.repository'

interface CampaignTextCacheEntry {
  resolvedAt: number
  text: string
}

const CAMPAIGN_CONTEXT_CACHE_TTL_MS = 5 * 60_000

/**
 * CampaignContextService
 *
 * Builds a compact text summary of a campaign's assets for injection
 * into the agent's system message. This gives the agent instant awareness
 * of what exists in the campaign without needing tool calls.
 */
@Injectable()
export class CampaignContextService {
  private readonly logger = new Logger(CampaignContextService.name)
  private readonly supabase: SupabaseClient
  private themeTableNamePromise: Promise<'branding_themes' | 'themes'> | null = null
  private readonly textCache = new Map<string, CampaignTextCacheEntry>()

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: ChatContextRepository = new ChatContextRepository(),
  ) {
    this.supabase = svc.client
  }

  async buildCampaignSummary(
    userId: string,
    campaignId: string,
    orgId?: string | null,
  ): Promise<string> {
    const cacheKey = this.campaignContextCacheKey('summary', userId, campaignId, orgId)
    const cached = this.textCache.get(cacheKey)
    if (cached && Date.now() - cached.resolvedAt < CAMPAIGN_CONTEXT_CACHE_TTL_MS) {
      return cached.text
    }

    try {
      const [campaign, offers, funnels, leadMagnets, sequences, adCampaigns, avatars] =
        await Promise.all([
          this.getCampaign(campaignId, userId, orgId),
          this.getOffersSummary(campaignId, userId, orgId),
          this.getFunnelsSummary(campaignId, userId, orgId),
          this.getLeadMagnetsSummary(campaignId, userId, orgId),
          this.getSequencesSummary(campaignId, userId, orgId),
          this.getAdCampaignsSummary(campaignId, userId, orgId),
          this.getAvatarsSummary(campaignId, userId, orgId),
        ])

      const lines: string[] = []

      if (campaign) {
        lines.push(`CAMPAIGN_NAME=${campaign.name}`)
      }

      lines.push('')
      lines.push('CAMPAIGN ASSETS:')
      lines.push(`- Offers: ${offers.length === 0 ? '0' : offers.join('; ')}`)
      lines.push(`- Funnels: ${funnels.length === 0 ? '0' : funnels.join('; ')}`)
      lines.push(`- Lead Magnets: ${leadMagnets.length === 0 ? '0' : leadMagnets.join('; ')}`)
      lines.push(`- Email Sequences: ${sequences.length === 0 ? '0' : sequences.join('; ')}`)
      lines.push(`- Ad Campaigns: ${adCampaigns.length === 0 ? '0' : adCampaigns.join('; ')}`)
      lines.push(`- Avatars: ${avatars.length === 0 ? '0' : avatars.join('; ')}`)

      const summary = lines.join('\n')
      this.textCache.set(cacheKey, { resolvedAt: Date.now(), text: summary })
      return summary
    } catch (err) {
      this.logger.warn(
        `Failed to build campaign summary: ${err instanceof Error ? err.message : err}`,
      )
      return 'Campaign context unavailable.'
    }
  }

  async buildThemeSummary(
    userId: string,
    campaignId: string,
    orgId?: string | null,
  ): Promise<string> {
    const cacheKey = this.campaignContextCacheKey('theme', userId, campaignId, orgId)
    const cached = this.textCache.get(cacheKey)
    if (cached && Date.now() - cached.resolvedAt < CAMPAIGN_CONTEXT_CACHE_TTL_MS) {
      return cached.text
    }

    try {
      const { data: campaign, error: campaignError } = await this.repository.findCampaignConfig(
        this.supabase,
        { userId, campaignId, orgId },
      )
      if (campaignError) throw campaignError

      const config = (campaign?.config ?? {}) as Record<string, unknown>
      const agentSettings = (config.agent_settings ?? {}) as Record<string, unknown>
      const themeId = typeof agentSettings.theme_id === 'string' ? agentSettings.theme_id : ''
      if (!themeId) {
        const noneSummary = [
          'ACTIVE_THEME: none',
          'BRANDING_GATE: No campaign Theme/branding is linked.',
          'Before generate_image, create_ad, process_media creatives, or any branded visual: ask the user whether branding exists for this company/campaign (or offer to pull branding from a website / create a Theme).',
          'Do not invent brand colors, logos, headshots, or image style. Only proceed after the user confirms branding or explicitly asks to continue without it.',
        ].join('\n')
        this.textCache.set(cacheKey, { resolvedAt: Date.now(), text: noneSummary })
        return noneSummary
      }

      const themeTable = await this.getThemeTableName()
      const { data: theme, error: themeError } = await this.repository.findTheme(
        this.supabase,
        themeTable,
        themeId,
      )
      if (themeError) throw themeError
      if (!theme) {
        const unresolved = [
          `ACTIVE_THEME: unresolved (${themeId})`,
          'BRANDING_GATE: Theme id is set but could not be loaded. Ask the user whether branding exists for this campaign before generating branded images or creatives.',
        ].join('\n')
        this.textCache.set(cacheKey, { resolvedAt: Date.now(), text: unresolved })
        return unresolved
      }

      const row = theme as Record<string, unknown>
      const isSystem = row.is_system === true
      const ownerId = typeof row.user_id === 'string' ? row.user_id : null
      if (!isSystem && ownerId && ownerId !== userId) {
        const unresolved = [
          `ACTIVE_THEME: unresolved (${themeId})`,
          'BRANDING_GATE: Theme id is set but could not be loaded. Ask the user whether branding exists for this campaign before generating branded images or creatives.',
        ].join('\n')
        this.textCache.set(cacheKey, { resolvedAt: Date.now(), text: unresolved })
        return unresolved
      }

      let colors: Record<string, unknown> = {}
      let headingFont: string | null = null
      let bodyFont: string | null = null
      let voice: Record<string, unknown> = {}
      let imageStylePrompt: string | null = null

      type ImageEntry = { asset_id: string; name: string; description: string }
      let logoUrl: string | null = null
      let headshotImages: (ImageEntry & { url: string })[] = []
      let productImages: (ImageEntry & { url: string })[] = []

      if (themeTable === 'branding_themes') {
        colors = (row.colors ?? {}) as Record<string, unknown>
        headingFont = typeof row.font_heading === 'string' ? row.font_heading : null
        bodyFont = typeof row.font_body === 'string' ? row.font_body : null
        voice = (row.brand_voice ?? {}) as Record<string, unknown>
        imageStylePrompt =
          typeof row.image_style_prompt === 'string' ? row.image_style_prompt : null

        const logoAssetId = typeof row.logo_asset_id === 'string' ? row.logo_asset_id : null
        const rawHeadshots = Array.isArray(row.headshot_images)
          ? (row.headshot_images as ImageEntry[])
          : []
        const rawProducts = Array.isArray(row.product_images)
          ? (row.product_images as ImageEntry[])
          : []

        const allAssetIds = [
          logoAssetId,
          ...rawHeadshots.map((h) => h.asset_id),
          ...rawProducts.map((p) => p.asset_id),
        ].filter(Boolean) as string[]

        if (allAssetIds.length > 0) {
          const assets = await this.repository.listMediaAssetUrls(this.supabase, allAssetIds)
          if (assets) {
            const urlMap: Record<string, string> = {}
            for (const a of assets) {
              if (a.public_url) urlMap[a.id] = a.public_url
            }
            logoUrl = logoAssetId ? (urlMap[logoAssetId] ?? null) : null
            headshotImages = rawHeadshots
              .filter((h) => urlMap[h.asset_id])
              .map((h) => ({ ...h, url: urlMap[h.asset_id] }))
            productImages = rawProducts
              .filter((p) => urlMap[p.asset_id])
              .map((p) => ({ ...p, url: urlMap[p.asset_id] }))
          }
        }
      } else {
        const themeConfig = (row.config ?? {}) as Record<string, unknown>
        colors = (themeConfig.colors ?? {}) as Record<string, unknown>
        const fonts = (themeConfig.fonts ?? {}) as Record<string, unknown>
        headingFont = typeof fonts.heading === 'string' ? fonts.heading : null
        bodyFont = typeof fonts.body === 'string' ? fonts.body : null
        voice = (themeConfig.voice ?? {}) as Record<string, unknown>
        imageStylePrompt =
          typeof themeConfig.image_style_prompt === 'string' ? themeConfig.image_style_prompt : null
      }

      const colorLine = [
        typeof colors.primary === 'string' ? `primary=${colors.primary}` : null,
        typeof colors.secondary === 'string'
          ? `secondary=${colors.secondary}`
          : typeof colors.secondaryAccent1 === 'string'
            ? `secondary=${colors.secondaryAccent1}`
            : null,
        typeof colors.background === 'string'
          ? `background=${colors.background}`
          : typeof colors.pageBackground === 'string'
            ? `background=${colors.pageBackground}`
            : null,
        typeof colors.foreground === 'string'
          ? `foreground=${colors.foreground}`
          : typeof colors.heading === 'string'
            ? `foreground=${colors.heading}`
            : null,
        typeof colors.accent === 'string'
          ? `accent=${colors.accent}`
          : typeof colors.secondaryAccent2 === 'string'
            ? `accent=${colors.secondaryAccent2}`
            : null,
      ]
        .filter(Boolean)
        .join(', ')

      const fontLine = [
        headingFont ? `heading=${headingFont}` : null,
        bodyFont ? `body=${bodyFont}` : null,
      ]
        .filter(Boolean)
        .join(', ')

      const voiceLine = [
        typeof voice.tone === 'string' ? `tone=${voice.tone}` : null,
        typeof voice.style === 'string' ? `style=${voice.style}` : null,
        typeof voice.personality === 'string' ? `personality=${voice.personality}` : null,
      ]
        .filter(Boolean)
        .join(', ')

      const lines = [
        'ACTIVE_THEME:',
        `- id: ${String(row.id ?? '')}`,
        `- name: ${String(row.name ?? '')}`,
        `- is_system: ${isSystem ? 'yes' : 'no'}`,
        colorLine ? `- colors: ${colorLine}` : null,
        fontLine ? `- fonts: ${fontLine}` : null,
        voiceLine ? `- voice: ${voiceLine}` : null,
        imageStylePrompt ? `- image_style_prompt: ${imageStylePrompt}` : null,
        logoUrl ? `- logo_url: ${logoUrl}` : null,
        'BRANDING_GATE: Before the first branded image/ad/creative in this conversation, briefly confirm with the user that this Theme is the branding to use. Then apply its colors, fonts, logo, headshots, product images, and image_style_prompt on every generate_image / create_ad / branded visual.',
      ].filter(Boolean)

      if (headshotImages.length > 0) {
        lines.push('- headshots:')
        for (const h of headshotImages) {
          lines.push(`    - "${h.name}" — ${h.description} (url: ${h.url})`)
        }
      }
      if (productImages.length > 0) {
        lines.push('- product_images:')
        for (const p of productImages) {
          lines.push(`    - "${p.name}" — ${p.description} (url: ${p.url})`)
        }
      }

      if (themeTable === 'branding_themes') {
        const socialRaw = row.social_links
        if (socialRaw && typeof socialRaw === 'object' && !Array.isArray(socialRaw)) {
          const social = socialRaw as Record<string, unknown>
          const socialParts = Object.entries(social)
            .filter(([, v]) => typeof v === 'string' && v.trim())
            .map(([k, v]) => `${k}=${String(v).trim()}`)
          if (socialParts.length > 0) {
            lines.push(`- social: ${socialParts.join(', ')}`)
          }
        }
      }

      const summary = lines.join('\n')
      this.textCache.set(cacheKey, { resolvedAt: Date.now(), text: summary })
      return summary
    } catch (err) {
      this.logger.warn(`Failed to build theme summary: ${err instanceof Error ? err.message : err}`)
      return 'ACTIVE_THEME: unavailable'
    }
  }

  bustCampaignContextCache(input?: {
    userId?: string
    orgId?: string | null
    campaignId?: string
  }): void {
    if (!input) {
      this.textCache.clear()
      return
    }
    for (const key of this.textCache.keys()) {
      if (input.userId && !key.includes(`user:${input.userId}`)) continue
      if (input.orgId !== undefined && !key.includes(`org:${input.orgId ?? ''}`)) continue
      if (input.campaignId && !key.includes(`campaign:${input.campaignId}`)) continue
      this.textCache.delete(key)
    }
  }

  private campaignContextCacheKey(
    kind: 'summary' | 'theme',
    userId: string,
    campaignId: string,
    orgId?: string | null,
  ): string {
    return [`kind:${kind}`, `user:${userId}`, `org:${orgId ?? ''}`, `campaign:${campaignId}`].join(
      '|',
    )
  }

  private async getThemeTableName(): Promise<'branding_themes' | 'themes'> {
    if (this.themeTableNamePromise) return this.themeTableNamePromise
    this.themeTableNamePromise = (async () => {
      const brandingError = await this.repository.probeThemeTable(this.supabase, 'branding_themes')
      if (!brandingError) return 'branding_themes'

      const themesError = await this.repository.probeThemeTable(this.supabase, 'themes')
      if (!themesError) return 'themes'

      throw new Error('No themes table found (checked branding_themes, themes)')
    })()
    return this.themeTableNamePromise
  }

  private async getCampaign(campaignId: string, userId: string, orgId?: string | null) {
    return this.repository.findCampaignName(this.supabase, { userId, campaignId, orgId })
  }

  private async getOffersSummary(
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string[]> {
    const data = await this.repository.listOffers(this.supabase, { userId, campaignId, orgId })
    if (!data || data.length === 0) return []
    return data.map((o) => `${o.name} (id: ${o.id}, status: ${o.processing_status ?? 'draft'})`)
  }

  private async getFunnelsSummary(
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string[]> {
    const data = await this.repository.listFunnels(this.supabase, { userId, campaignId, orgId })
    if (!data || data.length === 0) return []
    return data.map(
      (f) =>
        `${f.name} (id: ${f.id}, type: ${f.funnel_type ?? 'unknown'}, status: ${f.status ?? 'draft'})`,
    )
  }

  private async getLeadMagnetsSummary(
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string[]> {
    const data = await this.repository.listLeadMagnets(this.supabase, {
      userId,
      campaignId,
      orgId,
    })
    if (!data || data.length === 0) return []
    return data.map((lm) => `${lm.name} (id: ${lm.id}, status: ${lm.status ?? 'draft'})`)
  }

  private async getSequencesSummary(
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string[]> {
    const data = await this.repository.listSequences(this.supabase, { userId, campaignId, orgId })
    if (!data || data.length === 0) return []
    return data.map((s) => `${s.name} (id: ${s.id}, status: ${s.status ?? 'draft'})`)
  }

  private async getAdCampaignsSummary(
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string[]> {
    const data = await this.repository.listAdCampaigns(this.supabase, {
      userId,
      campaignId,
      orgId,
    })
    if (!data || data.length === 0) return []
    return data.map((adCampaign) => {
      const metadata = (adCampaign.metadata as Record<string, unknown> | null) ?? {}
      const adAccountId =
        (adCampaign.meta_ad_account_id as string | null | undefined) ??
        (metadata.meta_ad_account_id as string | undefined) ??
        'unset'
      const pageId =
        (adCampaign.meta_page_id as string | null | undefined) ??
        (metadata.meta_page_id as string | undefined) ??
        'unset'
      const instagramUserId = (metadata.meta_instagram_user_id as string | undefined) ?? 'unset'
      const publishedMetaCampaignId =
        (adCampaign.meta_campaign_id as string | null | undefined) ??
        (metadata.meta_campaign_id as string | undefined) ??
        'none'
      return `${adCampaign.name} (id: ${adCampaign.id}, meta_defaults: account=${adAccountId}, page=${pageId}, instagram=${instagramUserId}, published_campaign=${publishedMetaCampaignId})`
    })
  }

  private async getAvatarsSummary(
    campaignId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string[]> {
    const data = await this.repository.listAvatars(this.supabase, { userId, campaignId, orgId })
    if (!data || data.length === 0) return []
    return data.map((a) => `${a.name} (id: ${a.id}, type: ${a.avatar_type ?? 'unknown'})`)
  }
}

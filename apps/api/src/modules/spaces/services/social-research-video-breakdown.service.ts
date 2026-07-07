import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { OpenRouterBillingClientService } from '../../provider-billing/services/openrouter-billing-client.service'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import {
  buildVideoBreakdownUserText,
  VIDEO_BREAKDOWN_SYSTEM_PROMPT,
} from '../prompts/video-breakdown.template'
import { SpacesRepository } from '../repositories/spaces.repository'
import type { SocialResearchPlatform, VideoBreakdown } from '../types/social-research.types'
import { SocialResearchOrchestrationService } from './social-research-orchestration.service'
import { socialPostUrlForContent } from './social-research-utils'

const BREAKDOWN_MODEL = 'anthropic/claude-sonnet-4.6'

type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

@Injectable()
export class SocialResearchVideoBreakdownService {
  private readonly logger = new Logger(SocialResearchVideoBreakdownService.name)

  constructor(
    private readonly openRouterBilling: OpenRouterBillingClientService,
    private readonly repo: SpacesRepository,
    private readonly orchestration: SocialResearchOrchestrationService,
    private readonly spaceRetrievalIndex?: SpaceRetrievalIndexService,
  ) {}

  async breakdownItem(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    platform: SocialResearchPlatform
    itemId: string
    force?: boolean
  }): Promise<VideoBreakdown> {
    const row = await this.repo.findItemById(opts.supabase, opts.spaceId, opts.itemId)
    if (!row) throw new BadRequestException('Item not found')
    const cd = ((row as { custom_data?: Record<string, unknown> | null }).custom_data ??
      {}) as Record<string, unknown>

    const existing = cd.video_breakdown as VideoBreakdown | undefined
    if (existing && !opts.force) return existing

    const handle = String(cd._handle ?? cd.owner_username ?? '')
    const mediaType = String(cd.media_type ?? 'reel')
    const shortcode = String(cd.shortcode ?? cd.media_id ?? '')
    const postUrl =
      typeof cd.post_url === 'string' && cd.post_url.trim()
        ? cd.post_url.trim()
        : socialPostUrlForContent(opts.platform, handle, shortcode, mediaType)

    let transcript =
      typeof cd.transcript === 'string' && cd.transcript.trim() ? cd.transcript : null
    if (!transcript) {
      try {
        transcript = await this.orchestration.fetchTranscriptWithFallback(
          opts.platform,
          postUrl,
          opts.userId,
          opts.orgId,
        )
      } catch {
        transcript = null
      }
    }

    const title = typeof cd.caption === 'string' && cd.caption.trim() ? cd.caption : null
    const description =
      typeof cd.post_description === 'string' && cd.post_description.trim()
        ? cd.post_description
        : null
    if (!title && !description && !transcript) {
      throw new BadRequestException(
        'Not enough content to break down — run Analyze first to fetch the transcript.',
      )
    }

    const userText = buildVideoBreakdownUserText({
      platform: opts.platform,
      mediaType,
      title,
      description,
      creatorName:
        (typeof cd.owner_full_name === 'string' && cd.owner_full_name) ||
        (typeof cd.owner_username === 'string' && cd.owner_username) ||
        handle ||
        null,
      creatorFollowers: cd.owner_follower_count != null ? Number(cd.owner_follower_count) : null,
      playCount: Number(cd.play_count ?? 0),
      outlierScore: cd.outlier_score != null ? Number(cd.outlier_score) : null,
      durationSeconds: cd.video_duration != null ? Number(cd.video_duration) : null,
      transcript,
    })

    // The Supabase-cached thumbnail is publicly fetchable by the model; raw
    // platform CDN URLs often block server-side fetches or expire, so only a
    // cached copy is attached.
    const thumbnailUrl =
      typeof cd.thumbnail_url === 'string' && cd.thumbnail_asset_id ? cd.thumbnail_url : null
    const content: UserContentPart[] = [{ type: 'text', text: userText }]
    if (thumbnailUrl) {
      content.push({ type: 'image_url', image_url: { url: thumbnailUrl } })
    }

    const parsed = await this.generateBreakdown(content, opts.userId, opts.orgId)
    const breakdown: VideoBreakdown = {
      ...parsed,
      packaging: thumbnailUrl
        ? parsed.packaging
        : {
            ...parsed.packaging,
            thumbnail_description: parsed.packaging?.thumbnail_description ?? null,
            thumbnail_text: parsed.packaging?.thumbnail_text ?? null,
            title_thumbnail_synergy: parsed.packaging?.title_thumbnail_synergy ?? null,
          },
      model: BREAKDOWN_MODEL,
      generated_at: new Date().toISOString(),
    }

    const patch: Record<string, unknown> = { video_breakdown: breakdown }
    if (transcript && !cd.transcript) patch.transcript = transcript
    await this.repo.updateItem(
      opts.supabase,
      opts.userId,
      opts.spaceId,
      opts.itemId,
      { custom_data: patch },
      opts.orgId,
    )
    if (this.spaceRetrievalIndex) {
      await this.spaceRetrievalIndex
        .indexSource(opts.supabase, {
          sourceType: this.researchSourceType(opts.platform),
          sourceId: opts.itemId,
          userId: opts.userId,
          orgId: opts.orgId,
          spaceId: opts.spaceId,
        })
        .catch(() => undefined)
    }
    return breakdown
  }

  private async generateBreakdown(
    content: UserContentPart[],
    userId: string,
    orgId: string | null,
  ): Promise<Omit<VideoBreakdown, 'model' | 'generated_at'>> {
    const completion = await this.openRouterBilling.createChatCompletion({
      owner: { userId, orgId },
      feature: 'social_research',
      action: 'video_breakdown',
      sourcePath: 'spaces/social-research-video-breakdown',
      model: BREAKDOWN_MODEL,
      body: {
        max_tokens: 4096,
        messages: [
          { role: 'system', content: VIDEO_BREAKDOWN_SYSTEM_PROMPT },
          { role: 'user', content },
        ],
      },
    })
    const text = completion.data.choices?.[0]?.message?.content?.toString().trim()
    if (!text) throw new BadRequestException('No breakdown in model response')

    const jsonText = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
    try {
      return JSON.parse(jsonText) as Omit<VideoBreakdown, 'model' | 'generated_at'>
    } catch {
      this.logger.error(`Video breakdown JSON parse failed: ${jsonText.slice(0, 300)}`)
      throw new BadRequestException('The breakdown response was malformed — try again')
    }
  }

  private researchSourceType(
    platform: SocialResearchPlatform,
  ):
    | 'instagram_research_item'
    | 'tiktok_research_item'
    | 'youtube_research_item'
    | 'twitter_research_item' {
    if (platform === 'tiktok') return 'tiktok_research_item'
    if (platform === 'youtube') return 'youtube_research_item'
    if (platform === 'twitter') return 'twitter_research_item'
    return 'instagram_research_item'
  }
}

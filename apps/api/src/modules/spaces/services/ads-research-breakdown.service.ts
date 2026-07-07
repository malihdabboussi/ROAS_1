import { randomUUID } from 'node:crypto'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { OpenRouterBillingClientService } from '../../provider-billing/services/openrouter-billing-client.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import {
  AD_BREAKDOWN_SYSTEM_PROMPT,
  buildAdBreakdownUserText,
} from '../prompts/ad-breakdown.template'
import type { AdBreakdown, AdSearchResultItem } from '../types/ads-research.types'
import { AdsResearchSearchService } from './ads-research-search.service'

const BREAKDOWN_MODEL = 'anthropic/claude-sonnet-4.6'

type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

/**
 * Marketer-facing ad analysis: transcribes the ad video (yt-dlp + AI
 * transcription via the agent's extract_url_transcript action — works on the
 * raw CDN video URLs the ad libraries return) and runs the ad-formula
 * deconstruction. Ads analog of SocialResearchVideoBreakdownService.
 */
@Injectable()
export class AdsResearchBreakdownService {
  private readonly logger = new Logger(AdsResearchBreakdownService.name)

  constructor(
    private readonly openRouterBilling: OpenRouterBillingClientService,
    private readonly userAgentApi: UserAgentApiService,
    private readonly searchService: AdsResearchSearchService,
  ) {}

  async breakdownAd(opts: {
    userId: string
    orgId: string | null
    ad: AdSearchResultItem
  }): Promise<{ patch: Partial<AdSearchResultItem> }> {
    let ad = opts.ad
    const enriched: Partial<AdSearchResultItem> = {}

    // Google's search response carries no media or text for video/text
    // creatives — pull the details engine (one billed call) and lift the
    // creative content from the variations before analyzing.
    if (ad.platform === 'google' && !ad.video_url && !ad.creative_text && ad.advertiser_id) {
      try {
        const details = await this.searchService.getAdDetails({
          platform: 'google',
          adId: ad.ad_id,
          advertiserId: ad.advertiser_id,
        })
        enriched.details = details
        // Variations are heterogeneous (some image-only, some text-only,
        // some hidden) — take the best of each across all of them.
        const videoVar = details.variations.find((v) => v.video_url)
        const imageVar = details.variations.find((v) => v.image_url)
        const textVar = details.variations.find((v) => v.title || v.text)
        if (!ad.video_url && videoVar?.video_url) enriched.video_url = videoVar.video_url
        if (!ad.image_url && (videoVar?.image_url || imageVar?.image_url)) {
          enriched.image_url = videoVar?.image_url ?? imageVar!.image_url
        }
        const text = textVar ? [textVar.title, textVar.text].filter(Boolean).join(' — ') : ''
        if (!ad.creative_text && text) enriched.creative_text = text
        ad = { ...ad, ...enriched }
      } catch (err) {
        this.logger.warn(
          `Google ad enrichment failed ad=${ad.ad_id} err=${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    let transcript =
      typeof ad.transcript === 'string' && ad.transcript.trim() ? ad.transcript : null
    if (!transcript && ad.video_url) {
      transcript = await this.transcribeAdVideo({
        userId: opts.userId,
        orgId: opts.orgId,
        videoUrl: ad.video_url,
      })
    }

    if (!transcript && !ad.creative_text) {
      throw new BadRequestException(
        ad.platform === 'google'
          ? "Google hides this creative's content — open it on Google Ads Transparency to view it."
          : 'Not enough content to break down — this ad has no script or copy to analyze.',
      )
    }

    const userText = buildAdBreakdownUserText({
      platform: ad.platform,
      format: ad.format,
      advertiserName: ad.advertiser_name,
      creativeText: ad.creative_text,
      landingUrl: ad.landing_url,
      daysRunning: ad.days_running,
      variantCount: ad.variant_count ?? null,
      reachEstimate: ad.reach_estimate,
      isActive: ad.is_active,
      transcript,
    })

    const content: UserContentPart[] = [{ type: 'text', text: userText }]
    // Ad CDN images often allow server-side fetches; when they don't, the
    // model simply analyzes without the visual.
    if (ad.image_url) {
      content.push({ type: 'image_url', image_url: { url: ad.image_url } })
    }

    const parsed = await this.generateBreakdown(content, opts.userId, opts.orgId)
    const breakdown: AdBreakdown = {
      ...parsed,
      model: BREAKDOWN_MODEL,
      generated_at: new Date().toISOString(),
    }
    return {
      patch: {
        ...enriched,
        breakdown,
        ...(transcript ? { transcript } : {}),
      },
    }
  }

  /** yt-dlp downloads raw CDN video URLs fine; the IG-only gate on the social fallback doesn't apply here. */
  private async transcribeAdVideo(opts: {
    userId: string
    orgId: string | null
    videoUrl: string
  }): Promise<string | null> {
    const conversationId = randomUUID()
    const orgSuffix = opts.orgId ? `::org:${opts.orgId}` : ''
    const sessionKey = `agent:gateway:mission:atlas:${opts.userId}:${conversationId}${orgSuffix}`

    try {
      const response = await this.userAgentApi.invoke(
        opts.userId,
        '/api/artifacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openclaw-internal': 'true',
            'x-session-key': sessionKey,
          },
          body: JSON.stringify({
            action: 'extract_url_transcript',
            data: { url: opts.videoUrl, include_metadata: false },
          }),
        },
        {
          timeoutMs: 180_000,
          logTag: `ads_research_transcript user=${opts.userId}`,
        },
      )

      if (!response.ok) {
        this.logger.warn(`Ad transcript returned ${response.status} url=${opts.videoUrl}`)
        return null
      }

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (body?.success !== true) return null

      const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : ''
      return transcript || null
    } catch (err) {
      this.logger.warn(
        `Ad transcript failed url=${opts.videoUrl} err=${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }

  private async generateBreakdown(
    content: UserContentPart[],
    userId: string,
    orgId: string | null,
  ): Promise<Omit<AdBreakdown, 'model' | 'generated_at'>> {
    const completion = await this.openRouterBilling.createChatCompletion({
      owner: { userId, orgId },
      feature: 'ads_research',
      action: 'ad_breakdown',
      sourcePath: 'spaces/ads-research-breakdown',
      model: BREAKDOWN_MODEL,
      body: {
        max_tokens: 4096,
        messages: [
          { role: 'system', content: AD_BREAKDOWN_SYSTEM_PROMPT },
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
      return JSON.parse(jsonText) as Omit<AdBreakdown, 'model' | 'generated_at'>
    } catch {
      this.logger.error(`Ad breakdown JSON parse failed: ${jsonText.slice(0, 300)}`)
      throw new BadRequestException('The breakdown response was malformed — try again')
    }
  }
}

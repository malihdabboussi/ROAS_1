import { Injectable, Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { BrainCrossPollinatorRepository } from '../repositories/brain-cross-pollinator.repository'

type BrainImportJobRecord = {
  id: string
  user_id: string
  job_type: string
  title: string
  payload: Record<string, unknown>
}

type CampaignBrainRow = {
  id: string
  campaign_id: string
  name: string
  campaign_title: string
}

type NarrativePageRow = {
  brain_id: string
  slug: string
  title: string
  page_type: string
  summary: string | null
  content_md: string
}

type CrossPollMatch = {
  campaign_id: string
  campaign_name: string
  reason: string
}

@Injectable()
export class BrainCrossPollinatorService {
  private readonly logger = new Logger(BrainCrossPollinatorService.name)

  private static readonly MAX_CAMPAIGN_BRAINS = 10

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly crossPollinatorRepository: BrainCrossPollinatorRepository,
  ) {}

  async analyzeCrossPollination(job: BrainImportJobRecord, orgId?: string | null): Promise<void> {
    let campaignBrains: Array<Record<string, unknown>>
    try {
      campaignBrains = await this.crossPollinatorRepository.listCampaignBrainCandidates(
        job.user_id,
        BrainCrossPollinatorService.MAX_CAMPAIGN_BRAINS,
      )
    } catch (error) {
      this.logger.warn(`Failed to fetch campaign context candidates: ${(error as Error).message}`)
      return
    }
    if (!campaignBrains?.length) return

    const campaignIds = campaignBrains.map((b) => b.campaign_id as string)
    const campaigns = await this.crossPollinatorRepository.listCampaignTitles(campaignIds)

    const campaignTitleMap = new Map<string, string>()
    for (const c of campaigns ?? []) {
      campaignTitleMap.set(c.id as string, c.title as string)
    }

    const brainRows: CampaignBrainRow[] = campaignBrains
      .filter((b) => campaignTitleMap.has(b.campaign_id as string))
      .map((b) => ({
        id: b.id as string,
        campaign_id: b.campaign_id as string,
        name: b.name as string,
        campaign_title: campaignTitleMap.get(b.campaign_id as string) ?? (b.name as string),
      }))

    if (brainRows.length === 0) return

    const brainIds = brainRows.map((b) => b.id)
    const pages = await this.crossPollinatorRepository.listNarrativePages(brainIds)

    const brainContext = this.buildBrainContextBlock(brainRows, pages ?? [])
    const meetingSummary = this.extractMeetingSummary(job)

    if (!meetingSummary) {
      this.logger.warn(`No meeting summary available for job ${job.id}, skipping cross-pollination`)
      return
    }

    const matches = await this.callAtlasForMatching(
      job.user_id,
      meetingSummary,
      brainContext,
      orgId ?? null,
    )

    const validCampaignIds = new Set(brainRows.map((b) => b.campaign_id))
    const validMatches = matches.filter((m) => validCampaignIds.has(m.campaign_id))

    if (validMatches.length === 0) return

    for (const match of validMatches) {
      await this.createSuggestion(job, match, orgId)
    }

    this.logger.log(
      `Cross-pollination: ${validMatches.length} suggestion(s) created for job ${job.id}`,
    )
  }

  private buildBrainContextBlock(brains: CampaignBrainRow[], pages: NarrativePageRow[]): string {
    const pagesByBrain = new Map<string, NarrativePageRow[]>()
    for (const p of pages) {
      const list = pagesByBrain.get(p.brain_id) ?? []
      list.push(p)
      pagesByBrain.set(p.brain_id, list)
    }

    const blocks: string[] = []
    for (const brain of brains) {
      const brainPages = pagesByBrain.get(brain.id) ?? []
      const capsule = brainPages.find((p) => p.page_type === 'capsule')
      const indexPages = brainPages.filter((p) => p.page_type !== 'capsule')

      const parts: string[] = [`## Campaign: "${brain.campaign_title}" (id: ${brain.campaign_id})`]

      if (capsule?.content_md) {
        parts.push(`CAPSULE: ${capsule.content_md.slice(0, 500)}`)
      } else if (capsule?.summary) {
        parts.push(`CAPSULE: ${capsule.summary}`)
      }

      if (indexPages.length > 0) {
        parts.push('INDEX:')
        for (const page of indexPages) {
          const line = page.summary
            ? `- [${page.page_type}] ${page.title}: ${page.summary}`
            : `- [${page.page_type}] ${page.title}`
          parts.push(line)
        }
      }

      blocks.push(parts.join('\n'))
    }

    return blocks.join('\n\n')
  }

  private extractMeetingSummary(job: BrainImportJobRecord): string | null {
    const payload = job.payload
    // Provider-agnostic meeting jobs carry the normalized source; legacy Fathom
    // jobs carry the raw meeting. Read both through the Fathom-shaped fields.
    const source = payload.source as
      | {
          title?: string
          providerSummary?: string | null
          actions?: Array<{ sourceText?: string }>
        }
      | undefined
    const meeting = (
      source
        ? {
            title: source.title,
            default_summary: source.providerSummary
              ? { markdown_formatted: source.providerSummary }
              : undefined,
            action_items: (source.actions ?? []).map((action) => ({
              description: action.sourceText,
            })),
          }
        : (payload.meeting ?? payload)
    ) as Record<string, unknown>

    const title = String(meeting.title || meeting.meeting_title || job.title || '')
    const summary =
      typeof (meeting.default_summary as Record<string, unknown>)?.markdown_formatted === 'string'
        ? ((meeting.default_summary as Record<string, unknown>).markdown_formatted as string)
        : null

    const actionItems = Array.isArray(meeting.action_items)
      ? (meeting.action_items as Array<{ description?: string }>)
          .map((a) => a.description)
          .filter(Boolean)
          .join('; ')
      : null

    const parts = [`Title: ${title}`]
    if (summary) parts.push(`Summary: ${summary.slice(0, 2000)}`)
    if (actionItems) parts.push(`Action items: ${actionItems.slice(0, 500)}`)

    if (!title && !summary) return null
    return parts.join('\n')
  }

  private async callAtlasForMatching(
    userId: string,
    meetingSummary: string,
    brainContext: string,
    orgId: string | null,
  ): Promise<CrossPollMatch[]> {
    const gateway = this.getGateway()

    const systemPrompt = [
      "You are Atlas. A conversation was just integrated into the user's personal brain.",
      'Below are the capsules and full page indexes of all their campaign contexts.',
      'The CAPSULE tells you what the brain is about overall.',
      'The INDEX lists every page (topics, entities, documents) in that brain — use it to spot specific matches the capsule might not reveal.',
      "Determine which campaigns (if any) would benefit from this conversation's knowledge.",
      'Return ONLY a JSON array: [{"campaign_id":"...","campaign_name":"...","reason":"..."}]',
      'Return [] if no campaigns match.',
      "Be selective — only suggest when there's clear topical relevance.",
      'Your response must be ONLY the JSON array, nothing else.',
    ].join('\n')

    const userPrompt = [
      '## Conversation just processed:',
      meetingSummary,
      '',
      '## Available campaign contexts:',
      brainContext,
    ].join('\n')

    try {
      const result = await gateway.callOpenClawForBrainJob(
        userId,
        'atlas',
        systemPrompt,
        userPrompt,
        undefined,
        undefined,
        undefined,
        orgId,
      )

      return this.parseAtlasMatchResponse(result)
    } catch (err) {
      this.logger.warn(`Atlas cross-pollination call failed: ${(err as Error).message}`)
      return []
    }
  }

  private parseAtlasMatchResponse(result: Record<string, unknown>): CrossPollMatch[] {
    const text =
      typeof result.content === 'string'
        ? result.content
        : typeof result.text === 'string'
          ? result.text
          : typeof result.message === 'string'
            ? result.message
            : JSON.stringify(result)

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    try {
      const parsed = JSON.parse(jsonMatch[0])
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (item: unknown): item is CrossPollMatch =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).campaign_id === 'string' &&
          typeof (item as Record<string, unknown>).campaign_name === 'string' &&
          typeof (item as Record<string, unknown>).reason === 'string',
      )
    } catch {
      this.logger.warn('Failed to parse Atlas cross-pollination response as JSON')
      return []
    }
  }

  private async createSuggestion(
    job: BrainImportJobRecord,
    match: CrossPollMatch,
    orgId?: string | null,
  ): Promise<void> {
    const { data: suggestion, error: insertError } =
      await this.crossPollinatorRepository.insertSuggestion({
        user_id: job.user_id,
        org_id: orgId ?? null,
        source_job_id: job.id,
        source_job_type: job.job_type,
        source_title: job.title,
        target_campaign_id: match.campaign_id,
        target_campaign_name: match.campaign_name,
        reason: match.reason,
        status: 'pending',
      })

    if (insertError) {
      if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
        this.logger.log(`Duplicate suggestion skipped: job=${job.id} campaign=${match.campaign_id}`)
        return
      }
      this.logger.warn(`Failed to insert suggestion: ${insertError.message}`)
      return
    }

    if (!suggestion?.id) return

    const { error: notificationError } = await this.crossPollinatorRepository.insertNotification({
      user_id: job.user_id,
      org_id: orgId ?? null,
      type: 'brain_cross_suggestion',
      title: `Atlas suggests: "${job.title}" → ${match.campaign_name}`,
      body: match.reason,
      metadata: { suggestion_id: suggestion.id, campaign_id: match.campaign_id },
      action_url: `/home`,
    })
    if (notificationError) {
      this.logger.warn(
        `Failed to insert cross-pollination notification: ${notificationError.message}`,
      )
    }
  }

  private getGateway() {
    const {
      MissionAgentGatewayService,
    } = require('../../missions/services/gateways/mission-agent-gateway.service')
    return this.moduleRef.get(MissionAgentGatewayService, { strict: false })
  }
}

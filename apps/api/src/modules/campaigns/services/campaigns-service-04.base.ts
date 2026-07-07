import { CampaignsServiceBase03 } from './campaigns-service-03.base'
import { createHash, randomUUID } from 'node:crypto'
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainOpsHookService } from '../../brain/services/brain-ops-hook.service'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { LinkExtractionService } from '../../brain/services/link-extraction.service'
import type { MeetingTranscriptEntry } from '../../brain/types/brain.types'
import { FirefliesApiService } from '../../integrations/fireflies/services/fireflies-api.service'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import { CampaignsRepository } from '../repositories/campaigns.repository'

export abstract class CampaignsServiceBase04 extends CampaignsServiceBase03 {

  protected extractTitleFromHtml(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return match ? this.decodeHtmlEntities(match[1].trim()) : null
  }

  protected extractTextFromHtml(html: string): string {
    return this.decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
  }

  protected normalizeKnowledgeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim()
  }

  protected hashKnowledgeText(value: string): string {
    return createHash('sha256').update(this.normalizeKnowledgeText(value)).digest('hex')
  }

  protected splitIntoChunks(value: string): string[] {
    const text = this.normalizeKnowledgeText(value)
    if (!text) return []
    const chunks: string[] = []
    let start = 0
    while (start < text.length) {
      const end = Math.min(start + CampaignsServiceBase04.CHUNK_SIZE_CHARS, text.length)
      chunks.push(text.slice(start, end).trim())
      if (end >= text.length) break
      start = Math.max(
        start + CampaignsServiceBase04.CHUNK_SIZE_CHARS - CampaignsServiceBase04.CHUNK_OVERLAP_CHARS,
        start + 1,
      )
    }
    return chunks.filter(Boolean)
  }

  protected isLikelyNoiseChunk(value: string): boolean {
    const lower = value.toLowerCase()
    const boilerplatePatterns = [
      /cookie policy/,
      /privacy policy/,
      /terms of service/,
      /all rights reserved/,
      /\blog in\b/,
      /\bsign up\b/,
      /\bsubscribe\b/,
      /\bmenu\b/,
    ]
    return boilerplatePatterns.some((pattern) => pattern.test(lower))
  }

  protected isGeneralCampaign(campaign: Record<string, unknown>) {
    const config = (campaign.config ?? {}) as Record<string, unknown>
    return config.system_kind === CampaignsServiceBase04.GENERAL_SYSTEM_KIND
  }

  /** Mirrors Team sidebar `nonGeneralCampaigns` exclusion (apps/web useTeamContainerData). */
  protected isExcludedFromTeamCampaignAssignments(campaign: Record<string, unknown>) {
    const config = (campaign.config ?? {}) as Record<string, unknown>
    const systemKind =
      typeof config.system_kind === 'string' ? config.system_kind.toLowerCase() : ''
    const isSystem = config.isSystem === true
    const name = typeof campaign.name === 'string' ? campaign.name.trim().toLowerCase() : ''
    return name === 'general' || systemKind === 'general' || isSystem
  }

  protected async resolveDomain(
    explicit: string | undefined,
    content: string,
    billing?: { userId: string; orgId?: string | null },
  ): Promise<'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'> {
    type Domain = 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
    if (
      explicit &&
      explicit !== 'auto' &&
      (CampaignsServiceBase04.VALID_DOMAINS as readonly string[]).includes(explicit)
    ) {
      return explicit as Domain
    }
    return this.classifyDomain(content, billing)
  }

  protected async classifyDomain(
    content: string,
    billing?: { userId: string; orgId?: string | null },
  ): Promise<'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'> {
    try {
      const snippet = content.slice(0, 2000)
      const prompt = `Classify the primary business domain of this content. Return ONLY a JSON object: { "domain": "..." }

Allowed values:
- "strategy" — business strategy, vision, planning, positioning, competitive analysis
- "marketing" — marketing, branding, ads, social media, content, SEO, campaigns
- "finance" — financials, budgets, pricing, revenue, costs, invoicing
- "operations" — processes, workflows, logistics, HR, project management, tooling
- "creative" — design, copywriting, video, media production, UX, creative direction
- "general" — does not clearly fit one domain, or spans multiple equally

Content:
${snippet}`
      const raw = await this.embeddingService.callGemini(prompt, undefined, billing)
      const parsed = JSON.parse(raw)
      const d = parsed?.domain?.toLowerCase?.()
      if (
        d &&
        CampaignsServiceBase04.VALID_DOMAINS.includes(
          d as (typeof CampaignsServiceBase04.VALID_DOMAINS)[number],
        )
      ) {
        return d
      }
    } catch {
      // fall through
    }
    return 'general'
  }

  protected buildMeetingKnowledgeContent(
    title: string,
    entries: MeetingTranscriptEntry[],
    summary?: string,
    actionItems?: string[],
  ): string {
    const transcriptText = entries.map((entry) => `[${entry.speaker}]: ${entry.text}`).join('\n')
    const summaryBlock = summary?.trim() ? `SUMMARY:\n${summary.trim()}\n\n` : ''
    const actionsBlock =
      actionItems?.length && actionItems.some((item) => item?.trim())
        ? `ACTION ITEMS:\n${actionItems
            .filter((item) => item?.trim())
            .map((item) => `- ${item.trim()}`)
            .join('\n')}\n\n`
        : ''
    return `${summaryBlock}${actionsBlock}MEETING: ${title}\n\n${transcriptText}`.trim()
  }
}

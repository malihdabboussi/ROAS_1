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
import { CampaignsServiceBase01 } from './campaigns-service-01.base'

export abstract class CampaignsServiceBase02 extends CampaignsServiceBase01 {
  async updateCampaignContext(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    body: {
      result?: string; purpose?: string; strategy?: string; off_limits?: string[]
      selected_offer_ids?: string[]; selected_avatar_ids?: string[]
    },
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')

    const existing = (campaign.context as Record<string, unknown>) ?? {}
    const northStarFields = ['result', 'purpose', 'strategy', 'off_limits']
    const wasUndefined = northStarFields.every((f) => !existing[f])
    const anyProvided = northStarFields.some((f) => body[f as keyof typeof body] !== undefined)
    const merged: Record<string, unknown> = { ...existing }
    if (body.result !== undefined) merged.result = body.result
    if (body.purpose !== undefined) merged.purpose = body.purpose
    if (body.strategy !== undefined) merged.strategy = body.strategy
    if (body.off_limits !== undefined) merged.off_limits = body.off_limits
    if (body.selected_offer_ids !== undefined) merged.selected_offer_ids = body.selected_offer_ids
    if (body.selected_avatar_ids !== undefined)
      merged.selected_avatar_ids = body.selected_avatar_ids
    if (wasUndefined && anyProvided) merged.north_star_defined_at = new Date().toISOString()
    return this.campaignsRepo.update(supabase, campaignId, { context: merged })
  }
  async generateCampaignStrategyContext(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    orgId?: string | null,
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId, { orgId })
    if (!campaign) throw new NotFoundException('Campaign not found')

    const nodes = await this.campaignsRepo.listKnowledgeNodes(supabase, campaignId, {
      limit: 40,
    })
    const brandSnippets = (nodes as Array<{ title?: string | null; content?: string | null }>)
      .map((n) => {
        const title = (n.title ?? '').trim()
        const content = typeof n.content === 'string' ? n.content.trim().slice(0, 1200) : ''
        if (!title && !content) return ''
        return title ? `${title}\n${content}` : content
      })
      .filter(Boolean)
      .slice(0, 28)
      .join('\n---\n')

    const systemPrompt = `You are Vibey's campaign strategy planner. Respond with ONLY valid JSON (no markdown) with exactly these keys:
- result: string — what success looks like for this campaign
- purpose: string — why this campaign exists
- strategy: string — how managers and agents should execute
- off_limits: string[] — constraints that must not be violated without explicit human approval

Be specific and concise. If brand context is sparse, infer reasonable defaults aligned with the campaign name.`

    const userPrompt = `Campaign name: ${String(campaign.name ?? '')}

Brand / knowledge excerpts (may be empty):
${brandSnippets || '(none)'}`

    const raw = await this.embeddingService.callGemini(userPrompt, systemPrompt, {
      userId,
      orgId,
    })
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      throw new Error('Failed to parse strategy JSON from model')
    }

    const result = typeof parsed.result === 'string' ? parsed.result : ''
    const purpose = typeof parsed.purpose === 'string' ? parsed.purpose : ''
    const strategy = typeof parsed.strategy === 'string' ? parsed.strategy : ''
    const offLimitsRaw = parsed.off_limits
    const off_limits = Array.isArray(offLimitsRaw)
      ? offLimitsRaw.filter((x): x is string => typeof x === 'string')
      : []

    const updated = await this.updateCampaignContext(supabase, userId, campaignId, {
      result,
      purpose,
      strategy,
      off_limits,
    })

    return { context: (updated as { context?: Record<string, unknown> }).context ?? {} }
  }

  async deleteCampaign(supabase: SupabaseClient, id: string, orgId?: string | null) {
    let campaign = await this.campaignsRepo.findById(supabase, id, { orgId })
    if (!campaign && orgId) {
      campaign = await this.campaignsRepo.findById(supabase, id, { orgId: null })
    }
    if (!campaign) throw new NotFoundException('Campaign not found')
    if (this.isProtectedSystemCampaign(campaign)) {
      throw new ForbiddenException(
        this.isPersonalCampaign(campaign)
          ? 'Personal campaign cannot be deleted'
          : 'General campaign cannot be deleted',
      )
    }
    await this.campaignsRepo.delete(supabase, id)
  }

  async restoreCampaign(supabase: SupabaseClient, id: string) {
    const campaign = await this.campaignsRepo.findById(supabase, id, { includeDeleted: true })
    if (!campaign) throw new Error('Campaign not found')
    if (this.isProtectedSystemCampaign(campaign)) {
      throw new ForbiddenException(
        this.isPersonalCampaign(campaign)
          ? 'Personal campaign cannot be restored'
          : 'General campaign cannot be restored',
      )
    }
    if (!campaign.deleted_at) {
      return campaign
    }
    const restored = await this.campaignsRepo.restore(supabase, id)
    await this.ensureCoreCampaignAgents(
      supabase,
      String(campaign.user_id),
      String(restored.id),
      campaign.org_id as string | null,
    )
    return restored
  }

  async ensureGeneralCampaign(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    const existing = await this.campaignsRepo.findGeneralByUserId(supabase, userId, orgId)
    if (existing) {
      const config = (existing.config ?? {}) as Record<string, unknown>
      const needsRepair =
        config.system_kind !== CampaignsServiceBase02.GENERAL_SYSTEM_KIND ||
        config.isPinned !== true
      let result = existing
      if (needsRepair) {
        const repairedConfig = {
          ...config,
          system_kind: CampaignsServiceBase02.GENERAL_SYSTEM_KIND,
          isPinned: true,
        }
        result = await this.campaignsRepo.update(supabase, String(existing.id), {
          config: repairedConfig,
        })
      }
      await this.ensureCoreCampaignAgents(
        supabase,
        String(result.user_id),
        String(result.id),
        orgId,
      )
      await this.ensureCampaignBrain(
        supabase,
        String(result.user_id),
        String(result.id),
        String(result.name ?? 'General'),
        orgId,
      )
      return result
    }

    try {
      const created = await this.campaignsRepo.create(supabase, {
        user_id: userId,
        name: 'General',
        campaign_type: 'get-more-leads',
        config: {
          system_kind: CampaignsServiceBase02.GENERAL_SYSTEM_KIND,
          isPinned: true,
          isSystem: true,
          icon: 'folder-kanban',
        },
        org_id: orgId ?? null,
      })
      await this.ensureCoreCampaignAgents(supabase, userId, String(created.id), orgId)
      await this.ensureCampaignBrain(supabase, userId, String(created.id), 'General', orgId)
      return created
    } catch (err) {
      if (err instanceof Error && err.message.includes('idx_campaigns_single_general_per_user')) {
        const fallback = await this.campaignsRepo.findGeneralByUserId(supabase, userId, orgId)
        if (fallback) {
          await this.ensureCoreCampaignAgents(supabase, userId, String(fallback.id), orgId)
          await this.ensureCampaignBrain(supabase, userId, String(fallback.id), 'General', orgId)
          return fallback
        }
      }
      throw err
    }
  }

  /**
   * Ensures the personal-account Personal campaign (org_id IS NULL).
   * Home always reads this campaign, including while the user is in an org.
   */
  async ensurePersonalCampaign(supabase: SupabaseClient, userId: string) {
    const existing = await this.campaignsRepo.findPersonalByUserId(supabase, userId)
    if (existing) {
      const config = (existing.config ?? {}) as Record<string, unknown>
      const needsRepair =
        config.system_kind !== CampaignsServiceBase02.PERSONAL_SYSTEM_KIND ||
        config.isPinned !== true
      let result = existing
      if (needsRepair) {
        result = await this.campaignsRepo.update(supabase, String(existing.id), {
          config: {
            ...config,
            system_kind: CampaignsServiceBase02.PERSONAL_SYSTEM_KIND,
            isPinned: true,
            isSystem: true,
            icon: typeof config.icon === 'string' ? config.icon : 'house',
          },
        })
      }
      await this.ensureCoreCampaignAgents(supabase, String(result.user_id), String(result.id), null)
      await this.ensureCampaignBrain(
        supabase,
        String(result.user_id),
        String(result.id),
        String(result.name ?? 'Personal'),
        null,
      )
      return result
    }

    try {
      const created = await this.campaignsRepo.create(supabase, {
        user_id: userId,
        name: 'Personal',
        campaign_type: 'get-more-leads',
        config: {
          system_kind: CampaignsServiceBase02.PERSONAL_SYSTEM_KIND,
          isPinned: true,
          isSystem: true,
          icon: 'house',
        },
        org_id: null,
      })
      await this.ensureCoreCampaignAgents(supabase, userId, String(created.id), null)
      await this.ensureCampaignBrain(supabase, userId, String(created.id), 'Personal', null)
      return created
    } catch (err) {
      if (err instanceof Error && err.message.includes('idx_campaigns_single_personal_per_user')) {
        const fallback = await this.campaignsRepo.findPersonalByUserId(supabase, userId)
        if (fallback) {
          await this.ensureCoreCampaignAgents(supabase, userId, String(fallback.id), null)
          await this.ensureCampaignBrain(supabase, userId, String(fallback.id), 'Personal', null)
          return fallback
        }
      }
      throw err
    }
  }

  async getCampaignAnalytics(
    supabase: SupabaseClient,
    id: string,
    startDate?: string,
    endDate?: string,
    funnelIds?: string[],
    orgId?: string | null,
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, id, { orgId })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return this.campaignsRepo.getAnalytics(supabase, id, startDate, endDate, funnelIds)
  }

  async getCampaignEmailAnalytics(
    supabase: SupabaseClient,
    id: string,
    startDate?: string,
    endDate?: string,
    sequenceIds?: string[],
    orgId?: string | null,
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, id, { orgId })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return this.campaignsRepo.getEmailAnalytics(supabase, id, startDate, endDate, sequenceIds)
  }

  async getCampaignAdAnalytics(
    supabase: SupabaseClient,
    id: string,
    startDate?: string,
    endDate?: string,
    orgId?: string | null,
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, id, { orgId })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return this.campaignsRepo.getAdAnalytics(supabase, id, startDate, endDate)
  }

  async getCampaignReportingWidgets(
    supabase: SupabaseClient,
    id: string,
    startDate?: string,
    endDate?: string,
    orgId?: string | null,
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, id, { orgId })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return this.campaignsRepo.getCampaignReportingWidgets(supabase, id, startDate, endDate)
  }

  async getCampaignLeaderboard(
    supabase: SupabaseClient,
    startDate?: string,
    endDate?: string,
    limit?: number,
  ) {
    return this.campaignsRepo.getUserCampaignLeaderboard(supabase, startDate, endDate, limit)
  }

  async listKnowledgeNodes(
    supabase: SupabaseClient,
    campaignId: string,
    opts?: {
      node_type?: string
      query?: string
      limit?: number
      domain?: string
      source_type?: string
    },
    orgId?: string | null,
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId, { orgId })
    if (!campaign) throw new NotFoundException('Campaign not found')
    return this.campaignsRepo.listKnowledgeNodes(supabase, campaignId, {
      nodeType: opts?.node_type,
      query: opts?.query,
      limit: opts?.limit,
      domain: opts?.domain,
      sourceType: opts?.source_type,
    })
  }

  async createManualKnowledgeNode(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    body: {
      title: string
      content: string
      node_type?: 'document' | 'user_upload' | 'url_import'
      sourceType?: 'upload' | 'drive' | 'dropbox' | 'url' | 'mission' | 'auto_sync'
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string | null
      mediaMimeType?: string | null
      mediaBase64?: string | null
      mediaCaption?: string | null
    },
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    if (!body.title?.trim() || !body.content?.trim())
      throw new Error('title and content are required')

    return this.ingestKnowledgePayload(supabase, userId, campaignId, {
      nodeType: body.node_type ?? 'document',
      title: body.title.trim(),
      content: body.content.trim(),
      sourceType: body.sourceType ?? 'upload',
      sourceId: null,
      domain: body.domain ?? 'general',
      mediaType: body.mediaType,
      mediaUrl: body.mediaUrl ?? null,
      mediaMimeType: body.mediaMimeType ?? null,
      mediaBase64: body.mediaBase64 ?? null,
      mediaCaption: body.mediaCaption ?? null,
      metadata: { manual: true, media_caption: body.mediaCaption ?? null },
    })
  }

  async importKnowledgeFromUrl(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    url: string,
    domainOverride?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general',
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    if (!url?.trim()) throw new Error('url is required')

    const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`

    const agentResult = await this.tryAgentTranscript(userId, normalized)
    if (agentResult) {
      return this.ingestKnowledgePayload(supabase, userId, campaignId, {
        nodeType: 'url_import',
        title: agentResult.title,
        content: agentResult.content,
        sourceType: 'url',
        sourceId: normalized,
        sourceUri: normalized,
        metadata: {
          imported_url: normalized,
          transcript_source: agentResult.source,
          ...(agentResult.platform ? { platform: agentResult.platform } : {}),
        },
        domain: domainOverride,
      })
    }

    const extracted = await this.linkExtraction.extract(url.trim(), {
      userId,
      orgId: (campaign.org_id as string | null) ?? undefined,
      campaignId,
      feature: 'brain',
      action: 'link_image_ocr',
    })
    const content = extracted.text.slice(0, 20000)
    if (!content) throw new Error('No readable content from URL')

    return this.ingestKnowledgePayload(supabase, userId, campaignId, {
      nodeType: 'url_import',
      title: extracted.title,
      content,
      sourceType: 'url',
      sourceId: normalized,
      sourceUri: normalized,
      metadata: { imported_url: normalized },
      domain: domainOverride,
    })
  }

  protected async tryAgentTranscript(
    userId: string,
    url: string,
  ): Promise<{ title: string; content: string; source: string; platform?: string } | null> {
    if (!this.agentGateway) return null

    try {
      const result = await this.agentGateway.callArtifactAction(userId, 'extract_url_transcript', {
        url,
        include_metadata: true,
      })
      if (!result || result.success !== true) return null

      const transcript = String(result.transcript ?? '').trim()
      if (!transcript) return null

      const metadata = result.metadata as { title?: string; duration_seconds?: number } | undefined
      const title = metadata?.title || new URL(url).hostname
      return {
        title,
        content: transcript.slice(0, 20000),
        source: String(result.source ?? 'agent_transcript'),
        platform: typeof result.platform === 'string' ? result.platform : undefined,
      }
    } catch (err) {
      this.logger.warn(`Agent transcript extraction failed for ${url}: ${(err as Error).message}`)
      return null
    }
  }

  // importKnowledgeFromFathomMeeting and importKnowledgeFromFirefliesTranscript
  // have been removed — campaign meeting imports are now handled via Atlas missions.

  async ingestKnowledgeFromDeliverable(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    deliverableId: string,
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    if (!deliverableId?.trim()) throw new Error('deliverable_id is required')

    const deliverable = await this.campaignsRepo.findMissionDeliverableForKnowledge(
      supabase,
      deliverableId,
    )
    if (!deliverable) throw new Error('Deliverable not found')
    if (String(deliverable.campaign_id || '') !== campaignId) {
      throw new Error('Deliverable does not belong to this campaign')
    }

    const mission = await this.campaignsRepo.findMissionForKnowledgeDeliverable(
      supabase,
      String(deliverable.mission_id),
    )
    if (!mission) throw new Error('Mission not found for deliverable')
    if (String(mission.campaign_id || '') !== campaignId) {
      throw new Error('Mission campaign mismatch for deliverable')
    }
    if (String(mission.status || '') !== 'done') {
      throw new Error('Only deliverables from completed missions can be reused as campaign context')
    }

    const content =
      String(deliverable.content || '').trim() ||
      (deliverable.content_json ? JSON.stringify(deliverable.content_json, null, 2).trim() : '') ||
      String(deliverable.file_url || '').trim() ||
      JSON.stringify(deliverable.metadata || {}).trim()
    if (!content) throw new Error('Deliverable has no ingestible content')

    return this.ingestKnowledgePayload(supabase, userId, campaignId, {
      nodeType: 'deliverable',
      title: String(deliverable.title || 'Mission Deliverable').trim() || 'Mission Deliverable',
      content: content.slice(0, 20000),
      sourceType: 'mission',
      sourceId: String(deliverable.id),
      metadata: {
        mission_id: String(mission.id),
        deliverable_type: deliverable.type,
        agent_key: deliverable.agent_key,
        approved_by_user: true,
      },
      domain: 'general',
    })
  }

  async deleteKnowledgeNode(supabase: SupabaseClient, campaignId: string, nodeId: string) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    await this.campaignsRepo.deleteKnowledgeNode(supabase, nodeId)
  }

  async getKnowledgeGraph(supabase: SupabaseClient, campaignId: string) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    const [nodes, edges] = await Promise.all([
      this.campaignsRepo.listKnowledgeNodes(supabase, campaignId, { limit: 500 }),
      this.campaignsRepo.listKnowledgeEdges(supabase, campaignId, 1000),
    ])
    return { nodes, edges }
  }

  async searchKnowledge(
    supabase: SupabaseClient,
    campaignId: string,
    query: string,
    opts?: { limit?: number; depth?: number; domain?: string; domains?: string[] },
  ) {
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new Error('Campaign not found')
    if (!query?.trim()) return { seeds: [], traversed: [], nodes: [] }

    const vector = await this.embeddingService.getEmbedding(query, {
      taskType: 'RETRIEVAL_QUERY',
      billing: {
        userId: String(campaign.user_id),
        orgId: campaign.org_id as string | null,
      },
    })
    if (!vector) return { seeds: [], traversed: [], nodes: [] }

    const domains = opts?.domains?.length ? opts.domains : opts?.domain ? [opts.domain] : undefined

    const seeds = await this.campaignsRepo.matchKnowledgeNodes(
      supabase,
      campaignId,
      JSON.stringify(vector),
      opts?.limit ?? 8,
      CampaignsServiceBase02.KNOWLEDGE_SEARCH_THRESHOLD,
      domains,
    )
    const seedIds = seeds.map((s: Record<string, unknown>) => String(s.id))

    const traversed = seedIds.length
      ? await this.campaignsRepo.traverseKnowledgeEdges(
          supabase,
          campaignId,
          seedIds,
          opts?.depth ?? 2,
          0.3,
        )
      : []
    const traversedIds = traversed.map((t: Record<string, unknown>) => String(t.node_id))
    const allIds = Array.from(new Set([...seedIds, ...traversedIds]))
    const nodes = await this.campaignsRepo.getKnowledgeNodeByIds(supabase, allIds)
    return { seeds, traversed, nodes }
  }
}

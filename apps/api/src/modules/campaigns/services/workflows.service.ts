import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { WorkflowsRepository } from '../repositories/workflows.repository'
import { WorkflowEdgeDeleteCleanupService } from './workflow-edge-delete-cleanup.service'

type WorkflowNodeType =
  | 'funnel'
  | 'sequence'
  | 'presentation'
  | 'offer'
  | 'ad_campaign'
  | 'avatar'
  | 'social_post'
type WorkflowEdgeType =
  | 'funnel_conversion_to_sequence'
  | 'sequence_complete_to_sequence'
  | 'funnel_to_presentation'

type WorkflowEdgeStatus = 'draft' | 'valid' | 'invalid' | 'active' | 'paused'
type DeleteMode = 'keep_unsent' | 'remove_unsent'

export type WorkflowValidationError = {
  code: string
  message: string
  meta?: Record<string, unknown>
}

function asUuid(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.trim()
}

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly repo: WorkflowsRepository,
    private readonly edgeDeleteCleanup: WorkflowEdgeDeleteCleanupService = new WorkflowEdgeDeleteCleanupService(),
  ) {}

  private async assertCampaignAccessible(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<void> {
    const campaign = await this.repo.findAccessibleCampaign(supabase, userId, campaignId)
    if (!campaign?.id) throw new Error('Campaign not found')
  }

  private async getOrCreateWorkflowId(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
  ): Promise<string> {
    const existing = await this.repo.findWorkflowByCampaignId(supabase, userId, campaignId)
    if (existing?.id) return String(existing.id)
    const created = await this.repo.createWorkflow(supabase, userId, campaignId, 'Main')
    return String(created.id)
  }

  private createsSequenceCycle(
    existingEdges: { from_id: string; to_id: string }[],
    fromId: string,
    toId: string,
  ) {
    // Detect cycle after adding fromId -> toId:
    // cycle exists if there's a path from toId back to fromId.
    const adj = new Map<string, string[]>()
    for (const e of existingEdges) {
      const a = asUuid(e.from_id)
      const b = asUuid(e.to_id)
      if (!a || !b) continue
      const arr = adj.get(a) ?? []
      arr.push(b)
      adj.set(a, arr)
    }

    const seen = new Set<string>()
    const stack: string[] = [toId]
    while (stack.length > 0) {
      const cur = stack.pop()!
      if (cur === fromId) return true
      if (seen.has(cur)) continue
      seen.add(cur)
      const next = adj.get(cur) ?? []
      for (const n of next) stack.push(n)
    }
    return false
  }

  private async validateEdge(
    supabase: SupabaseClient,
    userId: string,
    workflowId: string,
    campaignId: string,
    input: {
      edge_type: WorkflowEdgeType
      from_type: WorkflowNodeType
      from_id: string
      to_type: WorkflowNodeType
      to_id: string
    },
  ): Promise<{
    status: Exclude<WorkflowEdgeStatus, 'active' | 'paused'>
    errors: WorkflowValidationError[]
  }> {
    const errors: WorkflowValidationError[] = []

    if (input.edge_type === 'funnel_conversion_to_sequence') {
      if (input.from_type !== 'funnel' || input.to_type !== 'sequence') {
        errors.push({
          code: 'EDGE_TYPES_MISMATCH',
          message: 'funnel_conversion_to_sequence requires from_type=funnel and to_type=sequence',
        })
      }

      const funnelId = input.from_id
      const sequenceId = input.to_id

      const funnel = await this.repo.findFunnelInCampaign(supabase, funnelId, campaignId)
      if (!funnel?.id) {
        errors.push({ code: 'FUNNEL_NOT_FOUND', message: 'Funnel not found in this campaign' })
      }

      const seq = await this.repo.findSequenceInCampaign(supabase, sequenceId, campaignId)
      if (!seq?.id) {
        errors.push({ code: 'SEQUENCE_NOT_FOUND', message: 'Sequence not found in this campaign' })
      }

      if (funnel?.id) {
        const hasPoint = await this.repo.hasEmailCaptureConversionPoint(supabase, funnelId)
        if (!hasPoint) {
          errors.push({
            code: 'NO_CONVERSION_POINTS',
            message:
              "Funnel has no 'email_capture' conversion points (no pages marked as converting)",
            meta: { funnel_id: funnelId },
          })
        }
      }

      const senderIdentity = await this.repo.findVerifiedSenderIdentity(supabase, userId)
      if (!senderIdentity?.id || !senderIdentity.domain_id) {
        errors.push({
          code: 'MISSING_VERIFIED_SENDER_IDENTITY',
          message:
            'No verified sender identity is configured. Connect a verified sender in Workspace Settings > Email.',
        })
      }
    }

    if (input.edge_type === 'sequence_complete_to_sequence') {
      if (input.from_type !== 'sequence' || input.to_type !== 'sequence') {
        errors.push({
          code: 'EDGE_TYPES_MISMATCH',
          message: 'sequence_complete_to_sequence requires from_type=sequence and to_type=sequence',
        })
      }
      if (input.from_id === input.to_id) {
        errors.push({
          code: 'SELF_LOOP',
          message: 'Sequence cannot connect to itself',
        })
      }

      const fromSeq = await this.repo.findSequenceInCampaign(supabase, input.from_id, campaignId)
      if (!fromSeq?.id) {
        errors.push({
          code: 'SEQUENCE_NOT_FOUND',
          message: 'From sequence not found in this campaign',
        })
      }

      const toSeq = await this.repo.findSequenceInCampaign(supabase, input.to_id, campaignId)
      if (!toSeq?.id) {
        errors.push({
          code: 'SEQUENCE_NOT_FOUND',
          message: 'To sequence not found in this campaign',
        })
      }

      if (errors.length === 0) {
        const existing = await this.repo.listEdges(supabase, workflowId)
        const seqEdges = existing
          .filter((e) => e.edge_type === 'sequence_complete_to_sequence')
          .map((e) => ({ from_id: String(e.from_id), to_id: String(e.to_id) }))

        if (this.createsSequenceCycle(seqEdges, input.from_id, input.to_id)) {
          errors.push({
            code: 'CYCLE_DETECTED',
            message: 'This connection creates a cycle in the sequence workflow',
          })
        }
      }
    }

    if (input.edge_type === 'funnel_to_presentation') {
      if (input.from_type !== 'funnel' || input.to_type !== 'presentation') {
        errors.push({
          code: 'EDGE_TYPES_MISMATCH',
          message: 'funnel_to_presentation requires from_type=funnel and to_type=presentation',
        })
      }
      const funnel = await this.repo.findFunnelInCampaign(supabase, input.from_id, campaignId)
      if (!funnel?.id)
        errors.push({ code: 'FUNNEL_NOT_FOUND', message: 'Funnel not found in this campaign' })

      const lm = await this.repo.findPresentationInCampaign(supabase, input.to_id, campaignId)
      if (!lm?.id)
        errors.push({
          code: 'PRESENTATION_NOT_FOUND',
          message: 'Presentation not found in this campaign',
        })
    }

    if (errors.length > 0) return { status: 'invalid', errors }
    return { status: 'valid', errors: [] }
  }

  async getWorkflowGraph(supabase: SupabaseClient, userId: string, campaignId: string) {
    await this.assertCampaignAccessible(supabase, userId, campaignId)

    const workflowId = await this.getOrCreateWorkflowId(supabase, userId, campaignId)
    const [
      funnels,
      sequences,
      presentations,
      offers,
      adCampaigns,
      avatars,
      socialPosts,
      funnelsWithOffer,
      presentationsWithOffer,
      edges,
      layout,
      conversionPoints,
    ] = await Promise.all([
      this.repo.listFunnels(supabase, campaignId),
      this.repo.listSequences(supabase, campaignId),
      this.repo.listPresentations(supabase, campaignId),
      this.repo.listOffers(supabase, campaignId),
      this.repo.listAdCampaigns(supabase, campaignId),
      this.repo.listAvatars(supabase, campaignId),
      this.repo.listSocialPosts(supabase, campaignId),
      this.repo.listFunnelsWithOfferId(supabase, campaignId),
      this.repo.listPresentationsWithOfferId(supabase, campaignId),
      this.repo.listEdges(supabase, workflowId),
      this.repo.getLayout(supabase, workflowId),
      this.repo.listConversionPointsByCampaign(supabase, campaignId),
    ])

    const nodes = [
      ...offers.map((o) => ({
        type: 'offer' as const,
        id: o.id,
        label: o.name ?? 'Untitled Offer',
        meta: {},
      })),
      ...funnels.map((f) => ({
        type: 'funnel' as const,
        id: f.id,
        label: f.name ?? 'Untitled Funnel',
        meta: { page_count: f.funnel_pages?.length ?? 0, status: f.status ?? 'draft' },
      })),
      ...adCampaigns.map((ac) => ({
        type: 'ad_campaign' as const,
        id: ac.id,
        label: ac.name ?? 'Untitled Ad Campaign',
        meta: {},
      })),
      ...sequences.map((s) => ({
        type: 'sequence' as const,
        id: s.id,
        label: s.name ?? 'Untitled Sequence',
        meta: { email_count: s.sequence_emails?.length ?? 0 },
      })),
      ...presentations.map((l) => ({
        type: 'presentation' as const,
        id: l.id,
        label: l.name ?? 'Untitled Presentation',
        meta: { status: l.status ?? 'draft' },
      })),
      ...avatars.map((a) => ({
        type: 'avatar' as const,
        id: a.id,
        label: a.name ?? 'Untitled Avatar',
        meta: {},
      })),
      ...socialPosts.map((sp) => ({
        type: 'social_post' as const,
        id: sp.id,
        label: sp.caption?.slice(0, 60) || sp.headline || 'Social Post',
        meta: { platform: sp.platform },
      })),
    ]

    const offerIds = new Set(offers.map((o) => o.id))
    const derivedEdges: Array<{
      id: string
      from_type: string
      from_id: string
      to_type: string
      to_id: string
      edge_type: string
      status: string
      validation_errors: never[]
      config: Record<string, unknown>
      derived: true
    }> = []

    for (const f of funnelsWithOffer) {
      if (offerIds.has(f.offer_id)) {
        derivedEdges.push({
          id: `derived:offer_to_funnel:${f.offer_id}:${f.id}`,
          from_type: 'offer',
          from_id: f.offer_id,
          to_type: 'funnel',
          to_id: f.id,
          edge_type: 'offer_to_funnel',
          status: 'valid',
          validation_errors: [],
          config: {},
          derived: true,
        })
      }
    }

    for (const lm of presentationsWithOffer) {
      if (offerIds.has(lm.offer_id)) {
        derivedEdges.push({
          id: `derived:offer_to_presentation:${lm.offer_id}:${lm.id}`,
          from_type: 'offer',
          from_id: lm.offer_id,
          to_type: 'presentation',
          to_id: lm.id,
          edge_type: 'offer_to_presentation',
          status: 'valid',
          validation_errors: [],
          config: {},
          derived: true,
        })
      }
    }

    for (const a of avatars) {
      if (a.offer_id && offerIds.has(a.offer_id)) {
        derivedEdges.push({
          id: `derived:offer_to_avatar:${a.offer_id}:${a.id}`,
          from_type: 'offer',
          from_id: a.offer_id,
          to_type: 'avatar',
          to_id: a.id,
          edge_type: 'offer_to_avatar',
          status: 'valid',
          validation_errors: [],
          config: {},
          derived: true,
        })
      }
    }

    return {
      workflow_id: workflowId,
      nodes,
      edges: [...edges, ...derivedEdges],
      layout,
      conversion_points: conversionPoints,
    }
  }

  async createEdge(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    input: {
      from_type: WorkflowNodeType
      from_id: string
      to_type: WorkflowNodeType
      to_id: string
      edge_type: WorkflowEdgeType
      config?: Record<string, unknown>
    },
  ) {
    await this.assertCampaignAccessible(supabase, userId, campaignId)
    const workflowId = await this.getOrCreateWorkflowId(supabase, userId, campaignId)

    const validation = await this.validateEdge(supabase, userId, workflowId, campaignId, {
      edge_type: input.edge_type,
      from_type: input.from_type,
      from_id: input.from_id,
      to_type: input.to_type,
      to_id: input.to_id,
    })

    const now = new Date().toISOString()
    const row = await this.repo.createEdge(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      workflow_id: workflowId,
      from_type: input.from_type,
      from_id: input.from_id,
      to_type: input.to_type,
      to_id: input.to_id,
      edge_type: input.edge_type,
      config: input.config ?? {},
      status: validation.status,
      validation_errors: validation.errors,
      created_at: now,
      updated_at: now,
    })

    return row
  }

  async updateEdge(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    edgeId: string,
    input: { config?: Record<string, unknown>; status?: WorkflowEdgeStatus },
  ) {
    await this.assertCampaignAccessible(supabase, userId, campaignId)

    const existing = await this.repo.getEdgeById(supabase, edgeId)
    if (!existing) throw new Error('Edge not found')
    if (String(existing.campaign_id) !== campaignId) throw new Error('Edge not found')

    const workflowId = String(existing.workflow_id)
    const nextConfig = (input.config ?? existing.config ?? {}) as Record<string, unknown>

    const validation = await this.validateEdge(supabase, userId, workflowId, campaignId, {
      edge_type: existing.edge_type as WorkflowEdgeType,
      from_type: existing.from_type as WorkflowNodeType,
      from_id: String(existing.from_id),
      to_type: existing.to_type as WorkflowNodeType,
      to_id: String(existing.to_id),
    })

    const desiredStatus = input.status ?? (existing.status as WorkflowEdgeStatus)
    if (desiredStatus === 'active' && validation.status !== 'valid') {
      throw new BadRequestException('Edge is invalid and cannot be activated')
    }

    const storedStatus =
      desiredStatus === 'active' || desiredStatus === 'paused'
        ? desiredStatus
        : (validation.status as WorkflowEdgeStatus)

    return this.repo.updateEdge(supabase, edgeId, {
      config: nextConfig,
      status: storedStatus,
      validation_errors: validation.errors,
      updated_at: new Date().toISOString(),
    })
  }

  async saveLayout(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    workflowId: string,
    layout: unknown,
  ) {
    await this.assertCampaignAccessible(supabase, userId, campaignId)
    return this.repo.upsertLayout(supabase, {
      workflow_id: workflowId,
      user_id: userId,
      campaign_id: campaignId,
      layout,
    })
  }

  async deleteEdge(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    edgeId: string,
    deleteMode: DeleteMode,
  ) {
    await this.assertCampaignAccessible(supabase, userId, campaignId)

    const existing = await this.repo.getEdgeById(supabase, edgeId)
    if (!existing) throw new Error('Edge not found')
    if (String(existing.campaign_id) !== campaignId) throw new Error('Edge not found')
    if (String(existing.user_id) !== userId) throw new Error('Edge not found')

    const edgeType = existing.edge_type as WorkflowEdgeType
    if (deleteMode === 'remove_unsent') {
      await this.edgeDeleteCleanup.cancelUnsentForEdge(supabase, existing, edgeType)
    }

    await this.repo.deleteEdgeById(supabase, edgeId)
    return { success: true as const }
  }
}

import { Injectable } from '@nestjs/common'
import { normalizeTemporalPayload, temporalInsertFields } from '@vibey/api-shared'
import { ArtifactBrainNarrativeRepository } from '../repositories/artifact-brain-narrative.repository'

type NarrativeBrainResolver = (
  target: Record<string, any>,
  input: Record<string, unknown>,
  userId: string,
  sessionKey?: string,
  requiredAccess?: 'view' | 'query' | 'train',
) => Promise<{ brainId: string } | { error: string }>

type NarrativeWriterGuard = (
  target: Record<string, any>,
  sessionKey?: string,
) => { success: false; error: string } | null

type SessionAgentResolver = (target: Record<string, any>, sessionKey?: string) => string | null

@Injectable()
export class ArtifactBrainTimelineActionsService {
  constructor(
    private readonly brainNarrativeRepository: ArtifactBrainNarrativeRepository = new ArtifactBrainNarrativeRepository(),
  ) {}

  async getBrainTimelines(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId

    const timelineType = typeof input.timeline_type === 'string' ? input.timeline_type.trim() : null
    const targetType = typeof input.target_type === 'string' ? input.target_type.trim() : null
    const targetId = typeof input.target_id === 'string' ? input.target_id.trim() : null
    const status = typeof input.status === 'string' ? input.status.trim() : 'active'
    const limit = typeof input.limit === 'number' ? Math.min(input.limit, 50) : 20
    const { data, error } = await this.brainNarrativeRepository.listTimelines(
      target.serviceClient,
      { brainId, timelineType, targetType, targetId, status, limit },
    )
    if (error) return { success: false, error: `Failed to read timelines: ${error.message}` }
    return { success: true, count: (data ?? []).length, timelines: data ?? [] }
  }

  async getBrainTimelineItems(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId
    const timelineId = typeof input.timeline_id === 'string' ? input.timeline_id.trim() : ''
    if (!timelineId) return { success: false, error: 'timeline_id is required' }

    const { data: timeline } = await this.brainNarrativeRepository.findTimeline(
      target.serviceClient,
      timelineId,
    )
    if (!timeline || timeline.brain_id !== brainId) {
      return { success: false, error: 'Timeline does not belong to the requested brain target' }
    }

    const limit = typeof input.limit === 'number' ? Math.min(input.limit, 200) : 100
    const { data, error } = await this.brainNarrativeRepository.listTimelineItems(
      target.serviceClient,
      { brainId, timelineId, limit },
    )
    if (error) return { success: false, error: `Failed to read timeline items: ${error.message}` }
    return { success: true, count: (data ?? []).length, items: data ?? [] }
  }

  async createBrainTimeline(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
    resolveSessionAgentKey: SessionAgentResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId

    const timelineType = typeof input.timeline_type === 'string' ? input.timeline_type.trim() : ''
    const targetType = typeof input.target_type === 'string' ? input.target_type.trim() : ''
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (!timelineType) return { success: false, error: 'timeline_type is required' }
    if (!targetType) return { success: false, error: 'target_type is required' }
    if (!title) return { success: false, error: 'title is required' }

    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? input.metadata
        : {}
    const { data, error } = await this.brainNarrativeRepository.createTimeline(
      target.serviceClient,
      {
        brain_id: brainId,
        timeline_type: timelineType,
        target_type: targetType,
        target_id:
          typeof input.target_id === 'string' && input.target_id.trim()
            ? input.target_id.trim()
            : null,
        title,
        summary: typeof input.summary === 'string' ? input.summary.trim() : null,
        status: typeof input.status === 'string' ? input.status.trim() : 'active',
        metadata,
        created_by_agent_key: resolveSessionAgentKey(target, sessionKey),
        ...this.timelineTemporalFields(input),
      },
    )

    if (error) return { success: false, error: `Failed to create timeline: ${error.message}` }
    return { success: true, timeline: data }
  }

  async upsertBrainTimelineItems(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId
    const timelineId = typeof input.timeline_id === 'string' ? input.timeline_id.trim() : ''
    if (!timelineId) return { success: false, error: 'timeline_id is required' }
    if (!Array.isArray(input.items)) return { success: false, error: 'items must be an array' }

    const { data: timeline } = await this.brainNarrativeRepository.findTimeline(
      target.serviceClient,
      timelineId,
    )
    if (!timeline || timeline.brain_id !== brainId) {
      return { success: false, error: 'Timeline does not belong to the requested brain target' }
    }

    const written: unknown[] = []
    for (const rawItem of input.items.slice(0, 100)) {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) continue
      const item = rawItem as Record<string, unknown>
      const itemType = typeof item.item_type === 'string' ? item.item_type.trim() : ''
      const title = typeof item.title === 'string' ? item.title.trim() : ''
      if (!itemType || !title) continue
      const dedupeKey =
        typeof item.dedupe_key === 'string' && item.dedupe_key.trim()
          ? item.dedupe_key.trim()
          : null
      const metadata =
        item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
          ? item.metadata
          : {}
      const payload: Record<string, unknown> = {
        brain_id: brainId,
        timeline_id: timelineId,
        item_type: itemType,
        title,
        description: typeof item.description === 'string' ? item.description.trim() : null,
        importance:
          typeof item.importance === 'number' ? Math.max(0, Math.min(1, item.importance)) : 0.5,
        confidence:
          typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
        source_type: typeof item.source_type === 'string' ? item.source_type.trim() || null : null,
        source_id: typeof item.source_id === 'string' ? item.source_id.trim() || null : null,
        source_title:
          typeof item.source_title === 'string' ? item.source_title.trim() || null : null,
        related_node_type:
          typeof item.related_node_type === 'string' ? item.related_node_type.trim() || null : null,
        related_node_id:
          typeof item.related_node_id === 'string' ? item.related_node_id.trim() || null : null,
        evidence_refs: Array.isArray(item.evidence_refs) ? item.evidence_refs : [],
        dedupe_key: dedupeKey,
        metadata,
        ...temporalInsertFields(item),
      }

      if (dedupeKey) {
        const { data: existing } = await this.brainNarrativeRepository.findTimelineItemByDedupeKey(
          target.serviceClient,
          { timelineId, dedupeKey },
        )
        if (existing?.id) {
          const { data, error } = await this.brainNarrativeRepository.writeTimelineItem(
            target.serviceClient,
            { id: existing.id, payload },
          )
          if (error) {
            return { success: false, error: `Failed to update timeline item: ${error.message}` }
          }
          written.push(data)
          continue
        }
      }

      const { data, error } = await this.brainNarrativeRepository.writeTimelineItem(
        target.serviceClient,
        { payload },
      )
      if (error) {
        return { success: false, error: `Failed to insert timeline item: ${error.message}` }
      }
      written.push(data)
    }

    return { success: true, count: written.length, items: written }
  }

  async archiveBrainTimeline(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    if (!id) return { success: false, error: 'id is required' }
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }

    const { data: timeline } = await this.brainNarrativeRepository.findTimeline(
      target.serviceClient,
      id,
    )
    if (!timeline || timeline.brain_id !== resolved.brainId) {
      return { success: false, error: 'Timeline does not belong to the requested brain target' }
    }

    const { error } = await this.brainNarrativeRepository.archiveTimeline(target.serviceClient, id)
    if (error) return { success: false, error: `Failed to archive timeline: ${error.message}` }
    return { success: true, archived: id }
  }

  private timelineTemporalFields(input: Record<string, unknown>): Record<string, unknown> {
    const temporal = normalizeTemporalPayload(input)
    const fields: Record<string, unknown> = {}
    const evidenceStartedAt =
      temporal.evidence_started_at ?? temporal.occurred_at ?? temporal.effective_from ?? null
    const evidenceEndedAt =
      temporal.evidence_ended_at ?? temporal.occurred_until ?? temporal.effective_until ?? null
    const validFrom = temporal.valid_from ?? temporal.effective_from ?? null
    const validUntil = temporal.valid_until ?? temporal.effective_until ?? null
    if (evidenceStartedAt) fields.evidence_started_at = evidenceStartedAt
    if (evidenceEndedAt) fields.evidence_ended_at = evidenceEndedAt
    if (validFrom) fields.valid_from = validFrom
    if (validUntil) fields.valid_until = validUntil
    if (temporal.temporal_status) fields.temporal_status = temporal.temporal_status
    if (temporal.temporal_confidence !== undefined) {
      fields.temporal_confidence = temporal.temporal_confidence
    }
    if (temporal.temporal_source) fields.temporal_source = temporal.temporal_source
    return fields
  }
}

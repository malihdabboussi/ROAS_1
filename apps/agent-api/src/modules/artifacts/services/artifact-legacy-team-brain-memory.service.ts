import { Injectable } from '@nestjs/common'
import { temporalInsertFields } from '@vibey/api-shared'
import { ArtifactLegacyTeamBrainRepository } from '../repositories/artifact-legacy-team-brain.repository'

@Injectable()
export class ArtifactLegacyTeamBrainMemoryService {
  constructor(
    private readonly repository: ArtifactLegacyTeamBrainRepository = new ArtifactLegacyTeamBrainRepository(),
  ) {}

  async saveMemory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const isBrainJob = sessionKey?.includes('-brain-job-') ?? false
    const brainJobTarget = this.parseBrainJobTarget(sessionKey)

    if (
      isBrainJob &&
      brainJobTarget?.targetBrain &&
      !['user', 'customer'].includes(brainJobTarget.targetBrain)
    ) {
      return {
        success: false,
        error:
          `WRONG BRAIN: save_user_memory writes to the user brain, but this job targets the "${brainJobTarget.targetBrain}" brain. ` +
          (brainJobTarget.targetBrain === 'agent'
            ? 'Use ingest_agent_brain_text or ingest_agent_brain_link instead for agent brain.'
            : 'Customer brain writes must use customer-brain tools.'),
      }
    }

    const content = input.content as string | undefined
    const memoryType = input.memory_type as string | undefined
    const significance = input.significance as number | undefined
    const tags = input.tags as string[] | undefined
    const inputSourceType = input.source_type as string | undefined
    const inputSourceId = input.source_id as string | undefined
    const inputSourceTitle = input.source_title as string | undefined
    const inputDomain = input.domain as string | undefined
    const inputContactId = input.contact_id as string | undefined
    const temporalFields = temporalInsertFields(input)

    if (!content || content.trim().length < 10) {
      return { success: false, error: 'content is required (min 10 chars)' }
    }
    const validTypes = ['decision', 'insight', 'preference', 'fact', 'story', 'framework', 'event']
    if (!memoryType || !validTypes.includes(memoryType)) {
      return { success: false, error: `memory_type must be one of: ${validTypes.join(', ')}` }
    }

    const userId = target.resolveUserId(sessionKey)
    const agentKey = target.parseAgentIdFromSessionKey(sessionKey ?? '')
    const conversationId = sessionKey ? target.parseConversationId(sessionKey) : null
    const trimmedContent = content.trim()

    // A brain job's parsed target (session key `::brain:user:<id>`), or an
    // explicit brain_id on the input, decides which brain receives the memory.
    // Person-period fork jobs target org-managed Person Brains — falling back
    // to the caller's default user brain sent every fork save to the org
    // owner's personal brain while the person brains stayed empty.
    const targetBrainId =
      brainJobTarget?.brainId ??
      (typeof input.brain_id === 'string' && input.brain_id.trim() ? input.brain_id.trim() : null)

    const contentHash = target.embeddingService.computeContentHash(trimmedContent)
    // Dedup must check the brain the write goes to, not the default brain —
    // otherwise content already saved elsewhere silently swallows the write.
    const isDuplicate = await target.memoriesRepo.checkDuplicate(
      target.serviceClient,
      contentHash,
      userId,
      targetBrainId ?? undefined,
    )
    if (isDuplicate) {
      return { success: true, duplicate: true }
    }

    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const embedding = await target.embeddingService.getEmbedding(trimmedContent, {
      billing: { userId, orgId },
    })

    let resolvedSourceType = inputSourceType ?? 'conversation'
    let resolvedSourceId = inputSourceId ?? conversationId
    let resolvedSourceTitle = inputSourceTitle ?? null

    if (!isBrainJob && !inputSourceTitle && conversationId) {
      const { data: conv } = await this.repository.findConversationTitle(
        target.serviceClient,
        conversationId,
      )
      resolvedSourceTitle = (conv?.title as string) ?? null
    }

    if (!resolvedSourceTitle && !isBrainJob && conversationId) {
      resolvedSourceTitle = `Chat ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }

    try {
      const record: Record<string, unknown> = {
        content: trimmedContent,
        content_hash: contentHash,
        memory_type: memoryType,
        source_type: resolvedSourceType,
        source_id: resolvedSourceId,
        source_title: resolvedSourceTitle,
        ...temporalFields,
        agent_id: agentKey ?? 'vibey',
        speaker: userId,
        confidence: 0.8,
        significance: Math.min(Math.max(significance ?? 0.7, 0), 1),
        tags: [
          ...(tags ?? []),
          ...(inputDomain && !tags?.includes(inputDomain) ? [inputDomain] : []),
        ],
        metadata: {
          user_id: userId,
          ...(resolvedSourceType !== 'conversation' ? { import_source: resolvedSourceType } : {}),
          ...(inputContactId ? { contact_id: inputContactId } : {}),
          temporal: temporalFields,
        },
      }
      if (targetBrainId && brainJobTarget?.targetBrain !== 'customer') {
        record.brain_id = targetBrainId
      }
      if (brainJobTarget?.targetBrain === 'customer') {
        if (!brainJobTarget.brainId) {
          return { success: false, error: 'customer brain_id is required' }
        }
        if (!inputContactId && !resolvedSourceId) {
          return {
            success: false,
            error:
              'contact_id or durable source identity is required for customer brain memories',
          }
        }
        record.brain_id = brainJobTarget.brainId
        record.contact_id = inputContactId ?? null
        record.metadata = {
          ...(record.metadata as Record<string, unknown>),
          identity_resolution: {
            status: inputContactId ? 'linked_contact' : 'unlinked_source',
            contact_id: inputContactId ?? null,
            source_anchor_field: resolvedSourceId ? 'source_id' : null,
            source_anchor_value: resolvedSourceId ?? null,
          },
        }
      }
      if (embedding) record.embedding = JSON.stringify(embedding)

      const memory = await target.memoriesRepo.create(target.serviceClient, record)
      target.emotionalTagging
        .tagMemory(target.serviceClient, memory.id, trimmedContent, userId, orgId)
        .catch(() => {})
      return { success: true, memory_id: memory.id }
    } catch (err) {
      target.logger.error(`save_user_memory failed: ${err instanceof Error ? err.message : err}`)
      return { success: false, error: 'Failed to save memory' }
    }
  }

  async searchMemory(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const query = input.query as string | undefined
    if (!query || query.trim().length < 3) {
      return { success: false, error: 'query is required (min 3 chars)' }
    }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const explicitBrainId = String(input.brain_id ?? input.brainId ?? '').trim()
    if (target.brainRetrievalService && typeof target.getUserClient === 'function') {
      const userClient = await target.getUserClient(userId, sessionKey as string)
      const retrieved = await target.brainRetrievalService.search({
        supabase: target.serviceClient,
        userClient,
        family: 'user',
        brainId: explicitBrainId || undefined,
        query: query.trim(),
        userId,
        orgId,
        requiredAccess: 'query',
        limit: Number(input.limit ?? 15),
        ...this.temporalSearchInput(input),
      })
      return {
        success: true,
        query: query.trim(),
        brain_id: retrieved.results[0]?.brain_id ?? (explicitBrainId || null),
        count: retrieved.count,
        context_sufficient: retrieved.context_sufficient,
        missing: retrieved.missing,
        suggested_next_queries: retrieved.suggested_next_queries,
        sufficiency: retrieved.sufficiency,
        results: retrieved.results.map((candidate) => ({
          id: candidate.id,
          brain_id: candidate.brain_id,
          family: candidate.family,
          kind: candidate.kind,
          title: candidate.title,
          snippet: candidate.snippet,
          source: candidate.kind,
          content: candidate.content,
          type: candidate.kind,
          significance: Number(candidate.metadata.significance ?? 0),
          similarity: candidate.scores.final,
          memory_id: candidate.id,
          source_type: candidate.source_type,
          source_id: candidate.source_id,
          source_title: candidate.source_title,
          scores: candidate.scores,
          match_reasons: candidate.match_reasons,
          evidence_refs: candidate.evidence_refs,
          related: candidate.related,
          temporal: candidate.temporal,
          metadata: candidate.metadata,
        })),
      }
    }
    if (explicitBrainId) {
      const access = await this.assertCanAccessBrain(
        target,
        userId,
        explicitBrainId,
        'query',
        sessionKey,
      )
      if (access) return access
    }
    const queryEmbedding = await target.embeddingService.getEmbedding(query.trim(), {
      billing: { userId, orgId },
    })
    if (!queryEmbedding) {
      return { success: false, error: 'Failed to generate search embedding' }
    }

    const memoryResults = await target.memoriesRepo.search(target.serviceClient, queryEmbedding, {
      limit: 10,
      threshold: 0.4,
      ...(explicitBrainId ? { brain_id: explicitBrainId } : { owner_id: userId }),
    })
    const brainId = explicitBrainId || (await this.resolveBrainId(target, userId))
    const { data: snapshotResults } = await this.repository.findSimilarSnapshots(
      target.serviceClient,
      { embedding: queryEmbedding, brainId, limit: 10 },
    )

    const snapshotIds = (snapshotResults ?? []).map((r: { id: string }) => r.id)
    const snapshotScoreMap = new Map<string, number>(
      (snapshotResults ?? []).map((r: { id: string; similarity: number }) => [
        r.id,
        Number(r.similarity ?? 0),
      ]),
    )
    let snapshotDetails: Array<Record<string, unknown>> = []
    if (snapshotIds.length > 0) {
      const { data } = await this.repository.findSnapshotsByIds(target.serviceClient, snapshotIds)
      snapshotDetails = (data ?? []) as Array<Record<string, unknown>>
    }

    const results: Array<{
      source: string
      content: string
      type: string
      significance: number
      similarity: number
    }> = []

    for (const m of memoryResults) {
      results.push({
        source: 'memory',
        content: m.content as string,
        type: m.memory_type as string,
        significance: Number(m.significance ?? 0),
        similarity: Number(m.similarity ?? 0),
      })
    }
    for (const s of snapshotDetails) {
      results.push({
        source: 'snapshot',
        content: `${s.name}: ${s.core}`,
        type: s.type as string,
        significance: Number(s.significance_score ?? 0),
        similarity: snapshotScoreMap.get(s.id as string) ?? 0,
      })
    }

    results.sort((a, b) => b.similarity - a.similarity)
    const top = results.slice(0, 15)

    return {
      success: true,
      query: query.trim(),
      brain_id: brainId,
      count: top.length,
      results: top,
    }
  }

  private temporalSearchInput(input: Record<string, unknown>): Record<string, unknown> {
    const timeMode = typeof input.time_mode === 'string' ? input.time_mode.trim() : ''
    const asOf = typeof input.as_of === 'string' ? input.as_of.trim() : ''
    const occurredFrom = typeof input.occurred_from === 'string' ? input.occurred_from.trim() : ''
    const occurredTo = typeof input.occurred_to === 'string' ? input.occurred_to.trim() : ''
    return {
      ...(timeMode ? { time_mode: timeMode } : {}),
      ...(asOf ? { as_of: asOf } : {}),
      ...(occurredFrom ? { occurred_from: occurredFrom } : {}),
      ...(occurredTo ? { occurred_to: occurredTo } : {}),
      ...(typeof input.include_historical === 'boolean'
        ? { include_historical: input.include_historical }
        : {}),
    }
  }

  private async resolveBrainId(target: Record<string, any>, userId: string): Promise<string> {
    const { data } = await this.repository.findDefaultBrain(target.serviceClient, userId)
    if (data?.[0]?.id) return data[0].id
    const { data: created, error } = await this.repository.createDefaultBrain(
      target.serviceClient,
      userId,
    )
    if (error || !created) throw new Error('Could not resolve user brain')
    return created.id
  }

  private async assertCanAccessBrain(
    target: Record<string, any>,
    userId: string,
    brainId: string,
    required: 'view' | 'query' | 'train',
    sessionKey?: string,
  ): Promise<{ success: false; error: string } | null> {
    const userClient =
      typeof target.getUserClient === 'function'
        ? await target.getUserClient(userId, sessionKey as string)
        : null
    if (!userClient) return { success: false, error: 'Could not verify brain permissions' }
    const { data, error } = await this.repository.canAccessBrain(userClient, required, brainId)
    if (error)
      return { success: false, error: `Failed to verify brain permissions: ${error.message}` }
    if (data !== true) return { success: false, error: 'Insufficient brain permissions' }
    return null
  }

  private parseBrainJobTarget(
    sessionKey?: string,
  ): { targetBrain: string; brainId?: string } | null {
    if (!sessionKey?.includes('-brain-job-')) return null
    const brainMatch = sessionKey.match(/::brain:([^:]+)(?::([^:]+))?/)
    if (!brainMatch) return null
    return {
      targetBrain: brainMatch[1],
      brainId: brainMatch[2] || undefined,
    }
  }
}

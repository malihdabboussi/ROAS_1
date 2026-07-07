import { Injectable } from '@nestjs/common'
import type { BrainRetrievalCandidate } from '@vibey/api-shared'
import { BrainRetrievalRelationRepository } from '../repositories/brain-retrieval-relation.repository'
import type { BrainRetrievalExpansionInput, SearchInput } from './brain-retrieval.types'

@Injectable()
export class BrainRetrievalRelatedContextService {
  constructor(
    private readonly relationRepository: BrainRetrievalRelationRepository = new BrainRetrievalRelationRepository(),
  ) {}

  async expandRelatedContext(
    input: BrainRetrievalExpansionInput,
    candidates: BrainRetrievalCandidate[],
  ): Promise<BrainRetrievalCandidate[]> {
    const withRelated = candidates.map((candidate) => ({
      ...candidate,
      related: [...candidate.related],
    }))

    if (input.family === 'company') {
      await this.attachCompanyObjectEdges(input, withRelated)
      return withRelated
    }

    await this.attachMemoryConnections(input, withRelated)
    await this.attachBeliefRelations(input, withRelated)
    return withRelated
  }

  private async attachMemoryConnections(
    input: SearchInput & Pick<BrainRetrievalExpansionInput, 'brain'>,
    candidates: BrainRetrievalCandidate[],
  ): Promise<void> {
    const memoryIds = candidates
      .filter((candidate) => candidate.kind === 'memory')
      .map((candidate) => candidate.id)
    if (memoryIds.length === 0) return

    const [source, target] = await Promise.all([
      this.relationRepository.listMemoryConnectionsBySourceIds(input.supabase, memoryIds),
      this.relationRepository.listMemoryConnectionsByTargetIds(input.supabase, memoryIds),
    ])
    if (source.error || target.error) return

    const connections = [
      ...((source.data ?? []) as Array<Record<string, unknown>>),
      ...((target.data ?? []) as Array<Record<string, unknown>>),
    ]
    const relatedIds = [
      ...new Set(
        connections
          .flatMap((connection) => [
            String(connection.source_memory_id ?? ''),
            String(connection.target_memory_id ?? ''),
          ])
          .filter((id) => id && !memoryIds.includes(id)),
      ),
    ]
    const { data: relatedRows } = await this.relationRepository.listMemoryRowsByIds(
      input.supabase,
      {
        brainId: input.brain.id,
        ids: relatedIds,
      },
    )
    const titleById = new Map(candidates.map((candidate) => [candidate.id, candidate.title]))
    for (const row of (relatedRows ?? []) as Array<Record<string, unknown>>) {
      titleById.set(String(row.id), String(row.content ?? '').slice(0, 80))
    }
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))

    for (const connection of connections) {
      const sourceId = String(connection.source_memory_id ?? '')
      const targetId = String(connection.target_memory_id ?? '')
      const relation = String(connection.relationship ?? 'related_to')
      if (candidateById.has(sourceId) && titleById.has(targetId)) {
        candidateById.get(sourceId)!.related.push({
          kind: 'memory',
          id: targetId,
          relation,
          title: titleById.get(targetId)!,
        })
      }
      if (candidateById.has(targetId) && titleById.has(sourceId)) {
        candidateById.get(targetId)!.related.push({
          kind: 'memory',
          id: sourceId,
          relation,
          title: titleById.get(sourceId)!,
        })
      }
    }
  }

  private async attachBeliefRelations(
    input: SearchInput & Pick<BrainRetrievalExpansionInput, 'brain'>,
    candidates: BrainRetrievalCandidate[],
  ): Promise<void> {
    const memoryCandidates = candidates.filter((candidate) => candidate.kind === 'memory')
    const memoryIds = memoryCandidates.map((candidate) => candidate.id)
    if (memoryIds.length === 0) return

    const { data, error } =
      await this.relationRepository.listBeliefPatternRowsBySupportingMemories(input.supabase, {
        brainId: input.brain.id,
        memoryIds,
      })
    if (error) return

    for (const belief of (data ?? []) as Array<Record<string, unknown>>) {
      const supported = Array.isArray(belief.supporting_memories)
        ? (belief.supporting_memories as string[])
        : []
      for (const candidate of memoryCandidates) {
        if (!supported.includes(candidate.id)) continue
        candidate.related.push({
          kind: 'belief_pattern',
          id: String(belief.id),
          relation: 'supports_belief',
          title: String(belief.pattern_name ?? ''),
        })
      }
    }
  }

  private async attachCompanyObjectEdges(
    input: SearchInput & Pick<BrainRetrievalExpansionInput, 'brain'>,
    candidates: BrainRetrievalCandidate[],
  ): Promise<void> {
    const objectIds = candidates
      .filter((candidate) => candidate.kind === 'company_object')
      .map((candidate) => candidate.id)
    if (objectIds.length === 0) return

    const [source, target] = await Promise.all([
      this.relationRepository.listCompanyObjectEdgesBySourceIds(input.supabase, {
        brainId: input.brain.id,
        objectIds,
      }),
      this.relationRepository.listCompanyObjectEdgesByTargetIds(input.supabase, {
        brainId: input.brain.id,
        objectIds,
      }),
    ])
    if (source.error || target.error) return

    const edges = [
      ...((source.data ?? []) as Array<Record<string, unknown>>),
      ...((target.data ?? []) as Array<Record<string, unknown>>),
    ]
    const relatedIds = [
      ...new Set(
        edges
          .flatMap((edge) => [
            String(edge.source_object_id ?? ''),
            String(edge.target_object_id ?? ''),
          ])
          .filter((id) => id && !objectIds.includes(id)),
      ),
    ]
    const { data: relatedRows } = await this.relationRepository.listCompanyObjectRowsByIds(
      input.supabase,
      {
        brainId: input.brain.id,
        ids: relatedIds,
      },
    )
    const titleById = new Map(candidates.map((candidate) => [candidate.id, candidate.title]))
    for (const row of (relatedRows ?? []) as Array<Record<string, unknown>>) {
      titleById.set(String(row.id), String(row.title ?? ''))
    }
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))

    for (const edge of edges) {
      const sourceId = String(edge.source_object_id ?? '')
      const targetId = String(edge.target_object_id ?? '')
      const relation = String(edge.relation_type ?? 'related')
      if (candidateById.has(sourceId) && titleById.has(targetId)) {
        candidateById.get(sourceId)!.related.push({
          kind: 'company_object',
          id: targetId,
          relation,
          title: titleById.get(targetId)!,
        })
      }
      if (candidateById.has(targetId) && titleById.has(sourceId)) {
        candidateById.get(targetId)!.related.push({
          kind: 'company_object',
          id: sourceId,
          relation,
          title: titleById.get(sourceId)!,
        })
      }
    }
  }
}

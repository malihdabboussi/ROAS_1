import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SpacesRetrievalRepository,
  type SpaceSemanticEdgeRow,
} from '../repositories/spaces-retrieval.repository'
import type {
  SpaceRetrievalCandidate,
  SpaceRetrievalSearchInput,
  SpaceSemanticEdgeClass,
} from '../types/space-retrieval.types'

@Injectable()
export class SpaceGraphExpansionService {
  constructor(private readonly repository: SpacesRetrievalRepository = new SpacesRetrievalRepository()) {}

  async expandCandidates(
    supabase: SupabaseClient,
    input: SpaceRetrievalSearchInput,
    seeds: SpaceRetrievalCandidate[],
    limit: number,
  ): Promise<SpaceRetrievalCandidate[]> {
    const depth = input.graphDepth ?? (input.expandGraph ? 1 : 0)
    if (!input.expandGraph && depth === 0) return seeds
    if (depth === 0 || seeds.length === 0) return seeds

    const candidates = new Map(seeds.map((candidate) => [candidate.id, candidate]))
    const seenObjectIds = new Set(
      seeds.map((candidate) => candidate.space_object_id).filter(Boolean),
    )
    let frontier = [...seenObjectIds]

    for (let hop = 1; hop <= depth && frontier.length > 0; hop += 1) {
      const edges = await this.loadEdges(supabase, input, frontier)
      const relatedObjectIds = [
        ...new Set(
          edges
            .flatMap((edge) => [edge.from_object_id, edge.to_object_id])
            .filter((id) => id && !seenObjectIds.has(id)),
        ),
      ]
      if (relatedObjectIds.length === 0) break

      const rows = await this.loadChunks(supabase, input, relatedObjectIds, limit)
      const edgeByObjectId = this.edgeByObjectId(edges, frontier)
      for (const row of rows) {
        const candidate = this.candidateFromGraphRow(row, edgeByObjectId, hop)
        if (!candidate || candidates.has(candidate.id)) continue
        candidates.set(candidate.id, candidate)
        seenObjectIds.add(candidate.space_object_id)
      }
      frontier = relatedObjectIds.filter((id) => seenObjectIds.has(id))
    }

    return [...candidates.values()].sort((a, b) => b.scores.final - a.scores.final).slice(0, limit)
  }

  private async loadEdges(
    supabase: SupabaseClient,
    input: SpaceRetrievalSearchInput,
    objectIds: string[],
  ): Promise<SpaceSemanticEdgeRow[]> {
    const edgeClasses: SpaceSemanticEdgeClass[] = input.edgeClasses?.length
      ? input.edgeClasses
      : ['structural']
    const [outgoing, incoming] = await Promise.all([
      this.edgeQuery(supabase, input, 'from_object_id', objectIds, edgeClasses),
      this.edgeQuery(supabase, input, 'to_object_id', objectIds, edgeClasses),
    ])
    const byId = new Map<string, SpaceSemanticEdgeRow>()
    for (const edge of [...outgoing, ...incoming]) byId.set(edge.id, edge)
    return [...byId.values()]
  }

  private async edgeQuery(
    supabase: SupabaseClient,
    input: SpaceRetrievalSearchInput,
    column: 'from_object_id' | 'to_object_id',
    objectIds: string[],
    edgeClasses: SpaceSemanticEdgeClass[],
  ): Promise<SpaceSemanticEdgeRow[]> {
    return this.repository.listEdgesByObjectColumn(supabase, {
      column,
      objectIds,
      edgeClasses,
      edgeTypes: input.edgeTypes,
      spaceId:
        input.spaceId && (input.mode ?? 'current_space') === 'current_space'
          ? input.spaceId
          : null,
      campaignId: input.mode === 'space_plus_related' ? (input.campaignId ?? null) : null,
    })
  }

  private async loadChunks(
    supabase: SupabaseClient,
    input: SpaceRetrievalSearchInput,
    objectIds: string[],
    limit: number,
  ): Promise<Array<Record<string, unknown>>> {
    return this.repository.listChunksByObjectIds(supabase, {
      objectIds,
      limit,
      sourceTypes: input.sourceTypes,
    })
  }

  private edgeByObjectId(
    edges: SpaceSemanticEdgeRow[],
    frontier: string[],
  ): Map<string, SpaceSemanticEdgeRow> {
    const frontierSet = new Set(frontier)
    const out = new Map<string, SpaceSemanticEdgeRow>()
    for (const edge of edges) {
      if (frontierSet.has(edge.from_object_id)) out.set(edge.to_object_id, edge)
      if (frontierSet.has(edge.to_object_id)) out.set(edge.from_object_id, edge)
    }
    return out
  }

  private candidateFromGraphRow(
    row: Record<string, unknown>,
    edgeByObjectId: Map<string, SpaceSemanticEdgeRow>,
    hop: number,
  ): SpaceRetrievalCandidate | null {
    const objectId = String(row.space_object_id ?? '')
    if (!objectId) return null
    const edge = edgeByObjectId.get(objectId)
    const graphScore = Math.max(0.1, (Number(edge?.strength ?? 0.7) * 0.85) / hop)
    const metadata = this.record(row.metadata) ?? {}
    return {
      id: String(row.id),
      space_object_id: objectId,
      source_type: String(row.source_type ?? 'space_doc') as SpaceRetrievalCandidate['source_type'],
      source_id: String(row.source_id ?? ''),
      source_title: (row.source_title as string | null) ?? null,
      title: String(row.title ?? row.source_title ?? 'Space graph evidence'),
      content: String(row.content ?? ''),
      snippet: String(row.content ?? '').slice(0, 240),
      user_id: String(row.user_id ?? ''),
      org_id: (row.org_id as string | null) ?? null,
      space_id: (row.space_id as string | null) ?? null,
      campaign_id: (row.campaign_id as string | null) ?? null,
      metadata: {
        ...metadata,
        graph_via: edge
          ? {
              edge_id: edge.id,
              edge_type: edge.edge_type,
              edge_class: edge.edge_class,
              reason: edge.reason,
              hop,
            }
          : null,
      },
      retrieve_via: this.record(metadata.retrieve_via) as SpaceRetrievalCandidate['retrieve_via'],
      lane: String(row.source_type ?? 'space_doc') as SpaceRetrievalCandidate['lane'],
      scores: {
        graph: graphScore,
        final: graphScore,
      },
      match_reasons: [
        edge?.reason ?? `Expanded through ${edge?.edge_type ?? 'Space graph'} relationship`,
      ],
    }
  }

  private record(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  }
}

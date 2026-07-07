import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SpacesRetrievalRepository,
  type SpaceSemanticObjectRef,
} from '../repositories/spaces-retrieval.repository'
import type { SpaceSemanticEdgeInput } from '../types/space-retrieval.types'

@Injectable()
export class SpaceSemanticEdgeWriterService {
  constructor(private readonly repository: SpacesRetrievalRepository = new SpacesRetrievalRepository()) {}

  async replaceStructuralEdgesForSource(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
    edges: SpaceSemanticEdgeInput[],
  ): Promise<{ written: number }> {
    await this.softDeleteStructuralEdgesForSource(supabase, sourceType, sourceId)
    return this.insertEdges(
      supabase,
      edges.map((edge) => ({ ...edge, edgeClass: 'structural' })),
    )
  }

  async insertEdges(
    supabase: SupabaseClient,
    edges: SpaceSemanticEdgeInput[],
  ): Promise<{ written: number }> {
    let written = 0
    for (const edge of this.dedupe(edges)) {
      const from = await this.loadObject(supabase, edge.fromSourceType, edge.fromSourceId)
      const to = await this.loadObject(supabase, edge.toSourceType, edge.toSourceId)
      if (!from || !to || from.id === to.id) continue

      const scope = to.space_id || to.campaign_id ? to : from
      await this.repository.insertSemanticEdge(supabase, {
        scope_type: scope.scope_type,
        user_id: scope.user_id,
        org_id: scope.org_id,
        space_id: scope.space_id,
        campaign_id: scope.campaign_id,
        from_object_id: from.id,
        to_object_id: to.id,
        from_source_type: from.source_type,
        from_source_id: from.source_id,
        to_source_type: to.source_type,
        to_source_id: to.source_id,
        edge_type: edge.edgeType,
        edge_class: edge.edgeClass ?? 'structural',
        confidence: edge.confidence ?? 1,
        strength: edge.strength ?? 1,
        reason: edge.reason ?? null,
        evidence: edge.evidence ?? [],
        metadata: edge.metadata ?? {},
        created_by: edge.createdBy ?? 'system',
      })
      written += 1
    }
    return { written }
  }

  async deleteEdgesForSource(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<void> {
    await this.softDeleteStructuralEdgesForSource(supabase, sourceType, sourceId)
  }

  private async softDeleteStructuralEdgesForSource(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<void> {
    await this.repository.softDeleteStructuralEdgesForSource(supabase, sourceType, sourceId, 'from')
    await this.repository.softDeleteStructuralEdgesForSource(supabase, sourceType, sourceId, 'to')
  }

  private async loadObject(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<SpaceSemanticObjectRef | null> {
    return this.repository.findSemanticObjectRef(supabase, sourceType, sourceId)
  }

  private dedupe(edges: SpaceSemanticEdgeInput[]): SpaceSemanticEdgeInput[] {
    const seen = new Set<string>()
    const out: SpaceSemanticEdgeInput[] = []
    for (const edge of edges) {
      const key = [
        edge.fromSourceType,
        edge.fromSourceId,
        edge.toSourceType,
        edge.toSourceId,
        edge.edgeType,
      ].join(':')
      if (seen.has(key)) continue
      seen.add(key)
      out.push(edge)
    }
    return out
  }
}

import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceRetrievalRepository } from '../repositories/space-retrieval.repository'
import type { SpaceSemanticEdgeInput } from '../space-semantic-edge.types'

type SemanticObjectRef = {
  id: string
  scope_type: string
  user_id: string
  org_id: string | null
  space_id: string | null
  campaign_id: string | null
  source_type: string
  source_id: string
}

@Injectable()
export class SpaceSemanticEdgeWriterService {
  constructor(private readonly repository: SpaceRetrievalRepository) {}

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

      const { error } = await this.repository.insertSemanticEdge(
        supabase,
        this.repository.edgeInsertPayload(edge, from, to),
      )
      if (error) throw new Error(`Failed to insert Space semantic edge: ${error.message}`)
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
    const patch = { deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const fromResult = await this.repository.softDeleteStructuralEdgesForSource(
      supabase,
      'from',
      sourceType,
      sourceId,
      patch,
    )
    if (fromResult.error)
      throw new Error(`Failed to delete outgoing Space semantic edges: ${fromResult.error.message}`)

    const toResult = await this.repository.softDeleteStructuralEdgesForSource(
      supabase,
      'to',
      sourceType,
      sourceId,
      patch,
    )
    if (toResult.error)
      throw new Error(`Failed to delete incoming Space semantic edges: ${toResult.error.message}`)
  }

  private async loadObject(
    supabase: SupabaseClient,
    sourceType: string,
    sourceId: string,
  ): Promise<SemanticObjectRef | null> {
    const { data, error } = await this.repository.loadSemanticObjectRef(
      supabase,
      sourceType,
      sourceId,
    )
    if (error) throw new Error(`Failed to resolve Space semantic object: ${error.message}`)
    return (data as SemanticObjectRef | null) ?? null
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

import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type MissionDeliverableEvidenceRow = {
  id: string
  title: string | null
  type: string | null
  content: string | null
  content_json: unknown
  file_url: string | null
  entity_id: string | null
  entity_table: string | null
}

type SpaceDocumentRow = {
  id: string
  doc_body: string | null
}

export type MissionQualityEvidence = {
  deliverableId: string
  title: string
  type: string
  content: string
}

export function resolveMissionQualityEvidenceRows(
  deliverables: MissionDeliverableEvidenceRow[],
  spaceDocuments: SpaceDocumentRow[],
): MissionQualityEvidence[] {
  const documentContentById = new Map(
    spaceDocuments.map((document) => [document.id, document.doc_body?.trim() || '']),
  )

  return deliverables.map((deliverable) => {
    const canonicalDocument =
      deliverable.entity_table === 'space_items' && deliverable.entity_id
        ? documentContentById.get(deliverable.entity_id) || ''
        : ''
    const snapshot = deliverable.content?.trim() || ''
    const jsonContent =
      deliverable.content_json && typeof deliverable.content_json === 'object'
        ? JSON.stringify(deliverable.content_json, null, 2)
        : ''
    const fileReference = deliverable.file_url ? `File URL: ${deliverable.file_url}` : ''

    return {
      deliverableId: String(deliverable.id),
      title: String(deliverable.title || 'Untitled deliverable'),
      type: String(deliverable.type || 'artifact'),
      content:
        canonicalDocument || snapshot || jsonContent || fileReference || '(content unavailable)',
    }
  })
}

@Injectable()
export class MissionQualityEvidenceRepository {
  async listForMission(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<MissionQualityEvidence[]> {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('id, title, type, content, content_json, file_url, entity_id, entity_table')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: true })
    if (error) throw error

    const deliverables = (data || []) as MissionDeliverableEvidenceRow[]
    const spaceItemIds = [
      ...new Set(
        deliverables
          .filter((row) => row.entity_table === 'space_items' && row.entity_id)
          .map((row) => String(row.entity_id)),
      ),
    ]
    let spaceDocuments: SpaceDocumentRow[] = []
    if (spaceItemIds.length > 0) {
      const { data: documents, error: documentsError } = await supabase
        .from('space_items')
        .select('id, doc_body')
        .in('id', spaceItemIds)
      if (documentsError) throw documentsError
      spaceDocuments = (documents || []) as SpaceDocumentRow[]
    }

    return resolveMissionQualityEvidenceRows(deliverables, spaceDocuments)
  }
}

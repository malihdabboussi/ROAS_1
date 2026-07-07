export const SPACE_SEMANTIC_EDGE_TYPES = [
  'contains_view',
  'contains_item',
  'contains_doc',
  'contains_task',
  'contains_activity',
  'contains_deliverable',
  'contains_artifact',
  'has_subtask',
  'has_deliverable',
  'has_page',
  'has_email',
  'uses_media',
  'contains_ad_set',
  'contains_ad',
] as const

export type SpaceSemanticEdgeType = (typeof SPACE_SEMANTIC_EDGE_TYPES)[number]

export type SpaceSemanticEdgeClass = 'structural' | 'inferred'

export interface SpaceSemanticEdgeInput {
  fromSourceType: string
  fromSourceId: string
  toSourceType: string
  toSourceId: string
  edgeType: SpaceSemanticEdgeType
  edgeClass?: SpaceSemanticEdgeClass
  confidence?: number
  strength?: number
  reason?: string | null
  evidence?: unknown[]
  metadata?: Record<string, unknown>
  createdBy?: string
}

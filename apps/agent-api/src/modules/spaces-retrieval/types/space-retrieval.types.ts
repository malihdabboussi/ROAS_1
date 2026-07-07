export const SPACE_SEMANTIC_SOURCE_TYPES = [
  'space',
  'space_view',
  'space_doc',
  'space_task',
  'space_activity',
  'space_deliverable',
  'instagram_research_item',
  'tiktok_research_item',
  'youtube_research_item',
  'twitter_research_item',
  'mission',
  'mission_subtask',
  'mission_deliverable',
  'conversation_document',
  'contact',
  'channel',
  'channel_message',
  'media_asset',
  'funnel',
  'funnel_page',
  'form',
  'form_response',
  'offer',
  'email',
  'sequence',
  'sequence_email',
  'presentation',
  'avatar',
  'social_post',
  'ad_campaign',
  'ad_set',
  'ad',
  'blog_post',
  'campaign_overview_snapshot',
  'social_reporting_snapshot',
  'funnel_analytics_snapshot',
  'email_analytics_snapshot',
  'ads_performance_snapshot',
  'finance_overview_snapshot',
] as const

export type SpaceSemanticSourceType = (typeof SPACE_SEMANTIC_SOURCE_TYPES)[number]

export type SpaceRetrievalMode = 'current_space' | 'space_plus_related' | 'all_accessible'

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

export interface SpaceRetrieveVia {
  action: string
  data: Record<string, unknown>
}

export interface SpaceSemanticAsset {
  sourceType: SpaceSemanticSourceType
  sourceId: string
  title: string
  summary?: string
  content: string
  userId: string
  orgId?: string | null
  spaceId?: string | null
  campaignId?: string | null
  parentType?: string | null
  parentId?: string | null
  sourceUpdatedAt?: string | null
  metadata?: Record<string, unknown>
  retrieveVia?: SpaceRetrieveVia
}

export interface SpaceAssetIndexInput {
  sourceType: SpaceSemanticSourceType
  sourceId: string
  userId: string
  orgId?: string | null
  spaceId?: string | null
  row?: Record<string, unknown>
}

export interface SpaceAssetIndexResult {
  indexed: number
  skipped: number
  source_type: SpaceSemanticSourceType
  source_id: string
}

export interface SpaceRetrievalSearchInput {
  query: string
  userId: string
  orgId?: string | null
  spaceId?: string | null
  campaignId?: string | null
  mode?: SpaceRetrievalMode
  sourceTypes?: SpaceSemanticSourceType[]
  limit?: number
  expandGraph?: boolean
  graphDepth?: 0 | 1 | 2
  edgeTypes?: SpaceSemanticEdgeType[]
  edgeClasses?: SpaceSemanticEdgeClass[]
}

export interface SpaceRetrievalCandidate {
  id: string
  space_object_id: string
  source_type: SpaceSemanticSourceType
  source_id: string
  source_title: string | null
  title: string
  content: string
  snippet: string
  user_id: string
  org_id: string | null
  space_id: string | null
  campaign_id: string | null
  metadata: Record<string, unknown>
  retrieve_via: SpaceRetrieveVia | null
  lane: SpaceSemanticSourceType
  scores: {
    semantic?: number
    lexical?: number
    graph?: number
    rerank?: number
    final: number
  }
  match_reasons: string[]
}

export interface SpaceRetrievalSufficiency {
  sufficient: boolean
  confidence: number
  reason: string
  missing: string[]
  suggested_next_queries: string[]
}

export interface SpaceRetrievalSearchResult {
  success: true
  query: string
  count: number
  context_sufficient: boolean
  sufficiency: SpaceRetrievalSufficiency
  missing: string[]
  suggested_next_queries: string[]
  results: SpaceRetrievalCandidate[]
}

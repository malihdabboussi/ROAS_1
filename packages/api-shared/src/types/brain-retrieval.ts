import type { BrainRetrievalTimeMode, BrainTemporalMetadata } from './brain-temporal'

export type BrainCandidateKind =
  | 'memory'
  | 'snapshot'
  | 'sk_entry'
  | 'narrative_page'
  | 'belief_pattern'
  | 'perspective'
  | 'company_object'
  | 'company_signal'
  | 'customer_avatar'
  | 'avatar_axis'
  | 'evidence_chunk'
  | 'timeline'
  | 'timeline_item'

export type BrainSearchFamily = 'user' | 'agent' | 'customer' | 'company'

export type BrainAccessLevel = 'view' | 'query' | 'train'

export type BrainAccessSource = 'owner' | 'org_baseline' | 'user_share' | 'org_share' | 'team_share'

export interface BrainRetrievalSearchInput {
  family: BrainSearchFamily
  brainId?: string
  brainIds?: string[]
  query: string
  userId: string
  orgId?: string | null
  requiredAccess: 'query'
  limit?: number
  includeKinds?: BrainCandidateKind[]
  time_mode?: BrainRetrievalTimeMode
  as_of?: string | null
  occurred_from?: string | null
  occurred_to?: string | null
  include_historical?: boolean
}

export interface BrainRetrievalCandidate {
  id: string
  brain_id: string
  brain_scope: string
  brain_owner_id: string
  org_id: string | null
  effective_access: BrainAccessLevel
  access_source: BrainAccessSource
  family: BrainSearchFamily
  kind: BrainCandidateKind
  title: string
  content: string
  snippet: string
  source_type: string | null
  source_id: string | null
  source_title: string | null
  metadata: Record<string, unknown>
  temporal: BrainTemporalMetadata
  lane?: string
  scores: {
    semantic?: number
    lexical?: number
    graph?: number
    feedback?: number
    rerank?: number
    final: number
  }
  match_reasons: string[]
  evidence_refs: Array<Record<string, unknown>>
  related: Array<{
    kind: BrainCandidateKind
    id: string
    relation: string
    title: string
  }>
}

export interface BrainSufficiencyResult {
  sufficient: boolean
  confidence: number
  reason: string
  missing: string[]
  suggested_next_queries: string[]
}

export interface BrainRetrievalSearchResult {
  success: true
  query: string
  family: BrainSearchFamily
  count: number
  context_sufficient: boolean
  sufficiency: BrainSufficiencyResult
  missing: string[]
  suggested_next_queries: string[]
  results: BrainRetrievalCandidate[]
}

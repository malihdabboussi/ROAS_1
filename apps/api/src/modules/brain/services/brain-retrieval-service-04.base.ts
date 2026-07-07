import { BrainRetrievalServiceBase03 } from './brain-retrieval-service-03.base'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BrainAccessSource,
  BrainCandidateKind,
  BrainRetrievalCandidate,
  BrainRetrievalSearchInput,
  BrainRetrievalSearchResult,
  BrainSearchFamily,
  OrgRole,
} from '@vibey/api-shared'
import { BrainPermissionsService } from './brain-permissions.service'
import { BrainRerankerService } from './brain-reranker.service'
import { BrainSufficiencyService } from './brain-sufficiency.service'
import { EmbeddingService } from './embedding.service'

type BrainRow = {
  id: string
  owner_id: string
  org_id: string | null
  scope: string
  agent_id: string | null
  created_by: string | null
}

type SearchInput = BrainRetrievalSearchInput & {
  agentKey?: string
  orgRole?: string | null
}

type AccessMetadata = {
  effective_access: 'query' | 'train'
  access_source: BrainAccessSource
}

const SNAPSHOT_GRAPH_MAX_DEPTH = 2
const SNAPSHOT_GRAPH_MIN_STRENGTH = 0.3
const SNAPSHOT_SEMANTIC_WEIGHT = 0.7
const SNAPSHOT_GRAPH_WEIGHT = 0.3
const RRF_K = 60
const RRF_SCORE_SCALE = 30

export abstract class BrainRetrievalServiceBase04 extends BrainRetrievalServiceBase03 {

  protected importantQueryTerms(query: string): string[] {
    const stopwords = new Set([
      'what',
      'which',
      'where',
      'when',
      'does',
      'should',
      'would',
      'could',
      'about',
      'agent',
      'brain',
      'rule',
      'say',
      'says',
      'many',
      'much',
      'know',
      'knows',
      'before',
      'after',
      'enough',
    ])
    return [
      ...new Set(
        query
          .toLowerCase()
          .split(/[^a-z0-9_-]+/)
          .map((term) => term.trim())
          .filter((term) => term.length >= 3 && !stopwords.has(term)),
      ),
    ].slice(0, 8)
  }
}

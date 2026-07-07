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
import { BrainRetrievalArtifactsRepository } from '../repositories/brain-retrieval-artifacts.repository'
import { BrainRetrievalRepository } from '../repositories/brain-retrieval.repository'
import { BrainPermissionsService } from './brain-permissions.service'
import { BrainRerankerService } from './brain-reranker.service'
import { BrainRetrievalServiceBase04 } from './brain-retrieval-service-04.base'
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

@Injectable()
export class BrainRetrievalService extends BrainRetrievalServiceBase04 {
  constructor(
    brainPermissions: BrainPermissionsService,
    embedding: EmbeddingService,
    reranker: BrainRerankerService,
    sufficiency: BrainSufficiencyService,
    retrievalRepository: BrainRetrievalRepository,
    retrievalArtifactsRepository: BrainRetrievalArtifactsRepository,
  ) {
    super(
      brainPermissions,
      embedding,
      reranker,
      sufficiency,
      retrievalRepository,
      retrievalArtifactsRepository,
    )
  }
}

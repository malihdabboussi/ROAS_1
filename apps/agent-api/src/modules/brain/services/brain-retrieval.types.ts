import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BrainAccessSource,
  BrainRetrievalSearchInput,
} from '@vibey/api-shared'
import type { BrainRetrievalBrainRow } from '../repositories/brain-retrieval-access.repository'

export type BrainRow = BrainRetrievalBrainRow

export type SearchEmbeddingInput = number[] | null | Promise<number[] | null>

export type SearchInput = BrainRetrievalSearchInput & {
  agentKey?: string
  embedding?: SearchEmbeddingInput
  supabase: SupabaseClient
  userClient: SupabaseClient
}

export type AccessMetadata = {
  effective_access: 'query' | 'train'
  access_source: BrainAccessSource
}

export type BrainRetrievalLaneSearchInput = SearchInput & {
  query: string
  limit: number
  candidateLimit: number
  brain: BrainRow
  accessMetadata: AccessMetadata
  embedding: number[] | null
}

export type BrainRetrievalExpansionInput = SearchInput & {
  query: string
  limit: number
  candidateLimit: number
  brain: BrainRow
  accessMetadata: AccessMetadata
}

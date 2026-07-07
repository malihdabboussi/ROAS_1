import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string; code?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null; count?: number | null }

export type BrainScopeRow = {
  id: string
  scope: string
  owner_id?: string | null
  org_id: string | null
  agent_id: string | null
  campaign_id?: string | null
  is_default?: boolean | null
  cortex_max?: boolean | null
}

@Injectable()
export class ArtifactBrainScholarRepository {
  async listBrainsByIds(
    serviceClient: SupabaseClient,
    brainIds: string[],
  ): Promise<QueryListResult<BrainScopeRow>> {
    return (await serviceClient
      .from('ns_brains')
      .select('id, scope, org_id, agent_id')
      .in('id', brainIds)) as QueryListResult<BrainScopeRow>
  }

  async listPersonalBrains(
    serviceClient: SupabaseClient,
    userId: string,
  ): Promise<QueryListResult<BrainScopeRow>> {
    return (await serviceClient
      .from('ns_brains')
      .select('id, scope, org_id, agent_id')
      .eq('owner_id', userId)
      .is('org_id', null)) as QueryListResult<BrainScopeRow>
  }

  async listOrgBrains(
    serviceClient: SupabaseClient,
    orgId: string,
  ): Promise<QueryListResult<BrainScopeRow>> {
    return (await serviceClient
      .from('ns_brains')
      .select('id, scope, org_id, agent_id')
      .eq('org_id', orgId)) as QueryListResult<BrainScopeRow>
  }

  async searchSkEntries(
    serviceClient: SupabaseClient,
    input: {
      brainId: string
      queryEmbedding: string
      matchCount: number
      domain: string | null
    },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await serviceClient.rpc('search_sk_entries', {
      p_brain_id: input.brainId,
      p_query_embedding: input.queryEmbedding,
      p_match_threshold: 0.5,
      p_match_count: input.matchCount,
      p_domain: input.domain,
      p_min_mastery: 0,
    })) as QueryListResult<Record<string, unknown>>
  }

  async countMemories(
    serviceClient: SupabaseClient,
    brainId: string,
  ): Promise<QueryListResult<{ id: string }>> {
    return (await serviceClient
      .from('ns_memories')
      .select('id', { count: 'exact', head: true })
      .eq('brain_id', brainId)) as QueryListResult<{ id: string }>
  }

  async listSkDomainsForStats(
    serviceClient: SupabaseClient,
    brainId: string,
  ): Promise<QueryListResult<{ domain: string | null }>> {
    return (await serviceClient
      .from('ns_sk_entries')
      .select('domain', { count: 'exact' })
      .eq('brain_id', brainId)
      .limit(500)) as QueryListResult<{ domain: string | null }>
  }

  async listBrainScopes(
    serviceClient: SupabaseClient,
    userId: string,
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await serviceClient
      .from('ns_brains')
      .select('id, name, is_default, agent_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })) as QueryListResult<Record<string, unknown>>
  }

  async findAgentBrain(
    serviceClient: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ): Promise<QueryResult<{ id: string }>> {
    let query = serviceClient
      .from('ns_brains')
      .select('id')
      .eq('owner_id', input.userId)
      .eq('agent_id', input.agentKey)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    return (await query.maybeSingle()) as QueryResult<{ id: string }>
  }

  async listRecentMemories(
    serviceClient: SupabaseClient,
    input: { brainId: string; limit: number },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await serviceClient
      .from('ns_memories')
      .select(
        'id, content, memory_type, source_type, source_title, confidence, significance, tags, created_at',
      )
      .eq('brain_id', input.brainId)
      .order('created_at', { ascending: false })
      .limit(input.limit)) as QueryListResult<Record<string, unknown>>
  }

  async listBrainDomains(
    serviceClient: SupabaseClient,
    brainId: string,
  ): Promise<QueryListResult<{ domain: string | null }>> {
    return (await serviceClient
      .from('ns_sk_entries')
      .select('domain')
      .eq('brain_id', brainId)
      .limit(1000)) as QueryListResult<{ domain: string | null }>
  }

  async listBrainGaps(
    serviceClient: SupabaseClient,
    brainId: string,
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await serviceClient
      .from('ns_sk_gaps')
      .select('id, domain, description, detected_from, severity, status, created_at')
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(50)) as QueryListResult<Record<string, unknown>>
  }

  async listBrainImports(
    serviceClient: SupabaseClient,
    input: { brainId: string; source: string; limit: number },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = serviceClient
      .from('ns_memory_sessions')
      .select(
        'session_key, memories_created, last_processed_at, skipped_reason, created_at, brain_id',
      )
      .eq('brain_id', input.brainId)
      .order('last_processed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(input.limit)
    if (input.source === 'fathom') query = query.ilike('session_key', 'fathom:%')
    else if (input.source === 'fireflies') query = query.ilike('session_key', 'fireflies:%')
    return (await query) as QueryListResult<Record<string, unknown>>
  }

  async findDefaultUserBrain(
    serviceClient: SupabaseClient,
    userId: string,
  ): Promise<QueryListResult<{ id: string }>> {
    return (await serviceClient
      .from('ns_brains')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)) as QueryListResult<{ id: string }>
  }

  async createDefaultUserBrain(
    serviceClient: SupabaseClient,
    userId: string,
  ): Promise<{ data: { id: string } | null; error: QueryError | null }> {
    return (await serviceClient
      .from('ns_brains')
      .insert({
        owner_id: userId,
        org_id: null,
        name: 'Default Brain',
        is_default: true,
        scope: 'user',
        color: '#8B85C8',
        icon: 'brain',
        tags: [],
      })
      .select('id')
      .single()) as { data: { id: string } | null; error: QueryError | null }
  }

  async canAccessBrain(
    userClient: SupabaseClient,
    input: { brainId: string; required: 'view' | 'query' | 'train' },
  ): Promise<QueryResult<boolean>> {
    return (await userClient.rpc('can_access_brain', {
      p_brain_id: input.brainId,
      p_min_level: input.required,
    })) as QueryResult<boolean>
  }

  async findBrainForAccess(
    serviceClient: SupabaseClient,
    brainId: string,
  ): Promise<QueryResult<BrainScopeRow>> {
    return (await serviceClient
      .from('ns_brains')
      .select('owner_id, org_id, scope')
      .eq('id', brainId)
      .single()) as QueryResult<BrainScopeRow>
  }

  async findBrainForCognition(
    serviceClient: SupabaseClient,
    brainId: string,
  ): Promise<QueryResult<BrainScopeRow>> {
    return (await serviceClient
      .from('ns_brains')
      .select('id, is_default, scope, agent_id, campaign_id')
      .eq('id', brainId)
      .single()) as QueryResult<BrainScopeRow>
  }

  async findBrainDirInfo(
    serviceClient: SupabaseClient,
    brainId: string,
  ): Promise<QueryResult<{ agent_id?: string | null; campaign_id?: string | null }>> {
    return (await serviceClient
      .from('ns_brains')
      .select('agent_id, campaign_id, is_default')
      .eq('id', brainId)
      .single()) as QueryResult<{ agent_id?: string | null; campaign_id?: string | null }>
  }
}

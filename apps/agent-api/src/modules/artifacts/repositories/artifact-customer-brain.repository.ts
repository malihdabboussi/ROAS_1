import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactCustomerBrainRepository {
  async findCustomerBrain(
    supabase: SupabaseClient,
    input: { brainId?: string; userId: string; orgId: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('ns_brains')
      .select('id, owner_id, org_id, scope')
      .eq('scope', 'customer')

    if (input.brainId) {
      query = query.eq('id', input.brainId)
    } else if (input.orgId) {
      query = query.eq('org_id', input.orgId)
    } else {
      query = query.eq('owner_id', input.userId).is('org_id', null)
    }

    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async canAccessBrain(
    supabase: SupabaseClient,
    input: { brainId: string; required: 'view' | 'query' | 'train' },
  ): Promise<{ data: boolean | null; error: QueryError | null }> {
    return (await supabase.rpc('can_access_brain', {
      p_brain_id: input.brainId,
      p_min_level: input.required,
    })) as { data: boolean | null; error: QueryError | null }
  }

  async findContact(
    supabase: SupabaseClient,
    input: { contactId: string; userId: string; orgId: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('contacts').select('id, user_id, org_id').eq('id', input.contactId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async createMemory(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('ns_memories').insert(payload).select('id').single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async upsertCustomerEntity(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('customer_entities')
      .upsert(payload, { onConflict: 'brain_id,entity_key' })
      .select('id')
      .single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async upsertCustomerSourceIdentity(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('customer_source_identities')
      .upsert(payload, { onConflict: 'brain_id,source_type,source_id' })
      .select('id')
      .single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async searchMemories(
    supabase: SupabaseClient,
    input: { brainId: string; pattern: string; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('ns_memories')
      .select(
        'id, content, memory_type, source_type, source_title, contact_id, customer_entity_id, customer_source_identity_id, customer_resolution_status, significance, tags, created_at, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', input.brainId)
      .ilike('content', input.pattern)
      .order('created_at', { ascending: false })
      .limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listMemories(
    supabase: SupabaseClient,
    input: { brainId: string; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('ns_memories')
      .select(
        'id, content, memory_type, source_type, source_title, contact_id, customer_entity_id, customer_source_identity_id, customer_resolution_status, significance, tags, created_at, episode_id, occurred_at, occurred_until, asserted_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', input.brainId)
      .order('created_at', { ascending: false })
      .limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listAvatars(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('customer_avatars')
      .select('*')
      .eq('brain_id', brainId)
      .order('updated_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }
}

import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type BrainRetrievalBrainRow = {
  id: string
  owner_id: string
  org_id: string | null
  scope: string
  agent_id: string | null
  created_by: string | null
}

type QueryError = { message: string }
type MaybeResult<T> = { data: T | null; error: QueryError | null }
type ListResult<T> = { data: T[] | null; error: QueryError | null }

const BRAIN_COLUMNS = 'id, owner_id, org_id, scope, agent_id, created_by'

@Injectable()
export class BrainRetrievalAccessRepository {
  async findDefaultUserBrain(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<BrainRetrievalBrainRow | null> {
    // Personal default User Brains are always org_id IS NULL (see personal-vs-org.md).
    // Chat orgId must not filter them — org workspace still reads the owner's private brain.
    void input.orgId
    const { data, error } = (await supabase
      .from('ns_brains')
      .select(BRAIN_COLUMNS)
      .eq('owner_id', input.userId)
      .eq('is_default', true)
      .eq('scope', 'user')
      .is('org_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()) as MaybeResult<BrainRetrievalBrainRow>
    if (error) throw new Error(`Failed to resolve user brain: ${error.message}`)
    return data ?? null
  }

  async findAgentBrain(
    supabase: SupabaseClient,
    input: { agentKey: string; userId: string; orgId?: string | null },
  ): Promise<BrainRetrievalBrainRow | null> {
    let query = supabase.from('ns_brains').select(BRAIN_COLUMNS).eq('agent_id', input.agentKey)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.eq('owner_id', input.userId)
    const { data, error } = (await query.maybeSingle()) as MaybeResult<BrainRetrievalBrainRow>
    if (error) throw new Error(`Failed to resolve agent brain: ${error.message}`)
    return data ?? null
  }

  async findScopedBrain(
    supabase: SupabaseClient,
    input: { family: 'customer' | 'company'; userId: string; orgId?: string | null },
  ): Promise<BrainRetrievalBrainRow | null> {
    let query = supabase.from('ns_brains').select(BRAIN_COLUMNS).eq('scope', input.family)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('owner_id', input.userId).is('org_id', null)
    const { data, error } = (await query.maybeSingle()) as MaybeResult<BrainRetrievalBrainRow>
    if (error) throw new Error(`Failed to resolve ${input.family} brain: ${error.message}`)
    return data ?? null
  }

  async loadBrain(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<BrainRetrievalBrainRow | null> {
    const { data, error } = (await supabase
      .from('ns_brains')
      .select(BRAIN_COLUMNS)
      .eq('id', brainId)
      .maybeSingle()) as MaybeResult<BrainRetrievalBrainRow>
    if (error) throw new Error(`Failed to load brain: ${error.message}`)
    return data ?? null
  }

  async canQueryBrain(userClient: SupabaseClient, brainId: string): Promise<boolean> {
    const { data, error } = (await userClient.rpc('can_access_brain', {
      p_brain_id: brainId,
      p_min_level: 'query',
    })) as { data: boolean | null; error: QueryError | null }
    if (error) throw new Error(`Failed to verify brain permissions: ${error.message}`)
    return data === true
  }

  async findUserShare(
    supabase: SupabaseClient,
    input: { brainId: string; userId: string },
  ): Promise<{ id: string } | null> {
    const { data } = (await supabase
      .from('brain_shares')
      .select('id')
      .eq('brain_id', input.brainId)
      .eq('entity_type', 'user')
      .eq('entity_id', input.userId)
      .in('level', ['query', 'train'])
      .limit(1)
      .maybeSingle()) as MaybeResult<{ id: string }>
    return data ?? null
  }

  async findOrgShare(
    supabase: SupabaseClient,
    input: { brainId: string; orgId: string },
  ): Promise<{ id: string } | null> {
    const { data } = (await supabase
      .from('brain_shares')
      .select('id')
      .eq('brain_id', input.brainId)
      .eq('entity_type', 'org')
      .eq('entity_id', input.orgId)
      .in('level', ['query', 'train'])
      .limit(1)
      .maybeSingle()) as MaybeResult<{ id: string }>
    return data ?? null
  }

  async listUserTeamIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
    const { data } = (await supabase
      .from('agent_team_members')
      .select('team_id')
      .eq('user_id', userId)) as ListResult<{ team_id: string }>
    return (data ?? []).map((row) => row.team_id)
  }

  async findTeamShare(
    supabase: SupabaseClient,
    input: { brainId: string; teamIds: string[] },
  ): Promise<{ id: string } | null> {
    const { data } = (await supabase
      .from('brain_shares')
      .select('id')
      .eq('brain_id', input.brainId)
      .eq('entity_type', 'team')
      .in('entity_id', input.teamIds)
      .in('level', ['query', 'train'])
      .limit(1)
      .maybeSingle()) as MaybeResult<{ id: string }>
    return data ?? null
  }
}

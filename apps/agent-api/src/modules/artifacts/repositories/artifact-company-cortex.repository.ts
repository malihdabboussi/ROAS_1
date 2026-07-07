import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactCompanyCortexRepository {
  async findCompanyBrainByOrg(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('ns_brains')
      .select('id')
      .eq('org_id', orgId)
      .eq('scope', 'company')
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findBrain(
    supabase: SupabaseClient,
    brainId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('ns_brains')
      .select('id, scope, org_id')
      .eq('id', brainId)
      .maybeSingle()) as {
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

  async listObjects(
    supabase: SupabaseClient,
    input: {
      brainId: string
      orgId: string
      objectType?: string
      status?: string
      limit: number
    },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('company_cortex_objects')
      .select('*')
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
      .order('updated_at', { ascending: false })
    if (input.objectType) query = query.eq('object_type', input.objectType)
    if (input.status) query = query.eq('status', input.status)
    else query = query.neq('status', 'retired')
    return (await query.limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listEdges(
    supabase: SupabaseClient,
    input: {
      brainId: string
      orgId: string
      sourceObjectId?: string
      targetObjectId?: string
    },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('company_cortex_object_edges')
      .select('*')
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
    if (input.sourceObjectId) query = query.eq('source_object_id', input.sourceObjectId)
    if (input.targetObjectId) query = query.eq('target_object_id', input.targetObjectId)
    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async searchObjectsByEmbedding(
    supabase: SupabaseClient,
    input: { brainId: string; orgId: string; queryVector: string; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase.rpc('search_company_cortex_objects', {
      p_brain_id: input.brainId,
      p_org_id: input.orgId,
      p_query_embedding: input.queryVector,
      p_match_count: input.limit,
      p_match_threshold: 0.35,
    })) as { data: Array<Record<string, unknown>> | null; error: QueryError | null }
  }

  async searchObjectsByText(
    supabase: SupabaseClient,
    input: { brainId: string; orgId: string; pattern: string; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('company_cortex_objects')
      .select(
        'id, object_type, title, truth, status, confidence, updated_at, effective_from, effective_until, evidence_started_at, evidence_ended_at, valid_from, valid_until, temporal_status, temporal_confidence, temporal_source',
      )
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
      .neq('status', 'retired')
      .or(`title.ilike.${input.pattern},truth.ilike.${input.pattern}`)
      .order('confidence', { ascending: false })
      .limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async createObject(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('company_cortex_objects').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async createSignal(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('company_cortex_signals').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateObject(
    supabase: SupabaseClient,
    input: { id: string; brainId: string; orgId: string; patch: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('company_cortex_objects')
      .update(input.patch)
      .eq('id', input.id)
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
      .select()
      .single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async archiveObject(
    supabase: SupabaseClient,
    input: { id: string; brainId: string; orgId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return this.updateObject(supabase, {
      ...input,
      patch: { status: 'retired' },
    })
  }

  async createEdge(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('company_cortex_object_edges')
      .insert(payload)
      .select()
      .single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async deleteEdge(
    supabase: SupabaseClient,
    input: { id: string; brainId: string; orgId: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('company_cortex_object_edges')
      .delete()
      .eq('id', input.id)
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)) as { error: QueryError | null }
  }
}

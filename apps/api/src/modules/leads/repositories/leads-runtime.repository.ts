import { Injectable } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

type DbError = Error & { code?: string }

@Injectable()
export class LeadsRuntimeRepository {
  createServiceClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as SupabaseClient
  }

  async findSegmentFilters(
    supabase: SupabaseClient,
    segmentId: string,
    orgId?: string | null,
  ): Promise<Record<string, unknown> | null> {
    let query = supabase.from('segments').select('filters').eq('id', segmentId)
    if (orgId !== undefined) {
      query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    }
    const { data, error } = await query.single()
    if (error || !data) return null
    return ((data as { filters?: Record<string, unknown> }).filters ?? {}) as Record<
      string,
      unknown
    >
  }

  async findActiveCrmSyncJob(
    supabase: SupabaseClient,
    userId: string,
    source: string,
  ): Promise<{ id: string } | null> {
    const { data } = await supabase
      .from('crm_sync_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('source', source)
      .in('status', ['queued', 'processing'])
      .maybeSingle()
    return (data as { id: string } | null) ?? null
  }

  async createCrmSyncJob(
    supabase: SupabaseClient,
    userId: string,
    source: string,
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('crm_sync_jobs')
      .insert({ user_id: userId, source, status: 'queued' })
      .select('id')
      .single()

    if (error) {
      const err = new Error(error.message) as DbError
      err.code = error.code
      throw err
    }
    return data as { id: string }
  }

  async findCrmSyncJob(
    supabase: SupabaseClient,
    userId: string,
    jobId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('crm_sync_jobs')
      .select(
        'id, user_id, source, status, job_id, total_remote, fetched, imported, skipped, last_error, started_at, completed_at, created_at, updated_at',
      )
      .eq('id', jobId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return null
    return data as Record<string, unknown>
  }

  async hasActiveCampaignConnection(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const [{ data: urlRow }, { data: keyRow }] = await Promise.all([
      supabase
        .from('vault_secrets')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'active_campaign')
        .eq('label', 'api_url')
        .maybeSingle(),
      supabase
        .from('vault_secrets')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'active_campaign')
        .eq('label', 'api_key')
        .maybeSingle(),
    ])
    return !!urlRow && !!keyRow
  }

  async hasGoHighLevelConnection(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'gohighlevel')
      .eq('status', 'connected')
      .maybeSingle()
    return !!data
  }
}

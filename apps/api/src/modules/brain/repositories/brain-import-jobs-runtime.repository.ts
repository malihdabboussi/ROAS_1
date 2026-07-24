import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  BrainImportJobRecord,
  BrainImportJobStatus,
} from '../services/brain-import-jobs.types'

@Injectable()
export class BrainImportJobsRuntimeRepository {
  private adminClient: SupabaseClient | null = null

  getAdminClient(): SupabaseClient {
    if (this.adminClient) return this.adminClient
    const url = process.env.SUPABASE_URL || ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    this.adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    return this.adminClient
  }

  async findRetryJobs(client: SupabaseClient, limit: number) {
    const { data, error } = await client
      .from('brain_import_jobs')
      .select('id, last_error, next_attempt_at')
      .eq('status', 'retry')
      .order('next_attempt_at', { ascending: true })
      .limit(limit)
    return {
      data: (data ?? []) as Array<{
        id: string
        last_error: string | null
        next_attempt_at: string
      }>,
      error,
    }
  }

  async wakeRetryJob(client: SupabaseClient, jobId: string, nextAttemptAt: string) {
    return client
      .from('brain_import_jobs')
      .update({ next_attempt_at: nextAttemptAt })
      .eq('id', jobId)
      .eq('status', 'retry')
  }

  async findDueJobIds(client: SupabaseClient, nowIso: string, limit: number) {
    const { data, error } = await client
      .from('brain_import_jobs')
      .select('id')
      .in('status', ['queued', 'retry'])
      .lte('next_attempt_at', nowIso)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async updateJobProgress(
    client: SupabaseClient,
    jobId: string,
    attempts: number,
    update: Record<string, unknown>,
  ) {
    const { error } = await client
      .from('brain_import_jobs')
      .update(update)
      .eq('id', jobId)
      .eq('attempts', attempts)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async loadJobById(client: SupabaseClient, jobId: string) {
    const { data, error } = await client
      .from('brain_import_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data as BrainImportJobRecord | null) ?? null
  }

  async countProcessingJobsForUser(client: SupabaseClient, userId: string) {
    const { count, error } = await client
      .from('brain_import_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'processing')
    if (error) throw new Error(`DB error: ${error.message}`)
    return count ?? 0
  }

  async findStaleJobs(client: SupabaseClient, staleThreshold: string) {
    const { data, error } = await client
      .from('brain_import_jobs')
      .select('id, attempts, max_attempts')
      .eq('status', 'processing')
      .lt('started_at', staleThreshold)
      .limit(20)
    if (error) return []
    return data ?? []
  }

  async updateJob(client: SupabaseClient, jobId: string, update: Record<string, unknown>) {
    await client.from('brain_import_jobs').update(update).eq('id', jobId)
  }

  async findExistingActiveJob(client: SupabaseClient, userId: string, dedupeKey: string) {
    const { data, error } = await client
      .from('brain_import_jobs')
      .select('id, status')
      .eq('user_id', userId)
      .eq('dedupe_key', dedupeKey)
      .in('status', ['queued', 'processing', 'retry'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data as { id: string; status: BrainImportJobStatus } | null
  }

  async insertJob(client: SupabaseClient, record: Record<string, unknown>) {
    return client.from('brain_import_jobs').insert(record).select('id, status').single()
  }

  async claimJob(client: SupabaseClient, jobId: string, attempts: number) {
    const { data, error } = await client
      .from('brain_import_jobs')
      .update({
        status: 'processing',
        attempts,
        started_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', jobId)
      .in('status', ['queued', 'retry'])
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data as BrainImportJobRecord | null) ?? null
  }

  async loadJobForAttempt(client: SupabaseClient, jobId: string, attempts: number) {
    const { data, error } = await client
      .from('brain_import_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('attempts', attempts)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data as BrainImportJobRecord | null) ?? null
  }

  async updateJobForAttempt(
    client: SupabaseClient,
    jobId: string,
    attempts: number,
    update: Record<string, unknown>,
  ) {
    return client.from('brain_import_jobs').update(update).eq('id', jobId).eq('attempts', attempts)
  }

  async findJobOrgId(client: SupabaseClient, jobId: string) {
    const { data } = await client
      .from('brain_import_jobs')
      .select('org_id')
      .eq('id', jobId)
      .maybeSingle()
    return (data as Record<string, unknown> | null)?.org_id ?? null
  }

  async updateSlackMappingSynced(
    client: SupabaseClient,
    mappingId: string,
    update: Record<string, unknown>,
  ) {
    return client.from('slack_brain_mappings').update(update).eq('id', mappingId)
  }

  async updateChunkTotal(client: SupabaseClient, jobId: string, chunksTotal: number) {
    return client.from('brain_import_jobs').update({ chunks_total: chunksTotal }).eq('id', jobId)
  }

  async updateChunksCompleted(client: SupabaseClient, jobId: string, chunksCompleted: number) {
    return client
      .from('brain_import_jobs')
      .update({ chunks_completed: chunksCompleted })
      .eq('id', jobId)
  }

  async insertNotification(client: SupabaseClient, record: Record<string, unknown>) {
    return client.from('user_notifications').insert(record)
  }
}

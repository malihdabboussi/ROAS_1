import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class BrainImportJobStatusRepository {
  private adminClient: SupabaseClient | null = null

  async getJobStatus(userId: string, jobId: string) {
    const { data, error } = await this.getAdminClient()
      .from('brain_import_jobs')
      .select(
        'id, job_type, status, attempts, max_attempts, last_error, result, created_at, completed_at',
      )
      .eq('id', jobId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async listPendingNotifications(userId: string) {
    const { data, error } = await this.getAdminClient()
      .from('brain_import_jobs')
      .select('id, job_type, title, status, result, last_error, completed_at')
      .eq('user_id', userId)
      .in('status', ['succeeded', 'failed'])
      .is('notified_at', null)
      .order('completed_at', { ascending: true })
      .limit(20)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async listActiveImportJobs(
    userId: string,
    completedAfter: string,
    scope: { brainId?: string; campaignId?: string; targetBrain?: 'user' } | undefined,
    limit: number,
  ) {
    let query = this.getAdminClient()
      .from('brain_import_jobs')
      .select(
        'id, job_type, title, status, payload, result, last_error, created_at, updated_at, completed_at',
      )
      .eq('user_id', userId)
      .or(
        `status.in.(queued,processing,retry,failed),and(status.eq.succeeded,completed_at.gt.${completedAfter})`,
      )

    if (scope?.brainId) {
      query = query.eq('payload->>brainId', scope.brainId)
    } else if (scope?.campaignId) {
      query = query
        .in('job_type', [
          'campaign_file_import',
          'campaign_fathom_import',
          'campaign_fireflies_import',
          'campaign_url_import',
        ])
        .eq('payload->>campaignId', scope.campaignId)
    } else if (scope?.targetBrain === 'user') {
      query = query
        .in('job_type', [
          'document_remember',
          'user_link_import',
          'fathom_meeting_import',
          'fireflies_transcript_import',
        ])
        .is('payload->>brainId', null)
    } else {
      query = query.in('job_type', [
        'document_remember',
        'user_link_import',
        'sk_ingest',
        'sk_link_ingest',
        'fathom_meeting_import',
        'fireflies_transcript_import',
      ])
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async listActiveBrainOpsJobs(
    userId: string,
    completedAfter: string,
    scope: { brainId?: string; campaignId?: string } | undefined,
    limit: number,
  ) {
    let query = this.getAdminClient()
      .from('brain_ops_outbox')
      .select('id, event_type, status, error, created_at, processed_at, brain_id, payload')
      .eq('user_id', userId)
      .in('event_type', ['brain_library_sync', 'brain_pattern_analysis', 'brain_timeline_synthesis'])
      .or(
        `status.in.(pending,processing,processed),and(status.eq.failed,created_at.gt.${completedAfter}),and(status.eq.done,processed_at.gt.${completedAfter})`,
      )

    if (scope?.brainId) query = query.eq('brain_id', scope.brainId)

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async cancelJob(userId: string, jobId: string) {
    const { data, error } = await this.getAdminClient()
      .from('brain_import_jobs')
      .update({
        status: 'failed',
        last_error: 'Cancelled by user',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('user_id', userId)
      .in('status', ['queued', 'processing', 'retry'])
      .select('id')
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data?.length ?? 0) > 0
  }

  async retryJob(userId: string, jobId: string) {
    const { data, error } = await this.getAdminClient()
      .from('brain_import_jobs')
      .update({
        status: 'queued',
        attempts: 0,
        last_error: null,
        result: null,
        completed_at: null,
        next_attempt_at: new Date().toISOString(),
        chunks_completed: 0,
        chunks_total: null,
      })
      .eq('id', jobId)
      .eq('user_id', userId)
      .eq('status', 'failed')
      .select('id')
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data?.length ?? 0) > 0
  }

  async dismissJob(userId: string, jobId: string) {
    const { data, error } = await this.getAdminClient()
      .from('brain_import_jobs')
      .delete()
      .eq('id', jobId)
      .eq('user_id', userId)
      .in('status', ['succeeded', 'failed'])
      .select('id')
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data?.length ?? 0) > 0
  }

  async acknowledgeNotifications(userId: string, jobIds: string[]) {
    if (jobIds.length === 0) return
    const { error } = await this.getAdminClient()
      .from('brain_import_jobs')
      .update({ notified_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', jobIds)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  private getAdminClient(): SupabaseClient {
    if (this.adminClient) return this.adminClient
    const url = process.env.SUPABASE_URL || ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    this.adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    return this.adminClient
  }
}

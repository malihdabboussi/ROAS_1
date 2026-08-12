import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactMediaJobsRepository {
  async findMediaJobForUser(
    supabase: SupabaseClient,
    input: { jobId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('media_generation_jobs')
      .select(
        'id, user_id, campaign_id, space_id, provider, provider_job_id, status, error, media_asset_id, result_url, prompt, model, duration_seconds',
      )
      .eq('id', input.jobId)
      .eq('user_id', input.userId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async hasProviderUsageEvent(
    supabase: SupabaseClient,
    input: { userId: string; provider: string; providerJobId: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('ai_usage_events')
      .select('id')
      .eq('user_id', input.userId)
      .contains('metadata_json', {
        provider: input.provider,
        provider_job_id: input.providerJobId,
      })
      .limit(1)) as { data: Array<Record<string, unknown>> | null; error: QueryError | null }
  }

  async createMediaJob(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('media_generation_jobs').insert(payload).select('id').single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateMediaJob(
    supabase: SupabaseClient,
    input: { jobId: string; updates: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('media_generation_jobs')
      .update(input.updates)
      .eq('id', input.jobId)) as { error: QueryError | null }
  }

  async findStaleMediaJobs(
    supabase: SupabaseClient,
    input: { assetType: 'image' | 'video'; createdBeforeIso: string; limit: number },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('media_generation_jobs')
      .select('id, user_id, campaign_id, space_id, provider, provider_job_id, status, created_at')
      .eq('asset_type', input.assetType)
      .in('status', ['starting', 'processing'])
      .lt('created_at', input.createdBeforeIso)
      .order('created_at', { ascending: true })
      .limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  /**
   * Claims completion ownership of a non-terminal job in one conditional
   * UPDATE. Postgres serializes concurrent updates of the same row, so at most
   * one caller gets a row back until the claim goes stale (crash recovery) —
   * that caller alone may run terminal side effects (upload, billing, marking
   * the job terminal). Returns no rows when another worker holds a live claim
   * or the job is already terminal.
   */
  async claimMediaJobCompletion(
    supabase: SupabaseClient,
    input: { jobId: string; claimedBy: string; nowIso: string; staleBeforeIso: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('media_generation_jobs')
      .update({ completion_claimed_at: input.nowIso, completion_claimed_by: input.claimedBy })
      .eq('id', input.jobId)
      .in('status', ['starting', 'processing'])
      .or(`completion_claimed_at.is.null,completion_claimed_at.lt.${input.staleBeforeIso}`)
      .select('id')) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  /**
   * One-shot atomic flip that grants the billing side effect to a single
   * caller for the job's lifetime. Unlike the completion claim it never
   * expires: a crash after the flip means the debit may be lost, never
   * charged twice.
   */
  async claimMediaJobBilling(
    supabase: SupabaseClient,
    input: { jobId: string; nowIso: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('media_generation_jobs')
      .update({ billing_recorded_at: input.nowIso })
      .eq('id', input.jobId)
      .is('billing_recorded_at', null)
      .select('id')) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  /** Claims a job for one sweep pass; returns no rows when another sweep holds the claim. */
  async claimMediaJobForSweep(
    supabase: SupabaseClient,
    input: { jobId: string; nowIso: string; resweepBeforeIso: string },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('media_generation_jobs')
      .update({ last_swept_at: input.nowIso })
      .eq('id', input.jobId)
      .in('status', ['starting', 'processing'])
      .or(`last_swept_at.is.null,last_swept_at.lt.${input.resweepBeforeIso}`)
      .select('id')) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }
}

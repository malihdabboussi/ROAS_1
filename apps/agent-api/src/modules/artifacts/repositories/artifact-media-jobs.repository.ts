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
        'id, user_id, campaign_id, provider, provider_job_id, status, media_asset_id, result_url, prompt, model, duration_seconds',
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
    return (await supabase
      .from('media_generation_jobs')
      .insert(payload)
      .select('id')
      .single()) as { data: Record<string, unknown> | null; error: QueryError | null }
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
}

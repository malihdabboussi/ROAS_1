import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactMediaJobsRepository } from '../repositories/artifact-media-jobs.repository'

@Injectable()
export class ArtifactLegacyMediaJobsService {
  constructor(
    private readonly repository: ArtifactMediaJobsRepository = new ArtifactMediaJobsRepository(),
  ) {}

  async findMediaJobForUser(
    supabase: SupabaseClient,
    input: { jobId: string; userId: string },
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.repository.findMediaJobForUser(supabase, input)
    if (error) throw error
    return data
  }

  async hasProviderUsageEvent(
    supabase: SupabaseClient,
    userId: string,
    provider: string,
    providerJobId: string,
  ): Promise<boolean> {
    const { data, error } = await this.repository.hasProviderUsageEvent(supabase, {
      userId,
      provider,
      providerJobId,
    })

    if (error) throw error
    return Array.isArray(data) && data.length > 0
  }

  async createMediaJob(
    supabase: SupabaseClient,
    job: {
      user_id: string
      campaign_id: string | null
      asset_type: 'image' | 'video'
      provider: 'replicate' | 'google'
      provider_job_id: string
      status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
      prompt: string
      model: string
      aspect_ratio?: string
      duration_seconds?: number
      space_id?: string | null
    },
  ): Promise<{ id: string }> {
    const { data, error } = await this.repository.createMediaJob(supabase, {
      user_id: job.user_id,
      campaign_id: job.campaign_id ?? null,
      asset_type: job.asset_type,
      provider: job.provider,
      provider_job_id: job.provider_job_id,
      status: job.status,
      prompt: job.prompt,
      model: job.model,
      aspect_ratio: job.aspect_ratio ?? null,
      duration_seconds: job.duration_seconds ?? null,
      space_id: job.space_id ?? null,
    })

    if (error) throw error
    if (!data?.id) throw new Error('Media job was not created')
    return { id: data.id as string }
  }

  async updateMediaJob(
    supabase: SupabaseClient,
    jobId: string,
    updates: Partial<{
      status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
      error: string | null
      result_url: string | null
      media_asset_id: string | null
    }>,
  ): Promise<void> {
    const { error } = await this.repository.updateMediaJob(supabase, {
      jobId,
      updates: {
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.error !== undefined ? { error: updates.error } : {}),
        ...(updates.result_url !== undefined ? { result_url: updates.result_url } : {}),
        ...(updates.media_asset_id !== undefined ? { media_asset_id: updates.media_asset_id } : {}),
      },
    })

    if (error) throw error
  }
}

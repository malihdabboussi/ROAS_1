import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope } from '@vibey/api-shared'

type QueryError = { message: string }
type OwnerScope = { userId: string; orgId?: string | null }

@Injectable()
export class ArtifactSocialPostsRepository {
  private scopeQuery<T extends { eq: (key: string, value: unknown) => T; is?: (key: string, value: unknown) => T }>(
    query: T,
    input: OwnerScope & { requireNullOrg?: boolean },
  ): T {
    if (input.orgId) return query.eq('org_id', input.orgId)
    const scoped = query.eq('user_id', input.userId)
    return input.requireNullOrg && scoped.is ? scoped.is('org_id', null) : scoped
  }

  async createPost(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('social_posts').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async upsertSchedule(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('social_post_schedules')
      .upsert(payload, { onConflict: 'social_post_id' })) as { error: QueryError | null }
  }

  async findPostForScheduling(
    supabase: SupabaseClient,
    input: OwnerScope & { socialPostId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('social_posts')
      .select('id, campaign_id, post_type, image_url, video_url, carousel_slides, org_id')
      .eq('id', input.socialPostId)
    query = this.scopeQuery(query, input)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async markScheduled(
    supabase: SupabaseClient,
    input: OwnerScope & { socialPostId: string; scheduledAtIso: string; nowIso: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('social_posts')
      .update({
        scheduled_at: input.scheduledAtIso,
        status: 'scheduled',
        updated_at: input.nowIso,
      })
      .eq('id', input.socialPostId)
    query = this.scopeQuery(query, input)
    return (await query.select().maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findCarouselSlides(
    supabase: SupabaseClient,
    input: OwnerScope & { socialPostId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('social_posts')
      .select('carousel_slides')
      .eq('id', input.socialPostId)
    query = this.scopeQuery(query, input)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updatePost(
    supabase: SupabaseClient,
    input: OwnerScope & { socialPostId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('social_posts').update(input.updates).eq('id', input.socialPostId)
    query = this.scopeQuery(query, input)
    return (await query.select().maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listPosts(
    supabase: SupabaseClient,
    input: OwnerScope & { campaignId?: string | null; platform?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase.from('social_posts').select('*')
    query = this.scopeQuery(query, { ...input, requireNullOrg: true })
    if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
    if (input.platform) query = query.eq('platform', input.platform)
    return (await query.order('created_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findPostById(
    supabase: SupabaseClient,
    input: OwnerScope & { socialPostId: string; select: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('social_posts').select(input.select).eq('id', input.socialPostId)
    query = this.scopeQuery(query, input)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listLinkedInIntegrations(
    supabase: SupabaseClient,
    input: OwnerScope,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('user_integrations')
      .select('user_id, metadata, scope_mode, is_default, updated_at')
      .eq('integration_id', 'linkedin')
      .eq('status', 'connected')
    query = this.scopeQuery(query, { ...input, requireNullOrg: true })
    return (await query.order('updated_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async updatePublishStatus(
    supabase: SupabaseClient,
    input: OwnerScope & { socialPostId: string; updates: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    let query = supabase.from('social_posts').update(input.updates).eq('id', input.socialPostId)
    query = applyOwnerScope(query, { userId: input.userId, orgId: input.orgId ?? null })
    return (await query) as { error: QueryError | null }
  }

  async findTemplate(
    supabase: SupabaseClient,
    input: { templateId: number; platform?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('social_post_templates').select('*').eq('id', input.templateId)
    if (input.platform) query = query.eq('platform', input.platform)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listTemplates(
    supabase: SupabaseClient,
    input: { platform?: string | null; templateCategory?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('social_post_templates')
      .select(
        'id, template_name, platform, post_type, template_category, use_cases, performance_rating',
      )
    if (input.platform) query = query.eq('platform', input.platform)
    if (input.templateCategory) query = query.eq('template_category', input.templateCategory)
    return (await query.order('id', { ascending: true })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }
}

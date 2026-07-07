import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactBlogRepository {
  async createBlogPost(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('blog_posts').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateBlogPost(
    supabase: SupabaseClient,
    input: { blogPostId: string; userId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('blog_posts')
      .update(input.updates)
      .eq('id', input.blogPostId)
      .eq('user_id', input.userId)
      .select()
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async listBlogPosts(
    supabase: SupabaseClient,
    input: { userId: string; orgId: string | null; funnelId: string; status: string; limit: number | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    const baseQ = input.orgId
      ? supabase.from('blog_posts').select('*').eq('org_id', input.orgId)
      : supabase.from('blog_posts').select('*').eq('user_id', input.userId).is('org_id', null)
    let query = baseQ
      .eq('funnel_id', input.funnelId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (input.status) query = query.eq('status', input.status)
    if (input.limit) query = query.limit(input.limit)

    return (await query) as { data: Array<Record<string, unknown>> | null; error: QueryError | null }
  }

  async findBlogPostForUser(
    supabase: SupabaseClient,
    input: { blogPostId: string; userId: string; select: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('blog_posts')
      .select(input.select)
      .eq('id', input.blogPostId)
      .eq('user_id', input.userId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }
}

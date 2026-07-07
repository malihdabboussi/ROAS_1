import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactThemesRepository {
  async listBrandingThemes(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase.from('branding_themes').select('*')
    if (input.orgId) {
      query = query.or(
        `is_system.eq.true,and(is_system.eq.false,org_id.eq.${input.orgId}),and(user_id.eq.${input.userId},org_id.is.null)`,
      )
    } else {
      query = query.or(`is_system.eq.true,user_id.eq.${input.userId}`)
    }
    return (await query
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listLegacyThemes(
    supabase: SupabaseClient,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase.from('themes').select('*').order('created_at', {
      ascending: false,
    })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findCampaignConfigForUser(
    supabase: SupabaseClient,
    input: { campaignId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('campaigns')
      .select('config')
      .eq('id', input.campaignId)
      .eq('user_id', input.userId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findCampaignConfig(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('campaigns').select('config').eq('id', campaignId).maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateCampaignConfig(
    supabase: SupabaseClient,
    input: { campaignId: string; config: Record<string, unknown> },
  ): Promise<void> {
    await supabase.from('campaigns').update({ config: input.config }).eq('id', input.campaignId)
  }

  async createBrandingTheme(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('branding_themes').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async createLegacyTheme(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('themes').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findBrandingTheme(
    supabase: SupabaseClient,
    themeId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from('branding_themes').select('*').eq('id', themeId).maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async brandingSlugExists(
    supabase: SupabaseClient,
    input: {
      userId: string
      slug: string
      excludeId?: string
      orgId: string | null | undefined
    },
  ): Promise<{ exists: boolean; error: QueryError | null }> {
    let query = supabase
      .from('branding_themes')
      .select('id', { count: 'exact', head: true })
      .eq('slug', input.slug)
      .eq('is_system', false)
    if (input.excludeId) query = query.neq('id', input.excludeId)
    if (input.orgId !== undefined) {
      query = input.orgId
        ? query.eq('org_id', input.orgId)
        : query.eq('user_id', input.userId).is('org_id', null)
    } else {
      query = query.eq('user_id', input.userId)
    }
    const { count, error } = (await query) as { count: number | null; error: QueryError | null }
    return { exists: (count || 0) > 0, error }
  }

  async updateLegacyTheme(
    supabase: SupabaseClient,
    input: { themeId: string; userId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('themes')
      .update(input.updates)
      .eq('id', input.themeId)
      .eq('user_id', input.userId)
      .select()
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateBrandingTheme(
    supabase: SupabaseClient,
    input: {
      themeId: string
      userId: string
      orgId: string | null | undefined
      updates: Record<string, unknown>
    },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('branding_themes')
      .update(input.updates)
      .eq('id', input.themeId)
      .eq('user_id', input.userId)
      .eq('is_system', false)
    if (input.orgId !== undefined && input.orgId) {
      query = query.or(`org_id.eq.${input.orgId},org_id.is.null`)
    } else if (input.orgId !== undefined) {
      query = query.is('org_id', null)
    }
    return (await query.select().maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findDeletableBrandingTheme(
    supabase: SupabaseClient,
    input: { themeId: string; userId: string; orgId?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('branding_themes')
      .select('id, name, is_system')
      .eq('id', input.themeId)
      .eq('user_id', input.userId)
    if (input.orgId) {
      query = query.or(`org_id.eq.${input.orgId},org_id.is.null`)
    }
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}

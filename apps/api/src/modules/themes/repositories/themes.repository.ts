/**
 * Themes Repository
 * Layer 3: Database access for branding_themes table
 * Ported from: Vibey_legacy/apps/app-backend/src/modules/themes/repositories/themes.repository.ts
 */

import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateThemeData, Theme, UpdateThemeData } from '../types'

@Injectable()
export class ThemesRepository {
  async findAllForUser(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<Theme[]> {
    let query = supabase.from('branding_themes').select('*')
    if (orgId !== undefined) {
      // Org workspace: system themes + all custom themes in the org (any member), not only current user.
      const userPart = orgId
        ? `and(is_system.eq.false,org_id.eq.${orgId})`
        : `and(user_id.eq.${userId},org_id.is.null)`
      query = query.or(`is_system.eq.true,${userPart}`)
    } else {
      query = query.or(`is_system.eq.true,user_id.eq.${userId}`)
    }
    const { data, error } = await query
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findById(
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<Theme | null> {
    let query = supabase.from('branding_themes').select('*').eq('id', themeId)
    if (orgId !== undefined) {
      const userPart = orgId
        ? `and(is_system.eq.false,org_id.eq.${orgId})`
        : `and(is_system.eq.false,user_id.eq.${userId},org_id.is.null)`
      query = query.or(`is_system.eq.true,${userPart}`)
    } else {
      query = query.or(`is_system.eq.true,user_id.eq.${userId}`)
    }
    const { data, error } = await query.single()
    if (error && error.code === 'PGRST116') return null
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async create(
    supabase: SupabaseClient,
    data: CreateThemeData,
    orgId?: string | null,
  ): Promise<Theme> {
    const { data: theme, error } = await supabase
      .from('branding_themes')
      .insert({
        user_id: data.user_id,
        slug: data.slug,
        name: data.name,
        colors: data.colors,
        logo_asset_id: data.logo_asset_id || null,
        headshot_images: data.headshot_images ?? [],
        product_images: data.product_images ?? [],
        font_heading: data.font_heading || null,
        font_body: data.font_body || null,
        brand_voice: data.brand_voice || null,
        brand_values: data.brand_values || null,
        social_links: data.social_links || {},
        design_settings: data.design_settings || null,
        image_style_prompt: data.image_style_prompt || null,
        is_system: false,
        status: data.status || 'draft',
        org_id: orgId ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return theme
  }

  async update(
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
    data: UpdateThemeData,
    orgId?: string | null,
  ): Promise<Theme> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) payload.name = data.name
    if (data.slug !== undefined) payload.slug = data.slug
    if (data.colors !== undefined) payload.colors = data.colors
    if (data.logo_asset_id !== undefined) payload.logo_asset_id = data.logo_asset_id
    if (data.headshot_images !== undefined) payload.headshot_images = data.headshot_images
    if (data.product_images !== undefined) payload.product_images = data.product_images
    if (data.font_heading !== undefined) payload.font_heading = data.font_heading
    if (data.font_body !== undefined) payload.font_body = data.font_body
    if (data.brand_voice !== undefined) payload.brand_voice = data.brand_voice
    if (data.brand_values !== undefined) payload.brand_values = data.brand_values
    if (data.social_links !== undefined) payload.social_links = data.social_links
    if (data.design_settings !== undefined) payload.design_settings = data.design_settings
    if (data.image_style_prompt !== undefined) payload.image_style_prompt = data.image_style_prompt
    if (data.status !== undefined) payload.status = data.status

    let query = supabase
      .from('branding_themes')
      .update(payload)
      .eq('id', themeId)
      .eq('user_id', userId)
      .eq('is_system', false)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: theme, error } = await query.select().single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return theme
  }

  async delete(
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('branding_themes')
      .delete()
      .eq('id', themeId)
      .eq('user_id', userId)
      .eq('is_system', false)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  async countFunnelsUsingTheme(
    supabase: SupabaseClient,
    themeId: string,
    userId: string,
  ): Promise<number> {
    const { count, error } = await supabase
      .from('funnels')
      .select('*', { count: 'exact', head: true })
      .eq('theme_id', themeId)
      .eq('user_id', userId)
    if (error) throw new Error(`DB error: ${error.message}`)
    return count || 0
  }

  async checkSlugExists(
    supabase: SupabaseClient,
    userId: string,
    slug: string,
    excludeId?: string,
    orgId?: string | null,
  ): Promise<boolean> {
    let query = supabase
      .from('branding_themes')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
      .eq('is_system', false)
    if (excludeId) query = query.neq('id', excludeId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.eq('user_id', userId).is('org_id', null)
    } else {
      query = query.eq('user_id', userId)
    }
    const { count, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return (count || 0) > 0
  }
}

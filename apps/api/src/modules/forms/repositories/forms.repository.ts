import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateFormDto, UpdateFormDto } from '../dto'

@Injectable()
export class FormsRepository {
  async findByCampaignId(
    supabase: SupabaseClient,
    campaignId: string,
    orgId?: string | null,
    opts?: { spaceId?: string | null },
  ) {
    let query = supabase
      .from('forms')
      .select('*')
      .eq('campaign_id', campaignId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
    if (orgId !== undefined) query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    if (opts?.spaceId !== undefined) {
      query =
        opts.spaceId === null ? query.is('space_id', null) : query.eq('space_id', opts.spaceId)
    }
    const { data, error } = await query
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? []
  }

  async findById(supabase: SupabaseClient, id: string, orgId?: string | null) {
    let query = supabase.from('forms').select('*').eq('id', id)
    if (orgId !== undefined) query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findPublishedByToken(supabase: SupabaseClient, token: string) {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('share_token', token)
      .eq('status', 'published')
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async findSlugConflict(
    supabase: SupabaseClient,
    campaignId: string,
    slug: string,
    excludeId: string,
  ) {
    const { data, error } = await supabase
      .from('forms')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('slug', slug)
      .neq('id', excludeId)
      .maybeSingle()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async create(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateFormDto,
    orgId?: string | null,
  ) {
    const { data, error } = await supabase
      .from('forms')
      .insert({
        user_id: userId,
        org_id: orgId ?? null,
        campaign_id: dto.campaign_id,
        space_id: dto.space_id ?? null,
        name: dto.name,
        ...(dto.visibility ? { visibility: dto.visibility } : {}),
        schema: dto.schema ?? { questions: [] },
        settings: dto.settings ?? {},
      })
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async update(
    supabase: SupabaseClient,
    id: string,
    fields: UpdateFormDto | Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('forms')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`DB error: ${error.message}`)
    return data
  }

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase
      .from('forms')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(`DB error: ${error.message}`)
  }
}

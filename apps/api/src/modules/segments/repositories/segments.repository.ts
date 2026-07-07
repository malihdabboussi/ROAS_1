import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Segment, SegmentFilters } from '../types/segment.types'

@Injectable()
export class SegmentsRepository {
  private readonly logger = new Logger(SegmentsRepository.name)

  async create(
    supabase: SupabaseClient,
    userId: string,
    data: { name: string; description?: string; filters: SegmentFilters },
    orgId?: string | null,
  ): Promise<Segment> {
    const { data: segment, error } = await supabase
      .from('segments')
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description || null,
        filters: data.filters,
        lead_count: 0,
        org_id: orgId ?? null,
      })
      .select()
      .single()

    if (error) {
      this.logger.error(`Failed to create segment: ${error.message}`)
      throw new Error(`Database error: ${error.message}`)
    }

    return segment as Segment
  }

  async findById(
    supabase: SupabaseClient,
    segmentId: string,
    orgId?: string | null,
  ): Promise<Segment | null> {
    let query = supabase.from('segments').select('*').eq('id', segmentId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: segment, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      this.logger.error(`Failed to find segment: ${error.message}`)
      throw new Error(`Database error: ${error.message}`)
    }

    return segment as Segment
  }

  async findByUserId(supabase: SupabaseClient, orgId?: string | null): Promise<Segment[]> {
    let query = supabase.from('segments').select('*')
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: segments, error } = await query.order('name', { ascending: true })

    if (error) {
      this.logger.error(`Failed to find segments: ${error.message}`)
      throw new Error(`Database error: ${error.message}`)
    }

    return (segments || []) as Segment[]
  }

  async getFilterOptions(supabase: SupabaseClient): Promise<{
    tags: string[]
    countries: string[]
  }> {
    const [tagsRes, countriesRes] = await Promise.all([
      supabase.rpc('get_distinct_contact_tags'),
      supabase.rpc('get_distinct_contact_countries'),
    ])

    return {
      tags: Array.isArray(tagsRes.data) ? tagsRes.data : [],
      countries: Array.isArray(countriesRes.data) ? countriesRes.data : [],
    }
  }

  async previewSegmentContacts(
    supabase: SupabaseClient,
    filters: Record<string, unknown>,
  ): Promise<number> {
    const { data, error } = await supabase.rpc('preview_segment_contacts', {
      p_filters: filters,
    })

    if (error) throw error

    return (data as number | null) ?? 0
  }

  async update(
    supabase: SupabaseClient,
    segmentId: string,
    data: { name?: string; description?: string | null; filters?: SegmentFilters },
    orgId?: string | null,
  ): Promise<Segment> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.filters !== undefined) updateData.filters = data.filters

    let query = supabase.from('segments').update(updateData).eq('id', segmentId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { data: segment, error } = await query.select().single()

    if (error) {
      this.logger.error(`Failed to update segment: ${error.message}`)
      throw new Error(`Database error: ${error.message}`)
    }

    return segment as Segment
  }

  async delete(
    supabase: SupabaseClient,
    segmentId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    let query = supabase.from('segments').delete().eq('id', segmentId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { error } = await query

    if (error) {
      this.logger.error(`Failed to delete segment: ${error.message}`)
      throw new Error(`Database error: ${error.message}`)
    }

    return true
  }

  async updateLeadCount(
    supabase: SupabaseClient,
    segmentId: string,
    count: number,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('segments')
      .update({ lead_count: count, updated_at: new Date().toISOString() })
      .eq('id', segmentId)
    if (orgId !== undefined) {
      query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    }
    const { error } = await query

    if (error) {
      this.logger.error(`Failed to update lead count: ${error.message}`)
      throw new Error(`Database error: ${error.message}`)
    }
  }
}

import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ProgramRow,
  ProgramShareLevel,
  ProgramShareRow,
  ProgramVisibility,
  UpsertProgramShareInput,
} from '../dto/programs.dto'

@Injectable()
export class ProgramPermissionsRepository {
  async listShares(
    supabase: SupabaseClient,
    programId: string,
    orgId?: string | null,
  ): Promise<ProgramShareRow[]> {
    let query = supabase.from('program_shares').select('*').eq('program_id', programId)
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to list program shares: ${error.message}`)
    return (data ?? []) as ProgramShareRow[]
  }

  async upsertShare(
    supabase: SupabaseClient,
    programId: string,
    userId: string,
    input: UpsertProgramShareInput,
    orgId?: string | null,
  ): Promise<ProgramShareRow> {
    const payload = {
      program_id: programId,
      org_id: orgId ?? null,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      level: input.level,
      created_by: userId,
    }
    const { data, error } = await supabase
      .from('program_shares')
      .upsert(payload, { onConflict: 'program_id,entity_type,entity_id' })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to upsert program share: ${error.message}`)
    return data as ProgramShareRow
  }

  async deleteShare(
    supabase: SupabaseClient,
    programId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    let query = supabase
      .from('program_shares')
      .delete()
      .eq('id', shareId)
      .eq('program_id', programId)
    if (orgId) query = query.eq('org_id', orgId)
    const { data, error } = await query.select('id').maybeSingle()
    if (error) throw new Error(`Failed to delete program share: ${error.message}`)
    return Boolean(data)
  }

  async setVisibility(
    supabase: SupabaseClient,
    programId: string,
    visibility: ProgramVisibility,
    orgId?: string | null,
    createdBy?: string | null,
  ): Promise<ProgramRow | null> {
    const fields: Record<string, unknown> = {
      visibility,
      updated_at: new Date().toISOString(),
    }
    if (createdBy) fields.created_by = createdBy
    let query = supabase.from('programs').update(fields).eq('id', programId).is('deleted_at', null)
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data, error } = await query.select('*').maybeSingle()
    if (error) throw new Error(`Failed to set program visibility: ${error.message}`)
    return (data as ProgramRow | null) ?? null
  }

  async listSharesForPrograms(
    supabase: SupabaseClient,
    programIds: string[],
    userId: string,
  ): Promise<ProgramShareRow[]> {
    if (programIds.length === 0) return []
    const { data, error } = await supabase
      .from('program_shares')
      .select('*')
      .in('program_id', programIds)
      .eq('entity_type', 'user')
      .eq('entity_id', userId)
    if (error) throw new Error(`Failed to list program shares for user: ${error.message}`)
    return (data ?? []) as ProgramShareRow[]
  }

  async findProgramIdsByCampaignIds(
    supabase: SupabaseClient,
    campaignIds: string[],
  ): Promise<Map<string, string | null>> {
    const out = new Map<string, string | null>()
    if (campaignIds.length === 0) return out
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, program_id')
      .in('id', campaignIds)
    if (error) throw new Error(`Failed to load campaign program ids: ${error.message}`)
    for (const row of data ?? []) {
      out.set(String(row.id), typeof row.program_id === 'string' ? row.program_id : null)
    }
    return out
  }
}

export type { ProgramShareLevel }

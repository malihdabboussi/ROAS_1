import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateProgramInput, ProgramRow, UpdateProgramInput } from '../dto/programs.dto'

@Injectable()
export class ProgramsRepository {
  async list(supabase: SupabaseClient, orgId?: string | null): Promise<ProgramRow[]> {
    let query = supabase
      .from('programs')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (orgId) {
      query = query.eq('org_id', orgId)
    } else {
      query = query.is('org_id', null)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to list programs: ${error.message}`)
    return (data ?? []) as ProgramRow[]
  }

  async findById(
    supabase: SupabaseClient,
    id: string,
    orgId?: string | null,
  ): Promise<ProgramRow | null> {
    let query = supabase.from('programs').select('*').eq('id', id).is('deleted_at', null)
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to load program: ${error.message}`)
    return (data as ProgramRow | null) ?? null
  }

  /** Batch load programs by id (single query) — avoids per-program findById N+1. */
  async listByIds(
    supabase: SupabaseClient,
    ids: string[],
    orgId?: string | null,
  ): Promise<ProgramRow[]> {
    if (ids.length === 0) return []
    let query = supabase
      .from('programs')
      .select('*')
      .in('id', [...new Set(ids)])
      .is('deleted_at', null)
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data, error } = await query
    if (error) throw new Error(`Failed to load programs: ${error.message}`)
    return (data ?? []) as ProgramRow[]
  }

  async findSystemByKind(
    supabase: SupabaseClient,
    systemKind: string,
    orgId?: string | null,
  ): Promise<ProgramRow | null> {
    let query = supabase
      .from('programs')
      .select('*')
      .eq('system_kind', systemKind)
      .is('deleted_at', null)
      .limit(1)
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to load system program: ${error.message}`)
    return (data as ProgramRow | null) ?? null
  }

  async findPersonalDefaultForUser(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
  ): Promise<ProgramRow | null> {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('org_id', orgId)
      .eq('created_by', userId)
      .is('deleted_at', null)
      .contains('config', { personal_default: true })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load personal program: ${error.message}`)
    return (data as ProgramRow | null) ?? null
  }

  async create(
    supabase: SupabaseClient,
    input: {
      orgId?: string | null
      userId: string
      name: string
      slug: string
      icon?: string | null
      icon_color?: string | null
      sort_order?: number
      system_kind?: string | null
      visibility?: 'workspace' | 'private' | 'selected'
      created_by?: string | null
      config?: Record<string, unknown>
    },
  ): Promise<ProgramRow> {
    const orgId = input.orgId ?? null
    const payload = {
      org_id: orgId,
      user_id: orgId ? null : input.userId,
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? null,
      icon_color: input.icon_color ?? null,
      sort_order: input.sort_order ?? 100,
      system_kind: input.system_kind ?? null,
      visibility: input.visibility ?? 'workspace',
      created_by: input.created_by ?? input.userId,
      config: input.config ?? {},
    }
    // Insert without RETURNING first: older SELECT policies that call
    // has_program_access(id) cannot see the in-flight row and reject RETURNING.
    const { error: insertError } = await supabase.from('programs').insert(payload)
    if (insertError) throw new Error(`Failed to create program: ${insertError.message}`)

    let query = supabase
      .from('programs')
      .select('*')
      .eq('slug', input.slug)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.eq('user_id', input.userId)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to load created program: ${error.message}`)
    if (!data) throw new Error('Failed to load created program')
    return data as ProgramRow
  }

  async update(
    supabase: SupabaseClient,
    id: string,
    fields: UpdateProgramInput,
    orgId?: string | null,
  ): Promise<ProgramRow | null> {
    let query = supabase
      .from('programs')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data, error } = await query.select('*').maybeSingle()
    if (error) throw new Error(`Failed to update program: ${error.message}`)
    return (data as ProgramRow | null) ?? null
  }

  async softDelete(
    supabase: SupabaseClient,
    id: string,
    orgId?: string | null,
  ): Promise<ProgramRow | null> {
    let query = supabase
      .from('programs')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data, error } = await query.select('*').maybeSingle()
    if (error) throw new Error(`Failed to delete program: ${error.message}`)
    return (data as ProgramRow | null) ?? null
  }

  async countCampaignsByProgramIds(
    supabase: SupabaseClient,
    programIds: string[],
    orgId?: string | null,
  ): Promise<Record<string, number>> {
    if (programIds.length === 0) return {}
    let query = supabase
      .from('campaigns')
      .select('program_id')
      .in('program_id', programIds)
      .is('deleted_at', null)
      .neq('status', 'archived')
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data, error } = await query
    if (error) throw new Error(`Failed to count program campaigns: ${error.message}`)
    const out: Record<string, number> = {}
    for (const row of data ?? []) {
      const id = typeof row.program_id === 'string' ? row.program_id : null
      if (!id) continue
      out[id] = (out[id] ?? 0) + 1
    }
    return out
  }

  async ensureOrgSystemPrograms(supabase: SupabaseClient, orgId: string): Promise<void> {
    const seeds = [
      { name: 'Clients', slug: 'clients', system_kind: 'clients', icon: 'users', sort_order: 0 },
      {
        name: 'ROAS Ops',
        slug: 'roas-ops',
        system_kind: 'roas_ops',
        icon: 'briefcase',
        sort_order: 1,
      },
    ]
    for (const seed of seeds) {
      const existing = await this.findSystemByKind(supabase, seed.system_kind, orgId)
      if (existing) continue
      const { error } = await supabase.from('programs').insert({
        org_id: orgId,
        user_id: null,
        name: seed.name,
        slug: seed.slug,
        system_kind: seed.system_kind,
        icon: seed.icon,
        sort_order: seed.sort_order,
        config: {},
      })
      if (error && !error.message.toLowerCase().includes('duplicate')) {
        throw new Error(`Failed to seed program ${seed.slug}: ${error.message}`)
      }
    }
  }
}

import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SpaceAutomationActionsRepository {
  async createContact(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('contacts')
      .insert(payload)
      .select('id,email,first_name,last_name')
      .single()
    if (error) throw new Error(error.message)
    return (data ?? {}) as Record<string, unknown>
  }

  async readContactTags(supabase: SupabaseClient, contactId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('tags')
      .eq('id', contactId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    const tags = (data as { tags?: unknown } | null)?.tags
    return Array.isArray(tags) ? tags.map((tag) => String(tag)).filter(Boolean) : []
  }

  async updateContact(supabase: SupabaseClient, contactId: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from('contacts').update(patch).eq('id', contactId)
    if (error) throw new Error(error.message)
  }

  async insertContactNote(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { error } = await supabase.from('contact_notes').insert(payload)
    if (error) throw new Error(error.message)
  }

  async createArtifact(supabase: SupabaseClient, table: string, payload: Record<string, unknown>) {
    await supabase.from(table).insert(payload).select().single()
  }

  async updateArtifactStatus(
    supabase: SupabaseClient,
    table: string,
    artifactId: string,
    status: 'published' | 'draft',
  ) {
    const { error } = await supabase
      .from(table)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', artifactId)
    if (error) throw new Error(error.message)
  }

  async updateTaskExecutionState(
    supabase: SupabaseClient,
    spaceId: string,
    itemId: string,
    patch: Record<string, unknown>,
  ) {
    const { error } = await supabase
      .from('space_items')
      .update(patch)
      .eq('id', itemId)
      .eq('space_id', spaceId)
    if (error) throw new Error(error.message)
  }

  async findCompanyBrainId(supabase: SupabaseClient, orgId: string): Promise<string> {
    const { data, error } = await supabase
      .from('ns_brains')
      .select('id')
      .eq('scope', 'company')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data?.id ? String(data.id) : ''
  }

  async findAgentBrainId(
    supabase: SupabaseClient,
    args: { agentKey: string; userId: string; orgId: string | null },
  ): Promise<string | null> {
    let query = supabase
      .from('ns_brains')
      .select('id, status')
      .eq('agent_id', args.agentKey)
      .not('status', 'eq', 'deleted')
    if (args.orgId) query = query.eq('org_id', args.orgId)
    else query = query.eq('owner_id', args.userId).is('org_id', null)

    const { data, error } = await query.maybeSingle<{ id: string; status: string }>()
    if (error) throw new Error(error.message)
    return data?.id ? String(data.id) : null
  }

  async findScopedBrainId(
    supabase: SupabaseClient,
    args: { scope: 'customer'; userId: string; orgId: string | null },
  ): Promise<string | null> {
    let query = supabase.from('ns_brains').select('id').eq('scope', args.scope).limit(1)
    if (args.orgId) query = query.eq('org_id', args.orgId)
    else query = query.eq('owner_id', args.userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(error.message)
    return data?.id ? String(data.id) : null
  }

  async findEmailArtifactForSend(
    supabase: SupabaseClient,
    artifactId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('emails')
      .select('id, subject, body, space_id, source_item_id')
      .eq('id', artifactId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async searchCompanyCortexObjects(
    supabase: SupabaseClient,
    brainId: string,
    term: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('company_cortex_objects')
      .select('id, object_type, title, truth, confidence')
      .eq('brain_id', brainId)
      .neq('status', 'retired')
      .or(`title.ilike.%${term}%,truth.ilike.%${term}%`)
      .order('confidence', { ascending: false })
      .limit(3)
    if (error) throw new Error(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }

  async findMissionById(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data ?? null) as Record<string, unknown> | null
  }

  async listMissionDeliverables(
    supabase: SupabaseClient,
    missionId: string,
  ): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase
      .from('mission_deliverables')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as Record<string, unknown>[]
  }
}

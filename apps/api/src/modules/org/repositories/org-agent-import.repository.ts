import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type DbRow = Record<string, unknown>

@Injectable()
export class OrgAgentImportRepository {
  async findPersonalAgent(supabase: SupabaseClient, userId: string, agentKey: string) {
    const { data } = await supabase
      .from('agents_registry')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
      .is('org_id', null)
      .maybeSingle()
    return data as DbRow | null
  }

  async findOrgAgent(supabase: SupabaseClient, orgId: string, agentKey: string) {
    const { data } = await supabase
      .from('agents_registry')
      .select('id')
      .eq('org_id', orgId)
      .eq('agent_key', agentKey)
      .maybeSingle()
    return data as DbRow | null
  }

  async insertImportedAgent(supabase: SupabaseClient, agent: DbRow) {
    const { data, error } = await supabase.from('agents_registry').insert(agent).select().single()
    return { data: data as DbRow | null, error }
  }

  async listPersonalAgentSkills(supabase: SupabaseClient, userId: string, agentKey: string) {
    const { data } = await supabase
      .from('agent_skills')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
      .is('org_id', null)
    return (data ?? []) as DbRow[]
  }

  async insertAgentSkills(supabase: SupabaseClient, skills: DbRow[]) {
    const { error } = await supabase.from('agent_skills').insert(skills)
    return error
  }

  async listPersonalAgentSkillResources(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
  ) {
    const { data } = await supabase
      .from('agent_skill_resources')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
      .is('org_id', null)
    return (data ?? []) as DbRow[]
  }

  async insertAgentSkillResources(supabase: SupabaseClient, resources: DbRow[]) {
    const { error } = await supabase.from('agent_skill_resources').insert(resources)
    return error
  }

  async listPersonalAgentDefinitions(supabase: SupabaseClient, userId: string, agentKey: string) {
    const { data } = await supabase
      .from('agent_definitions')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
      .is('org_id', null)
    return (data ?? []) as DbRow[]
  }

  async insertAgentDefinitions(supabase: SupabaseClient, definitions: DbRow[]) {
    const { error } = await supabase.from('agent_definitions').insert(definitions)
    return error
  }

  async findPersonalAgentBrain(supabase: SupabaseClient, userId: string, agentKey: string) {
    const { data } = await supabase
      .from('ns_brains')
      .select('*')
      .eq('owner_id', userId)
      .eq('agent_id', agentKey)
      .is('org_id', null)
      .maybeSingle()
    return data as DbRow | null
  }

  async insertImportedBrain(supabase: SupabaseClient, brain: DbRow) {
    const { data, error } = await supabase.from('ns_brains').insert(brain).select().single()
    return { data: data as DbRow | null, error }
  }

  async listBrainMemories(supabase: SupabaseClient, brainId: string) {
    const { data } = await supabase.from('ns_memories').select('*').eq('brain_id', brainId)
    return (data ?? []) as DbRow[]
  }

  async insertBrainMemories(supabase: SupabaseClient, memories: DbRow[]) {
    await supabase.from('ns_memories').insert(memories)
  }

  async listBrainSkEntries(supabase: SupabaseClient, brainId: string) {
    const { data } = await supabase.from('ns_sk_entries').select('*').eq('brain_id', brainId)
    return (data ?? []) as DbRow[]
  }

  async insertBrainSkEntries(supabase: SupabaseClient, entries: DbRow[]) {
    await supabase.from('ns_sk_entries').insert(entries)
  }

  async listBrainSnapshots(supabase: SupabaseClient, brainId: string) {
    const { data } = await supabase.from('ns_snapshots').select('*').eq('brain_id', brainId)
    return (data ?? []) as DbRow[]
  }

  async insertBrainSnapshots(supabase: SupabaseClient, snapshots: DbRow[]) {
    await supabase.from('ns_snapshots').insert(snapshots)
  }
}

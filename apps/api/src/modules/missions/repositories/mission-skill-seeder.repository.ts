import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SeedSkillRow = {
  skill_key: string
  name: string
  description: string
  markdown_content: string
}

export type SeedSkillResourceRow = {
  skill_key: string
  file_path: string
  content: string
}

@Injectable()
export class MissionSkillSeederRepository {
  async listCloneableSkills(
    supabase: SupabaseClient,
    userId: string,
    sourceAgentKey: string,
    skillKeys: string[],
  ): Promise<{ rows: SeedSkillRow[]; errorMessage?: string }> {
    const { data, error } = await supabase
      .from('agent_skills')
      .select('skill_key, name, description, markdown_content')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .or(`agent_key.eq.${sourceAgentKey},agent_key.eq.*`)
      .in('skill_key', skillKeys)
    if (error) return { rows: [], errorMessage: error.message }
    return { rows: (data ?? []) as SeedSkillRow[] }
  }

  async listSourceSkillResources(
    supabase: SupabaseClient,
    userId: string,
    sourceAgentKey: string,
    skillKeys: string[],
  ): Promise<SeedSkillResourceRow[]> {
    const { data } = await supabase
      .from('agent_skill_resources')
      .select('skill_key, file_path, content')
      .eq('user_id', userId)
      .eq('agent_key', sourceAgentKey)
      .in('skill_key', skillKeys)
    return (data ?? []) as SeedSkillResourceRow[]
  }

  async listLibrarySkills(
    supabase: SupabaseClient,
    skillKeys: string[],
  ): Promise<{ rows: SeedSkillRow[]; errorMessage?: string }> {
    const { data, error } = await supabase
      .from('skill_library')
      .select('skill_key, name, description, markdown_content')
      .in('skill_key', skillKeys)
    if (error) return { rows: [], errorMessage: error.message }
    return { rows: (data ?? []) as SeedSkillRow[] }
  }

  async listLibrarySkillResources(
    supabase: SupabaseClient,
    skillKeys: string[],
  ): Promise<SeedSkillResourceRow[]> {
    const { data } = await supabase
      .from('skill_library_resources')
      .select('skill_key, file_path, content')
      .in('skill_key', skillKeys)
    return (data ?? []) as SeedSkillResourceRow[]
  }

  async findLoopAgent(supabase: SupabaseClient, orgId: string) {
    const { data } = await supabase
      .from('agents_registry')
      .select('id, sync_status')
      .eq('agent_key', 'loop')
      .eq('org_id', orgId)
      .is('user_id', null)
      .maybeSingle()
    return data as { id?: string; sync_status?: string | null } | null
  }

  async createLoopAgent(supabase: SupabaseClient, userId: string, orgId: string) {
    const { error } = await supabase.from('agents_registry').insert({
      user_id: null,
      org_id: orgId,
      agent_key: 'loop',
      name: 'Loop',
      role: 'Flows Builder',
      skills: ['flow-builder', 'vibey-api'],
      level: 'system',
      status: 'idle',
      config: {
        capability_profile: 'system_flows',
        capability_domain: 'flows',
        platform_managed: true,
        model_id: 'auto',
      },
      is_system: true,
      is_active: true,
      sync_status: 'ready',
      created_by: userId,
    })
    if (error) throw new Error(`Failed to ensure Loop agent: ${error.message}`)
  }

  async findHrAgent(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    let query = supabase.from('agents_registry').select('id, sync_status').eq('agent_key', 'hr')
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data } = await query.maybeSingle()
    return data as { id?: string; sync_status?: string | null } | null
  }
}

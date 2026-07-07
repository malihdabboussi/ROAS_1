import { ForbiddenException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSystemTemplateKey } from '../lib/system-agent-keys'
import { MissionsRepositoryAgentConfigBase } from './missions-repository-agent-config.base'
import type {
  AgentEmployeeTemplateRow,
  UpsertAgentTemplateDefinitionInput,
  UpsertAgentTemplateSkillInput,
} from './missions-repository.shared'

export abstract class MissionsRepositoryTemplatesBase extends MissionsRepositoryAgentConfigBase {
  async listAgentDefinitions(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    let query = supabase
      .from('agent_definitions')
      .select('file_name, content, updated_at')
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query
    if (error) throw new Error(`Failed to list agent definitions: ${error.message}`)
    return data || []
  }

  async listAgentDefinitionsForGatewayRegistration(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
  ) {
    const { data, error } = await supabase
      .from('agent_definitions')
      .select('file_name, content')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
    if (error) throw new Error(`Failed to list agent definitions: ${error.message}`)
    return (data ?? []) as Array<{ file_name: string; content: string }>
  }

  async listTemplateDefinitions(supabase: SupabaseClient, templateKey: string) {
    const { data, error } = await supabase
      .from('agent_templates')
      .select('file_name, content')
      .eq('template_key', templateKey)
      .order('file_name', { ascending: true })
    if (error) throw new Error(`Failed to list template definitions: ${error.message}`)
    return data || []
  }

  async countTemplateSkillAssignmentsForCatalogSeed(supabase: SupabaseClient) {
    const { count } = await supabase
      .from('template_skill_assignments')
      .select('*', { count: 'exact', head: true })
    return count ?? 0
  }

  async listEnabledEmployeeTemplateKeysForCatalogSeed(supabase: SupabaseClient) {
    const { data } = await supabase
      .from('agent_employee_templates')
      .select('template_key')
      .eq('is_enabled', true)
    return data || []
  }

  async listExistingTemplateKeysForCatalogSeed(supabase: SupabaseClient, templateKeys: string[]) {
    const { data } = await supabase
      .from('agent_templates')
      .select('template_key')
      .in('template_key', templateKeys)
    return data || []
  }

  async upsertTemplateDefinition(
    supabase: SupabaseClient,
    input: UpsertAgentTemplateDefinitionInput,
  ) {
    const { data, error } = await supabase
      .from('agent_templates')
      .upsert(input, { onConflict: 'template_key,file_name' })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to upsert template definition: ${error.message}`)
    return data
  }

  async listTemplateSkills(supabase: SupabaseClient, templateKey: string) {
    const { data: assignments, error } = await supabase
      .from('template_skill_assignments')
      .select('template_key, skill_key, is_enabled')
      .eq('template_key', templateKey)
      .eq('is_enabled', true)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to list template skill assignments: ${error.message}`)
    if (!assignments?.length) return []

    const skillKeys = assignments.map((a) => a.skill_key)
    const { data: libraryRows, error: libError } = await supabase
      .from('skill_library')
      .select('skill_key, name, description, markdown_content')
      .in('skill_key', skillKeys)
    if (libError) throw new Error(`Failed to fetch skill library: ${libError.message}`)

    const { data: resourceRows } = await supabase
      .from('skill_library_resources')
      .select('skill_key, file_path, content')
      .in('skill_key', skillKeys)

    const libMap = new Map((libraryRows ?? []).map((r) => [r.skill_key, r]))
    const resMap = new Map<string, Array<{ file_path: string; content: string }>>()
    for (const r of resourceRows ?? []) {
      if (!resMap.has(r.skill_key)) resMap.set(r.skill_key, [])
      resMap.get(r.skill_key)!.push({ file_path: r.file_path, content: r.content })
    }

    return assignments
      .map((a) => {
        const lib = libMap.get(a.skill_key)
        if (!lib) return null
        return {
          template_key: a.template_key,
          skill_key: a.skill_key,
          name: lib.name,
          description: lib.description,
          markdown_content: lib.markdown_content,
          resources: resMap.get(a.skill_key) ?? [],
          is_enabled: a.is_enabled,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }

  async listEmployeeTemplates(supabase: SupabaseClient): Promise<AgentEmployeeTemplateRow[]> {
    const { data, error } = await supabase
      .from('agent_employee_templates')
      .select('*')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to list employee templates: ${error.message}`)
    return (data as AgentEmployeeTemplateRow[]) || []
  }

  async getEmployeeTemplate(
    supabase: SupabaseClient,
    roleKey: string,
  ): Promise<AgentEmployeeTemplateRow | null> {
    const { data, error } = await supabase
      .from('agent_employee_templates')
      .select('*')
      .eq('role_key', roleKey)
      .eq('is_enabled', true)
      .maybeSingle()
    if (error) throw new Error(`Failed to load employee template: ${error.message}`)
    return (data as AgentEmployeeTemplateRow | null) ?? null
  }

  async upsertTemplateSkill(supabase: SupabaseClient, input: UpsertAgentTemplateSkillInput) {
    if (isSystemTemplateKey(input.template_key)) {
      throw new ForbiddenException(
        `Cannot upsert template skill for '${input.template_key}': system agents (atlas, vibey, hr, viktor) do not use the per-user template-clone path. Update the canonical content via scripts/seed-system-agents.ts.`,
      )
    }
    const { error: libError } = await supabase
      .from('skill_library')
      .upsert(
        {
          skill_key: input.skill_key,
          name: input.name,
          description: input.description,
          markdown_content: input.markdown_content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'skill_key' },
      )
      .select('*')
      .single()
    if (libError) throw new Error(`Failed to upsert skill library entry: ${libError.message}`)

    const resources = input.resources ?? []
    if (resources.length > 0) {
      for (const res of resources) {
        await supabase
          .from('skill_library_resources')
          .upsert(
            { skill_key: input.skill_key, file_path: res.file_path, content: res.content },
            { onConflict: 'skill_key,file_path' },
          )
      }
    }

    const { data, error } = await supabase
      .from('template_skill_assignments')
      .upsert(
        {
          template_key: input.template_key,
          skill_key: input.skill_key,
          is_enabled: input.is_enabled ?? true,
        },
        { onConflict: 'template_key,skill_key' },
      )
      .select('*')
      .single()
    if (error) throw new Error(`Failed to upsert template skill assignment: ${error.message}`)

    // Keep legacy table in sync for rollback safety
    await supabase.from('agent_template_skills').upsert(
      {
        template_key: input.template_key,
        skill_key: input.skill_key,
        name: input.name,
        description: input.description,
        markdown_content: input.markdown_content,
        resources: input.resources ?? [],
        is_enabled: input.is_enabled ?? true,
      },
      { onConflict: 'template_key,skill_key' },
    )

    return data
  }
}

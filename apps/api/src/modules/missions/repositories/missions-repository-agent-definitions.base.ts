import type { SupabaseClient } from '@supabase/supabase-js'
import { isSystemAgentKey } from '../lib/system-agent-keys'
import { MissionsRepositoryTemplatesBase } from './missions-repository-templates.base'

export abstract class MissionsRepositoryAgentDefinitionsBase extends MissionsRepositoryTemplatesBase {
  async upsertAgentDefinition(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    fileName: string,
    content: string,
  ) {
    if (isSystemAgentKey(agentKey)) {
      return { agent_key: agentKey, file_name: fileName, content: '', _locked: true }
    }
    const effectiveUserId = orgId ? null : userId
    let lookupQ = supabase
      .from('agent_definitions')
      .select('id')
      .eq('agent_key', agentKey)
      .eq('file_name', fileName)
    if (orgId) {
      lookupQ = lookupQ.eq('org_id', orgId).is('user_id', null)
    } else {
      lookupQ = lookupQ.eq('user_id', userId).is('org_id', null)
    }
    const { data: existing, error: lookupError } = await lookupQ.maybeSingle()
    if (lookupError) throw new Error(`Failed to lookup agent definition: ${lookupError.message}`)

    if (existing?.id) {
      const { data, error } = await supabase
        .from('agent_definitions')
        .update({ content })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw new Error(`Failed to update agent definition: ${error.message}`)
      return data
    }

    const { data, error } = await supabase
      .from('agent_definitions')
      .insert({
        user_id: effectiveUserId,
        org_id: orgId ?? null,
        agent_key: agentKey,
        file_name: fileName,
        content,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to insert agent definition: ${error.message}`)
    return data
  }

  async internalUpsertAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    skillKey: string,
    name: string,
    description: string,
    markdownContent: string,
    source?: 'system' | 'template' | 'default' | 'user',
  ) {
    if (isSystemAgentKey(agentKey)) {
      // System agents read from the canonical (NULL,NULL) row only. Do not seed per-user clones.
      const { data: systemRow } = await supabase
        .from('agent_skills')
        .select('id')
        .eq('agent_key', agentKey)
        .eq('skill_key', skillKey)
        .is('user_id', null)
        .is('org_id', null)
        .maybeSingle()
      return systemRow ?? { agent_key: agentKey, skill_key: skillKey, _locked: true }
    }
    const effectiveUserId = orgId ? null : userId
    let lookupQ = supabase
      .from('agent_skills')
      .select('id')
      .eq('agent_key', agentKey)
      .eq('skill_key', skillKey)
    if (orgId) {
      lookupQ = lookupQ.eq('org_id', orgId).is('user_id', null)
    } else {
      lookupQ = lookupQ.eq('user_id', userId).is('org_id', null)
    }
    const { data: existing } = await lookupQ.maybeSingle()

    if (existing) {
      const updates: Record<string, unknown> = {
        name,
        description,
        markdown_content: markdownContent,
        is_enabled: true,
      }
      if (source) updates.source = source
      const { data, error } = await supabase
        .from('agent_skills')
        .update(updates)
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw new Error(`Failed to update agent skill: ${error.message}`)
      return data
    }

    const { data: systemRow } = await supabase
      .from('agent_skills')
      .select('id')
      .eq('agent_key', agentKey)
      .eq('skill_key', skillKey)
      .is('user_id', null)
      .is('org_id', null)
      .maybeSingle()
    if (systemRow) {
      return systemRow
    }

    const { data, error } = await supabase
      .from('agent_skills')
      .insert({
        user_id: effectiveUserId,
        org_id: orgId ?? null,
        agent_key: agentKey,
        skill_key: skillKey,
        name,
        description,
        markdown_content: markdownContent,
        is_enabled: true,
        ...(source ? { source } : {}),
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to insert agent skill: ${error.message}`)
    return data
  }

  async internalUpsertAgentSkillResource(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillKey: string,
    filePath: string,
    content: string,
    orgId?: string | null,
  ) {
    if (isSystemAgentKey(agentKey)) {
      // System agents read from canonical (NULL,NULL) resources only. Do not seed per-user clones.
      const { data: systemRow } = await supabase
        .from('agent_skill_resources')
        .select('id')
        .eq('agent_key', agentKey)
        .eq('skill_key', skillKey)
        .eq('file_path', filePath)
        .is('user_id', null)
        .is('org_id', null)
        .maybeSingle()
      return (
        systemRow ?? {
          agent_key: agentKey,
          skill_key: skillKey,
          file_path: filePath,
          _locked: true,
        }
      )
    }
    const effectiveUserId = orgId ? null : userId
    let lookupQ = supabase
      .from('agent_skill_resources')
      .select('id')
      .eq('agent_key', agentKey)
      .eq('skill_key', skillKey)
      .eq('file_path', filePath)
    if (orgId) {
      lookupQ = lookupQ.eq('org_id', orgId).is('user_id', null)
    } else {
      lookupQ = lookupQ.eq('user_id', userId).is('org_id', null)
    }
    const { data: existing } = await lookupQ.maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('agent_skill_resources')
        .update({ content })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw new Error(`Failed to update agent skill resource: ${error.message}`)
      return data
    }

    const { data, error } = await supabase
      .from('agent_skill_resources')
      .insert({
        user_id: effectiveUserId,
        org_id: orgId ?? null,
        agent_key: agentKey,
        skill_key: skillKey,
        file_path: filePath,
        content,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to insert agent skill resource: ${error.message}`)
    return data
  }

  async createAgentWithDefinitions(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    name: string,
    role: string,
    level: string,
    skills: string[],
    imageUrl: string | null,
    definitions: Array<{ file_name: string; content: string }>,
    config?: Record<string, unknown>,
    specialty?: string | null,
    teamId?: string | null,
  ) {
    const effectiveUserId = orgId ? null : userId
    const { data: agent, error: agentError } = await supabase
      .from('agents_registry')
      .insert({
        user_id: effectiveUserId,
        org_id: orgId ?? null,
        agent_key: agentKey,
        name,
        role,
        skills,
        level,
        image_url: imageUrl,
        ...(specialty ? { specialty } : {}),
        ...(config ? { config } : {}),
        ...(teamId ? { team_id: teamId } : {}),
        ...(orgId ? { created_by: userId } : {}),
        sync_status: 'syncing',
      })
      .select('*')
      .single()
    if (agentError) throw new Error(`Failed to create agent: ${agentError.message}`)

    if (definitions.length > 0 && !isSystemAgentKey(agentKey)) {
      const rows = definitions.map((d) => ({
        user_id: effectiveUserId,
        org_id: orgId ?? null,
        agent_key: agentKey,
        file_name: d.file_name,
        content: d.content,
      }))
      const conflictTarget = orgId ? 'org_id,agent_key,file_name' : 'user_id,agent_key,file_name'
      const { error: defError } = await supabase
        .from('agent_definitions')
        .upsert(rows, { onConflict: conflictTarget, ignoreDuplicates: true })
      if (defError) throw new Error(`Failed to seed agent definitions: ${defError.message}`)
    }

    return agent
  }
}

import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepositorySkillsListBase } from './missions-repository-skills-list.base'
import {
  isRemovedSkillResourceRow,
  rejectSkillWriteForLockedAgents,
  type CreateAgentSkillInput,
  type CreateAgentSkillResourceInput,
} from './missions-repository.shared'

export abstract class MissionsRepositorySkillsCrudBase extends MissionsRepositorySkillsListBase {
  async getAgentSkillOwnership(supabase: SupabaseClient, skillId: string) {
    const { data, error } = await supabase
      .from('agent_skills')
      .select('user_id, org_id')
      .eq('id', skillId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load agent skill ownership: ${error.message}`)
    return data
  }

  async renameAgentSkillResourcesForSkillKey(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillId: string,
    nextSkillKey: string,
    orgId?: string | null,
  ) {
    let fetchQuery = supabase
      .from('agent_skills')
      .select('skill_key')
      .eq('id', skillId)
      .eq('agent_key', agentKey)
    if (orgId) {
      fetchQuery = fetchQuery.eq('org_id', orgId).is('user_id', null)
    } else {
      fetchQuery = fetchQuery.eq('user_id', userId).is('org_id', null)
    }
    const { data: current } = await fetchQuery.single()
    if (!current || current.skill_key === nextSkillKey) return

    let resourceQuery = supabase
      .from('agent_skill_resources')
      .update({ skill_key: nextSkillKey })
      .eq('skill_key', current.skill_key)
      .eq('agent_key', agentKey)
    if (orgId) {
      resourceQuery = resourceQuery.eq('org_id', orgId).is('user_id', null)
    } else {
      resourceQuery = resourceQuery.eq('user_id', userId).is('org_id', null)
    }
    await resourceQuery
  }

  async uploadAgentSkillAsset(
    supabase: SupabaseClient,
    input: {
      user_id: string
      agent_key: string
      skill_key: string
      original_name: string
      buffer: Buffer
      content_type: string
    },
  ): Promise<{ publicUrl: string }> {
    const ext = (input.original_name.split('.').pop() || 'bin').toLowerCase()
    const objectPath = `${input.user_id}/${input.agent_key}/${input.skill_key}/${randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('skill-assets')
      .upload(objectPath, input.buffer, { contentType: input.content_type, upsert: false })
    if (uploadError) throw new Error(`Skill asset upload failed: ${uploadError.message}`)

    const {
      data: { publicUrl },
    } = supabase.storage.from('skill-assets').getPublicUrl(objectPath)

    return { publicUrl }
  }

  async createAgentSkill(supabase: SupabaseClient, input: CreateAgentSkillInput) {
    rejectSkillWriteForLockedAgents(input.agent_key, 'create skill')
    const { data, error } = await supabase
      .from('agent_skills')
      .insert({
        user_id: input.org_id ? null : input.user_id,
        org_id: input.org_id ?? null,
        agent_key: input.agent_key,
        skill_key: input.skill_key,
        name: input.name,
        description: input.description,
        markdown_content: input.markdown_content,
        is_enabled: input.is_enabled ?? true,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create agent skill: ${error.message}`)
    return data
  }

  async updateAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillId: string,
    updates: Partial<{
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled: boolean
    }>,
    orgId?: string | null,
  ) {
    rejectSkillWriteForLockedAgents(agentKey, 'update skill')
    let query = supabase
      .from('agent_skills')
      .update(updates)
      .eq('id', skillId)
      .eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.select('*').single()
    if (error) throw new Error(`Failed to update agent skill: ${error.message}`)
    return data
  }

  async deleteAgentSkill(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    skillId: string,
    orgId?: string | null,
  ) {
    rejectSkillWriteForLockedAgents(agentKey, 'delete skill')
    let lookupQ = supabase
      .from('agent_skills')
      .select('skill_key')
      .eq('id', skillId)
      .eq('agent_key', agentKey)
    if (orgId) {
      lookupQ = lookupQ.eq('org_id', orgId).is('user_id', null)
    } else {
      lookupQ = lookupQ.eq('user_id', userId).is('org_id', null)
    }
    const { data: skillRow } = await lookupQ.maybeSingle()

    if (skillRow?.skill_key) {
      let resQ = supabase
        .from('agent_skill_resources')
        .delete()
        .eq('agent_key', agentKey)
        .eq('skill_key', skillRow.skill_key)
      if (orgId) {
        resQ = resQ.eq('org_id', orgId).is('user_id', null)
      } else {
        resQ = resQ.eq('user_id', userId).is('org_id', null)
      }
      await resQ
    }

    let query = supabase.from('agent_skills').delete().eq('id', skillId).eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { error } = await query
    if (error) throw new Error(`Failed to delete agent skill: ${error.message}`)
    return { deleted: true }
  }

  async createAgentSkillResource(supabase: SupabaseClient, input: CreateAgentSkillResourceInput) {
    rejectSkillWriteForLockedAgents(input.agent_key, 'create skill resource')
    const effectiveUserId = input.org_id ? null : input.user_id
    let lookupQ = supabase
      .from('agent_skill_resources')
      .select('id, content_type')
      .eq('agent_key', input.agent_key)
      .eq('skill_key', input.skill_key)
      .eq('file_path', input.file_path)
    if (input.org_id) {
      lookupQ = lookupQ.eq('org_id', input.org_id).is('user_id', null)
    } else {
      lookupQ = lookupQ.eq('user_id', input.user_id).is('org_id', null)
    }
    const { data: existing } = await lookupQ.maybeSingle()

    const updatePayload: Record<string, unknown> = {}
    if (input.content !== undefined) updatePayload.content = input.content
    if (input.content_type) {
      updatePayload.content_type = input.content_type
    } else if (existing && isRemovedSkillResourceRow(existing)) {
      updatePayload.content_type = 'text/markdown'
    }
    if (input.storage_url !== undefined) updatePayload.storage_url = input.storage_url

    if (existing) {
      const { data, error } = await supabase
        .from('agent_skill_resources')
        .update(updatePayload)
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
        org_id: input.org_id ?? null,
        agent_key: input.agent_key,
        skill_key: input.skill_key,
        file_path: input.file_path,
        content: input.content ?? null,
        content_type: input.content_type ?? 'text/markdown',
        storage_url: input.storage_url ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create agent skill resource: ${error.message}`)
    return data
  }
}

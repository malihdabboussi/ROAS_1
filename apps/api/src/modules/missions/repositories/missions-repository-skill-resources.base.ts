import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepositorySkillsCrudBase } from './missions-repository-skills-crud.base'
import {
  REMOVED_SKILL_RESOURCE_CONTENT_TYPE,
  isRemovedSkillResourceRow,
  rejectSkillWriteForLockedAgents,
  type AgentSkillResourceRow,
} from './missions-repository.shared'

export abstract class MissionsRepositorySkillResourcesBase extends MissionsRepositorySkillsCrudBase {
  private async assertSkillResourcePathAvailable(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      file_path: string
      exclude_resource_id?: string
    },
  ) {
    let scopedQ = supabase
      .from('agent_skill_resources')
      .select('id, content_type')
      .eq('skill_key', input.skill_key)
      .eq('file_path', input.file_path)
      .or(`agent_key.eq.${input.agent_key},agent_key.eq.*`)
    if (input.org_id) {
      scopedQ = scopedQ.eq('org_id', input.org_id).is('user_id', null)
    } else {
      scopedQ = scopedQ.eq('user_id', input.user_id).is('org_id', null)
    }
    const { data: scopedConflicts, error } = await scopedQ
    if (error) throw new Error(`Failed to check agent skill resource path: ${error.message}`)
    const scopedRows = (scopedConflicts ?? []) as Array<{ id: string; content_type: string | null }>
    const activeScopedConflict = scopedRows.find(
      (row) => row.id !== input.exclude_resource_id && !isRemovedSkillResourceRow(row),
    )
    if (activeScopedConflict) {
      throw new Error('Agent skill resource path already exists')
    }
    const scopedTombstone = scopedRows.some(
      (row) => row.id !== input.exclude_resource_id && isRemovedSkillResourceRow(row),
    )
    if (scopedTombstone) return

    const { data: canonicalConflicts, error: canonicalError } = await supabase
      .from('agent_skill_resources')
      .select('id, content_type')
      .eq('skill_key', input.skill_key)
      .eq('file_path', input.file_path)
      .or(`agent_key.eq.${input.agent_key},agent_key.eq.*`)
      .is('user_id', null)
      .is('org_id', null)
    if (canonicalError) {
      throw new Error(`Failed to check agent skill resource path: ${canonicalError.message}`)
    }
    const canonicalRows = (canonicalConflicts ?? []) as Array<{
      id: string
      content_type: string | null
    }>
    const activeCanonicalConflict = canonicalRows.find(
      (row) => row.id !== input.exclude_resource_id && !isRemovedSkillResourceRow(row),
    )
    if (activeCanonicalConflict) {
      throw new Error('Agent skill resource path already exists')
    }
  }

  private async findScopedRemovedSkillResourceAtPath(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      file_path: string
    },
  ): Promise<{ id: string } | null> {
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
    const { data, error } = await lookupQ.maybeSingle()
    if (error) throw new Error(`Failed to load agent skill resource: ${error.message}`)
    if (!data || !isRemovedSkillResourceRow(data)) return null
    return { id: data.id as string }
  }

  private async upsertScopedMovedSkillResource(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      file_path: string
    },
    source: AgentSkillResourceRow,
  ) {
    const existingRemoved = await this.findScopedRemovedSkillResourceAtPath(supabase, input)
    const payload = {
      content: source.content,
      content_type: source.content_type ?? 'text/markdown',
      storage_url: source.storage_url,
    }

    if (existingRemoved) {
      const { data, error } = await supabase
        .from('agent_skill_resources')
        .update(payload)
        .eq('id', existingRemoved.id)
        .select('*')
        .single()
      if (error) throw new Error(`Failed to move agent skill resource: ${error.message}`)
      return data
    }

    const effectiveUserId = input.org_id ? null : input.user_id
    const { data, error } = await supabase
      .from('agent_skill_resources')
      .insert({
        user_id: effectiveUserId,
        org_id: input.org_id ?? null,
        agent_key: input.agent_key,
        skill_key: input.skill_key,
        file_path: input.file_path,
        ...payload,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to move agent skill resource: ${error.message}`)
    return data
  }

  private async resolveAgentSkillResourceForUpdate(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      resource_id: string
    },
  ): Promise<
    | { kind: 'owned'; row: AgentSkillResourceRow }
    | { kind: 'canonical'; row: AgentSkillResourceRow }
  > {
    const selectCols =
      'id, agent_key, skill_key, file_path, content, content_type, storage_url, user_id, org_id'
    const agentKeyFilter = `agent_key.eq.${input.agent_key},agent_key.eq.*`

    let ownedQ = supabase
      .from('agent_skill_resources')
      .select(selectCols)
      .eq('id', input.resource_id)
      .eq('skill_key', input.skill_key)
      .or(agentKeyFilter)
    if (input.org_id) {
      ownedQ = ownedQ.eq('org_id', input.org_id).is('user_id', null)
    } else {
      ownedQ = ownedQ.eq('user_id', input.user_id).is('org_id', null)
    }
    const { data: owned, error: ownedError } = await ownedQ.maybeSingle()
    if (ownedError) throw new Error(`Failed to load agent skill resource: ${ownedError.message}`)
    if (owned) {
      return { kind: 'owned', row: owned as AgentSkillResourceRow }
    }

    let canonicalQ = supabase
      .from('agent_skill_resources')
      .select(selectCols)
      .eq('id', input.resource_id)
      .eq('skill_key', input.skill_key)
      .or(agentKeyFilter)
      .is('user_id', null)
      .is('org_id', null)
    const { data: canonical, error: canonicalError } = await canonicalQ.maybeSingle()
    if (canonicalError) {
      throw new Error(`Failed to load agent skill resource: ${canonicalError.message}`)
    }
    if (canonical) {
      return { kind: 'canonical', row: canonical as AgentSkillResourceRow }
    }

    throw new Error('Agent skill resource not found')
  }

  private async forkCanonicalSkillResourceMove(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      file_path: string
    },
    canonical: AgentSkillResourceRow,
  ) {
    await this.assertSkillResourcePathAvailable(supabase, input)

    const moved = await this.upsertScopedMovedSkillResource(supabase, input, canonical)

    await this.createAgentSkillResource(supabase, {
      user_id: input.user_id,
      org_id: input.org_id,
      agent_key: input.agent_key,
      skill_key: input.skill_key,
      file_path: canonical.file_path,
      content: null,
      content_type: REMOVED_SKILL_RESOURCE_CONTENT_TYPE,
    })

    return moved
  }

  async updateAgentSkillResource(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      resource_id: string
      file_path: string
    },
  ) {
    rejectSkillWriteForLockedAgents(input.agent_key, 'update skill resource')
    const resolved = await this.resolveAgentSkillResourceForUpdate(supabase, input)

    if (resolved.kind === 'canonical') {
      if (resolved.row.file_path === input.file_path) {
        return resolved.row
      }
      const moved = await this.forkCanonicalSkillResourceMove(supabase, input, resolved.row)
      return moved
    }

    const existing = resolved.row
    if (existing.file_path !== input.file_path) {
      await this.assertSkillResourcePathAvailable(supabase, {
        ...input,
        exclude_resource_id: existing.id,
      })
      const targetRemoved = await this.findScopedRemovedSkillResourceAtPath(supabase, input)
      if (targetRemoved) {
        const moved = await this.upsertScopedMovedSkillResource(supabase, input, existing)
        const { error: deleteOldError } = await supabase
          .from('agent_skill_resources')
          .delete()
          .eq('id', existing.id)
        if (deleteOldError) {
          throw new Error(`Failed to remove old agent skill resource: ${deleteOldError.message}`)
        }
        return moved
      }
    }

    const { data, error } = await supabase
      .from('agent_skill_resources')
      .update({ file_path: input.file_path })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update agent skill resource: ${error.message}`)
    return data
  }

  async deleteAgentSkillResource(
    supabase: SupabaseClient,
    input: {
      user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      resource_id: string
    },
  ) {
    rejectSkillWriteForLockedAgents(input.agent_key, 'delete skill resource')
    const resolved = await this.resolveAgentSkillResourceForUpdate(supabase, input)

    if (resolved.kind === 'canonical') {
      const existingTombstone = await this.findScopedRemovedSkillResourceAtPath(supabase, {
        ...input,
        file_path: resolved.row.file_path,
      })
      if (!existingTombstone) {
        await this.createAgentSkillResource(supabase, {
          user_id: input.user_id,
          org_id: input.org_id,
          agent_key: input.agent_key,
          skill_key: input.skill_key,
          file_path: resolved.row.file_path,
          content: null,
          content_type: REMOVED_SKILL_RESOURCE_CONTENT_TYPE,
        })
      }
      return { deleted: true, tombstoned: true as const }
    }

    const { error } = await supabase
      .from('agent_skill_resources')
      .delete()
      .eq('id', resolved.row.id)
    if (error) throw new Error(`Failed to delete agent skill resource: ${error.message}`)
    return { deleted: true, tombstoned: false as const }
  }
}

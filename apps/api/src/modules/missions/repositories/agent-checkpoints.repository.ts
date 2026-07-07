import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope } from '@vibey/api-shared'
import { isSystemAgentKey } from '../lib/system-agent-keys'

export interface AgentCheckpointSnapshot {
  definitions: Array<{ file_name: string; content: string }>
  skills: Array<{
    skill_key: string
    name: string
    description: string
    markdown_content: string
    is_enabled: boolean
  }>
  resources?: Array<{
    skill_key: string
    file_path: string
    content: string
    content_type: string
    storage_url: string | null
  }>
}

export interface AgentCheckpointRow {
  id: string
  user_id: string | null
  org_id: string | null
  agent_key: string
  source_conversation_id: string | null
  source_message_id: string | null
  kind: 'auto_turn' | 'restore' | 'baseline'
  summary: string
  summary_edited_at: string | null
  summary_edited_by: string | null
  snapshot: AgentCheckpointSnapshot
  created_at: string
}

@Injectable()
export class AgentCheckpointsRepository {
  private readonly logger = new Logger(AgentCheckpointsRepository.name)

  private applyOwnerScope(query: any, userId: string, orgId: string | null | undefined): any {
    return applyOwnerScope(query, { userId, orgId: orgId ?? null })
  }

  async list(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    opts: { limit: number; cursor?: string | null },
  ) {
    let query = this.applyOwnerScope(
      supabase
        .from('agent_checkpoints')
        .select(
          'id, agent_key, source_conversation_id, source_message_id, kind, summary, summary_edited_at, summary_edited_by, created_at',
        )
        .eq('agent_key', agentKey)
        .order('created_at', { ascending: false })
        .limit(opts.limit),
      userId,
      orgId,
    )
    if (opts.cursor) query = query.lt('created_at', opts.cursor)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list checkpoints: ${error.message}`)
    return data ?? []
  }

  async getById(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    checkpointId: string,
  ): Promise<AgentCheckpointRow | null> {
    const { data, error } = await this.applyOwnerScope(
      supabase
        .from('agent_checkpoints')
        .select('*')
        .eq('agent_key', agentKey)
        .eq('id', checkpointId),
      userId,
      orgId,
    ).maybeSingle()
    if (error) throw new Error(`Failed to get checkpoint: ${error.message}`)
    return (data as AgentCheckpointRow | null) ?? null
  }

  async getPrevious(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    createdAt: string,
  ): Promise<AgentCheckpointRow | null> {
    const { data, error } = await this.applyOwnerScope(
      supabase
        .from('agent_checkpoints')
        .select('*')
        .eq('agent_key', agentKey)
        .lt('created_at', createdAt)
        .order('created_at', { ascending: false })
        .limit(1),
      userId,
      orgId,
    ).maybeSingle()
    if (error) throw new Error(`Failed to get previous checkpoint: ${error.message}`)
    return (data as AgentCheckpointRow | null) ?? null
  }

  async updateSummary(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    checkpointId: string,
    summary: string,
  ) {
    const { data, error } = await this.applyOwnerScope(
      supabase
        .from('agent_checkpoints')
        .update({
          summary,
          summary_edited_at: new Date().toISOString(),
          summary_edited_by: userId,
        })
        .eq('agent_key', agentKey)
        .eq('id', checkpointId),
      userId,
      orgId,
    )
      .select(
        'id, agent_key, source_conversation_id, source_message_id, kind, summary, summary_edited_at, summary_edited_by, created_at',
      )
      .single()
    if (error) throw new Error(`Failed to update checkpoint summary: ${error.message}`)
    return data
  }

  async restoreSnapshot(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    snapshot: AgentCheckpointSnapshot,
  ): Promise<void> {
    if (isSystemAgentKey(agentKey)) {
      this.logger.warn(
        `Refusing to restore checkpoint for system agent '${agentKey}'. System agents read canonical content only; per-user content rows are not allowed.`,
      )
      return
    }
    const effectiveUserId = orgId ? null : userId
    for (const definition of snapshot.definitions) {
      let lookup = supabase
        .from('agent_definitions')
        .select('id')
        .eq('agent_key', agentKey)
        .eq('file_name', definition.file_name)
      lookup = this.applyOwnerScope(lookup, userId, orgId)
      const { data: existing, error: lookupError } = await lookup.maybeSingle()
      if (lookupError) throw new Error(`Failed to lookup definition: ${lookupError.message}`)
      if (existing?.id) {
        const { error } = await supabase
          .from('agent_definitions')
          .update({ content: definition.content })
          .eq('id', existing.id)
        if (error) throw new Error(`Failed to restore definition: ${error.message}`)
      } else {
        const { error } = await supabase.from('agent_definitions').insert({
          user_id: effectiveUserId,
          org_id: orgId ?? null,
          agent_key: agentKey,
          file_name: definition.file_name,
          content: definition.content,
        })
        if (error) throw new Error(`Failed to insert restored definition: ${error.message}`)
      }
    }

    for (const skill of snapshot.skills) {
      let lookup = supabase
        .from('agent_skills')
        .select('id')
        .eq('agent_key', agentKey)
        .eq('skill_key', skill.skill_key)
      lookup = this.applyOwnerScope(lookup, userId, orgId)
      const { data: existing, error: lookupError } = await lookup.maybeSingle()
      if (lookupError) throw new Error(`Failed to lookup skill: ${lookupError.message}`)
      const payload = {
        name: skill.name,
        description: skill.description,
        markdown_content: skill.markdown_content,
        is_enabled: skill.is_enabled,
      }
      if (existing?.id) {
        const { error } = await supabase.from('agent_skills').update(payload).eq('id', existing.id)
        if (error) throw new Error(`Failed to restore skill: ${error.message}`)
      } else {
        const { error } = await supabase.from('agent_skills').insert({
          user_id: effectiveUserId,
          org_id: orgId ?? null,
          agent_key: agentKey,
          skill_key: skill.skill_key,
          ...payload,
        })
        if (error) throw new Error(`Failed to insert restored skill: ${error.message}`)
      }
    }

    for (const resource of snapshot.resources ?? []) {
      let lookup = supabase
        .from('agent_skill_resources')
        .select('id')
        .eq('agent_key', agentKey)
        .eq('skill_key', resource.skill_key)
        .eq('file_path', resource.file_path)
      lookup = this.applyOwnerScope(lookup, userId, orgId)
      const { data: existing, error: lookupError } = await lookup.maybeSingle()
      if (lookupError) throw new Error(`Failed to lookup skill resource: ${lookupError.message}`)
      const payload = {
        content: resource.content,
        content_type: resource.content_type,
        storage_url: resource.storage_url,
      }
      if (existing?.id) {
        const { error } = await supabase
          .from('agent_skill_resources')
          .update(payload)
          .eq('id', existing.id)
        if (error) throw new Error(`Failed to restore skill resource: ${error.message}`)
      } else {
        const { error } = await supabase.from('agent_skill_resources').insert({
          user_id: effectiveUserId,
          org_id: orgId ?? null,
          agent_key: agentKey,
          skill_key: resource.skill_key,
          file_path: resource.file_path,
          ...payload,
        })
        if (error) throw new Error(`Failed to insert restored skill resource: ${error.message}`)
      }
    }
  }

  async createSnapshot(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
  ): Promise<AgentCheckpointSnapshot> {
    const definitionsQuery = this.applyOwnerScope(
      supabase
        .from('agent_definitions')
        .select('file_name, content')
        .eq('agent_key', agentKey),
      userId,
      orgId,
    )
    const skillsQuery = this.applyOwnerScope(
      supabase
        .from('agent_skills')
        .select('skill_key, name, description, markdown_content, is_enabled')
        .eq('agent_key', agentKey),
      userId,
      orgId,
    )
    const resourcesQuery = this.applyOwnerScope(
      supabase
        .from('agent_skill_resources')
        .select('skill_key, file_path, content, content_type, storage_url')
        .eq('agent_key', agentKey),
      userId,
      orgId,
    )
    const [definitions, skills, resources] = await Promise.all([
      definitionsQuery,
      skillsQuery,
      resourcesQuery,
    ])

    if (definitions.error) {
      throw new Error(`Failed to snapshot agent definitions: ${definitions.error.message}`)
    }
    if (skills.error) throw new Error(`Failed to snapshot agent skills: ${skills.error.message}`)
    if (resources.error) {
      throw new Error(`Failed to snapshot agent skill resources: ${resources.error.message}`)
    }

    return {
      definitions: (definitions.data ?? []).map((row) => ({
        file_name: String(row.file_name),
        content: String(row.content ?? ''),
      })),
      skills: (skills.data ?? []).map((row) => ({
        skill_key: String(row.skill_key),
        name: String(row.name ?? ''),
        description: String(row.description ?? ''),
        markdown_content: String(row.markdown_content ?? ''),
        is_enabled: row.is_enabled === true,
      })),
      resources: (resources.data ?? []).map((row) => ({
        skill_key: String(row.skill_key),
        file_path: String(row.file_path),
        content: String(row.content ?? ''),
        content_type: String(row.content_type ?? 'text/markdown'),
        storage_url: typeof row.storage_url === 'string' ? row.storage_url : null,
      })),
    }
  }

  async insertLearningLoopCheckpoint(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    summary: string,
    snapshot: AgentCheckpointSnapshot,
  ) {
    const { data, error } = await supabase
      .from('agent_checkpoints')
      .insert({
        user_id: orgId ? null : userId,
        org_id: orgId ?? null,
        agent_key: agentKey,
        kind: 'auto_turn',
        summary,
        snapshot,
      })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to log learning-loop checkpoint: ${error.message}`)
    return data
  }

  async insertRestoreCheckpoint(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    sourceConversationId: string | null,
    summary: string,
    snapshot: AgentCheckpointSnapshot,
  ) {
    const { data, error } = await supabase
      .from('agent_checkpoints')
      .insert({
        user_id: orgId ? null : userId,
        org_id: orgId ?? null,
        agent_key: agentKey,
        source_conversation_id: sourceConversationId,
        kind: 'restore',
        summary,
        snapshot,
      })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to log restore checkpoint: ${error.message}`)
    return data
  }
}

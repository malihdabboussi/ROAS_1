import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepositoryAgentListBase } from './missions-repository-agent-list.base'
import {
  HIDDEN_AGENT_SKILL_KEYS,
  isRemovedSkillResourceRow,
  shouldPreferSkillResourceRow,
  type AgentSkillResourceRow,
} from './missions-repository.shared'

export abstract class MissionsRepositorySkillsListBase extends MissionsRepositoryAgentListBase {
  private async attachSkillResourcesToSkills(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId: string | null | undefined,
    skills: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown> & { resources: unknown[] }>> {
    if (!skills.length) return skills.map((row) => ({ ...row, resources: [] }))
    const skillKeys = [...new Set(skills.map((s) => s.skill_key as string))]
    let resQ = supabase
      .from('agent_skill_resources')
      .select(
        'id, agent_key, skill_key, file_path, content, content_type, storage_url, user_id, org_id',
      )
      .or(`agent_key.eq.${agentKey},agent_key.eq.*`)
      .in('skill_key', skillKeys)
    if (orgId) {
      resQ = resQ.or(`org_id.eq.${orgId},org_id.is.null`).is('user_id', null)
    } else {
      resQ = resQ.or(`user_id.eq.${userId},user_id.is.null`).is('org_id', null)
    }
    const { data: resRows, error: resErr } = await resQ
    if (resErr) throw new Error(`Failed to list agent skill resources: ${resErr.message}`)
    const bySkillFile = new Map<string, Map<string, AgentSkillResourceRow>>()
    for (const row of (resRows ?? []) as AgentSkillResourceRow[]) {
      const sk = row.skill_key
      if (!bySkillFile.has(sk)) bySkillFile.set(sk, new Map())
      const m = bySkillFile.get(sk)!
      const existing = m.get(row.file_path)
      if (!existing || shouldPreferSkillResourceRow(existing, row)) {
        m.set(row.file_path, row)
      }
    }
    return skills.map((row) => {
      const sk = row.skill_key as string
      const map = bySkillFile.get(sk)
      const resources = map
        ? [...map.values()]
            .filter((r) => !isRemovedSkillResourceRow(r))
            .sort((a, b) => a.file_path.localeCompare(b.file_path))
        : []
      return { ...row, resources }
    })
  }

  async listAgentSkills(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    let skillsQ = supabase
      .from('agent_skills')
      .select('*')
      .or(`agent_key.eq.${agentKey},agent_key.eq.*`)
      .order('created_at', { ascending: true })
    if (orgId) {
      skillsQ = skillsQ.or(`org_id.eq.${orgId},org_id.is.null`).is('user_id', null)
    } else {
      skillsQ = skillsQ.or(`user_id.eq.${userId},user_id.is.null`).is('org_id', null)
    }
    const { data: raw, error } = await skillsQ
    if (error) throw new Error(`Failed to list agent skills: ${error.message}`)
    if (!raw?.length) return []

    const seen = new Map<string, (typeof raw)[number]>()
    for (const row of raw) {
      const key = row.skill_key as string
      if (HIDDEN_AGENT_SKILL_KEYS.has(key)) continue
      if (key.includes('/')) continue
      const existing = seen.get(key)
      if (!existing || (existing.agent_key === '*' && row.agent_key !== '*')) {
        seen.set(key, row)
      }
    }
    const merged = [...seen.values()]
    const annotateIsSystem = (rows: typeof merged) =>
      rows.map((row) => ({
        ...row,
        is_system: row.user_id == null && row.org_id == null,
      }))

    const hasArchetypeFilter = merged.some(
      (row: Record<string, unknown>) =>
        Array.isArray(row.archetype_filter) && row.archetype_filter.length > 0,
    )
    let annotated: Array<Record<string, unknown>>
    if (!hasArchetypeFilter) {
      annotated = annotateIsSystem(merged)
    } else {
      let vibeyLookup = supabase.from('agents_registry').select('config').eq('agent_key', 'vibey')
      if (orgId) {
        vibeyLookup = vibeyLookup.eq('org_id', orgId).is('user_id', null)
      } else {
        vibeyLookup = vibeyLookup.eq('user_id', userId).is('org_id', null)
      }
      const { data: vibeyRow } = await vibeyLookup.maybeSingle()
      const archetype =
        vibeyRow?.config && typeof vibeyRow.config === 'object' && !Array.isArray(vibeyRow.config)
          ? (vibeyRow.config as Record<string, unknown>).archetype
          : null
      const userArchetype = typeof archetype === 'string' ? archetype : null

      annotated = annotateIsSystem(
        merged.filter((row: Record<string, unknown>) => {
          const filter = row.archetype_filter as string[] | null
          if (!filter || !Array.isArray(filter) || filter.length === 0) return true
          return userArchetype ? filter.includes(userArchetype) : false
        }),
      )
    }

    return this.attachSkillResourcesToSkills(supabase, userId, agentKey, orgId, annotated)
  }

  /**
   * Batched variant of `listAgentSkills` for multi-agent views (e.g. the
   * Manage Skills "All" tab): one skills query + one resources query for any
   * number of agents instead of 2-3 queries per agent. Returns the exact
   * concatenation of per-agent results (shared `agent_key='*'` rows appear
   * once per requested agent, matching N single-agent calls flattened).
   *
   * With `opts.summary` the heavy columns (`markdown_content`, resource
   * `content`) are omitted so list views can fetch full bodies on demand.
   */
  async listAgentSkillsForAgents(
    supabase: SupabaseClient,
    userId: string,
    agentKeys: string[],
    orgId?: string | null,
    opts?: { summary?: boolean },
  ) {
    const requestedKeys = [...new Set(agentKeys.filter((key) => key && key !== '*'))]
    if (!requestedKeys.length) return []
    const summary = opts?.summary === true

    const skillColumns = summary
      ? 'id, user_id, org_id, agent_key, skill_key, name, description, is_enabled, source, archetype_filter, created_at, updated_at'
      : '*'
    let skillsQ = supabase
      .from('agent_skills')
      .select(skillColumns)
      .in('agent_key', [...requestedKeys, '*'])
      .order('created_at', { ascending: true })
    if (orgId) {
      skillsQ = skillsQ.or(`org_id.eq.${orgId},org_id.is.null`).is('user_id', null)
    } else {
      skillsQ = skillsQ.or(`user_id.eq.${userId},user_id.is.null`).is('org_id', null)
    }
    const { data: raw, error } = await skillsQ
    if (error) throw new Error(`Failed to list agent skills: ${error.message}`)
    const rows = (raw ?? []) as unknown as Array<Record<string, unknown>>
    if (!rows.length) return []

    const hasArchetypeFilter = rows.some(
      (row) =>
        Array.isArray(row.archetype_filter) && (row.archetype_filter as unknown[]).length > 0,
    )
    let userArchetype: string | null = null
    if (hasArchetypeFilter) {
      let vibeyLookup = supabase.from('agents_registry').select('config').eq('agent_key', 'vibey')
      if (orgId) {
        vibeyLookup = vibeyLookup.eq('org_id', orgId).is('user_id', null)
      } else {
        vibeyLookup = vibeyLookup.eq('user_id', userId).is('org_id', null)
      }
      const { data: vibeyRow } = await vibeyLookup.maybeSingle()
      const archetype =
        vibeyRow?.config && typeof vibeyRow.config === 'object' && !Array.isArray(vibeyRow.config)
          ? (vibeyRow.config as Record<string, unknown>).archetype
          : null
      userArchetype = typeof archetype === 'string' ? archetype : null
    }

    const mergeForAgent = (agentKey: string): Array<Record<string, unknown>> => {
      const seen = new Map<string, Record<string, unknown>>()
      for (const row of rows) {
        const rowAgentKey = row.agent_key as string
        if (rowAgentKey !== agentKey && rowAgentKey !== '*') continue
        const key = row.skill_key as string
        if (HIDDEN_AGENT_SKILL_KEYS.has(key)) continue
        if (key.includes('/')) continue
        const existing = seen.get(key)
        if (!existing || (existing.agent_key === '*' && rowAgentKey !== '*')) {
          seen.set(key, row)
        }
      }
      return [...seen.values()]
        .filter((row) => {
          const filter = row.archetype_filter as string[] | null
          if (!filter || !Array.isArray(filter) || filter.length === 0) return true
          return userArchetype ? filter.includes(userArchetype) : false
        })
        .map((row) => ({
          ...row,
          is_system: row.user_id == null && row.org_id == null,
        }))
    }

    const perAgent = requestedKeys.map((agentKey) => ({
      agentKey,
      skills: mergeForAgent(agentKey),
    }))
    const allSkillKeys = [
      ...new Set(perAgent.flatMap((entry) => entry.skills.map((s) => s.skill_key as string))),
    ]
    if (!allSkillKeys.length) return []

    const resourceColumns = summary
      ? 'id, agent_key, skill_key, file_path, content_type, storage_url, user_id, org_id'
      : 'id, agent_key, skill_key, file_path, content, content_type, storage_url, user_id, org_id'
    let resQ = supabase
      .from('agent_skill_resources')
      .select(resourceColumns)
      .in('agent_key', [...requestedKeys, '*'])
      .in('skill_key', allSkillKeys)
    if (orgId) {
      resQ = resQ.or(`org_id.eq.${orgId},org_id.is.null`).is('user_id', null)
    } else {
      resQ = resQ.or(`user_id.eq.${userId},user_id.is.null`).is('org_id', null)
    }
    const { data: resRows, error: resErr } = await resQ
    if (resErr) throw new Error(`Failed to list agent skill resources: ${resErr.message}`)
    const resourceRows = (resRows ?? []) as unknown as AgentSkillResourceRow[]

    const out: Array<Record<string, unknown>> = []
    for (const { agentKey, skills } of perAgent) {
      const bySkillFile = new Map<string, Map<string, AgentSkillResourceRow>>()
      for (const row of resourceRows) {
        if (row.agent_key !== agentKey && row.agent_key !== '*') continue
        const m = bySkillFile.get(row.skill_key) ?? new Map<string, AgentSkillResourceRow>()
        const existing = m.get(row.file_path)
        if (!existing || shouldPreferSkillResourceRow(existing, row)) {
          m.set(row.file_path, row)
        }
        bySkillFile.set(row.skill_key, m)
      }
      for (const skill of skills) {
        const map = bySkillFile.get(skill.skill_key as string)
        const resources = map
          ? [...map.values()]
              .filter((r) => !isRemovedSkillResourceRow(r))
              .sort((a, b) => a.file_path.localeCompare(b.file_path))
          : []
        out.push({ ...skill, resources })
      }
    }
    return out
  }
}

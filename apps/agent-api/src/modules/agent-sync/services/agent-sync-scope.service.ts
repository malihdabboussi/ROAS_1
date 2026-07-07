import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AgentSyncRepository } from '../repositories/agent-sync.repository'
import {
  AgentSkillResourceRow,
  AgentSkillRow,
  AgentWorkflowRow,
  REMOVED_SKILL_RESOURCE_CONTENT_TYPE,
  SYSTEM_AGENT_KEYS_FALLBACK,
} from './agent-sync.types'

@Injectable()
export class AgentSyncScopeService {
  async loadSystemAgentKeys(input: {
    logger: Logger
    repository: AgentSyncRepository
    supabase: SupabaseClient
  }): Promise<Set<string>> {
    try {
      const { rows, errorMessage } = await input.repository.listSystemAgentKeys(input.supabase)
      if (errorMessage) {
        input.logger.warn(`loadSystemAgentKeys fell back: ${errorMessage}`)
        return new Set(SYSTEM_AGENT_KEYS_FALLBACK)
      }
      const keys = new Set<string>(SYSTEM_AGENT_KEYS_FALLBACK)
      for (const row of rows as Array<{ agent_key: string }>) {
        keys.add(row.agent_key)
      }
      return keys
    } catch (err) {
      input.logger.warn(`loadSystemAgentKeys threw: ${(err as Error).message}`)
      return new Set(SYSTEM_AGENT_KEYS_FALLBACK)
    }
  }

  async loadSkillDenySet(input: {
    logger: Logger
    orgId: string | null
    repository: AgentSyncRepository
    supabase: SupabaseClient
    userId: string | null
  }): Promise<Set<string>> {
    const { rows, errorMessage } = await input.repository.listDeniedSkillOverrides(input.supabase, {
      userId: input.userId,
      orgId: input.orgId,
    })
    if (errorMessage) {
      input.logger.warn(`loadSkillDenySet failed: ${errorMessage}`)
      return new Set()
    }
    const out = new Set<string>()
    for (const row of rows as Array<{ agent_key: string; capability_id: string }>) {
      out.add(`${row.agent_key}:${row.capability_id}`)
    }
    return out
  }

  filterSystemAgentRows<
    T extends { agent_key: string; user_id?: string | null; org_id?: string | null },
  >(rows: T[], systemKeys: Set<string>): T[] {
    return rows.filter((row) => {
      if (!systemKeys.has(row.agent_key)) return true
      return (row.user_id ?? null) === null && (row.org_id ?? null) === null
    })
  }

  /** Org-specific skill rows override global (org_id=null) rows with the same skill_key. */
  deduplicateSkills(
    rows: (AgentSkillRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentSkillRow[] {
    const seen = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const key = row.skill_key
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, row)
      } else {
        const rowIsOrg = row.org_id === orgId
        const existingIsOrg = existing.org_id === orgId
        if (rowIsOrg && !existingIsOrg) seen.set(key, row)
        if (!rowIsOrg && !existingIsOrg && existing.agent_key === '*' && row.agent_key !== '*') {
          seen.set(key, row)
        }
      }
    }
    return [...seen.values()]
  }

  /** Personal user rows override global rows; agent-specific rows override `*` rows. */
  deduplicatePersonalSkills(
    rows: (AgentSkillRow & { user_id?: string | null })[],
    userId: string,
  ): AgentSkillRow[] {
    const seen = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const key = row.skill_key
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, row)
        continue
      }
      const rowIsUser = row.user_id === userId
      const existingIsUser = existing.user_id === userId
      if (rowIsUser && !existingIsUser) {
        seen.set(key, row)
        continue
      }
      if (rowIsUser === existingIsUser && existing.agent_key === '*' && row.agent_key !== '*') {
        seen.set(key, row)
      }
    }
    return [...seen.values()]
  }

  /** Org-specific resource rows override global rows with the same skill_key+file_path. */
  deduplicateResources(
    rows: (AgentSkillResourceRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentSkillResourceRow[] {
    const seen = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const key = `${row.skill_key}::${row.file_path}`
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, row)
      } else {
        const rowIsOrg = row.org_id === orgId
        const existingIsOrg = existing.org_id === orgId
        if (rowIsOrg && !existingIsOrg) seen.set(key, row)
      }
    }
    return [...seen.values()].filter(
      (row) => row.content_type !== REMOVED_SKILL_RESOURCE_CONTENT_TYPE,
    )
  }

  /** Personal user resource rows override global rows with the same skill_key+file_path. */
  deduplicatePersonalResources(
    rows: (AgentSkillResourceRow & { user_id?: string | null })[],
    userId: string,
  ): AgentSkillResourceRow[] {
    const seen = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const key = `${row.skill_key}::${row.file_path}`
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, row)
        continue
      }
      const rowIsUser = row.user_id === userId
      const existingIsUser = existing.user_id === userId
      if (rowIsUser && !existingIsUser) {
        seen.set(key, row)
        continue
      }
      if (rowIsUser === existingIsUser && existing.agent_key === '*' && row.agent_key !== '*') {
        seen.set(key, row)
      }
    }
    return [...seen.values()].filter(
      (row) => row.content_type !== REMOVED_SKILL_RESOURCE_CONTENT_TYPE,
    )
  }

  /** Org-specific workflow rows override global rows with the same workflow_key. */
  deduplicateWorkflows(
    rows: (AgentWorkflowRow & { org_id?: string | null })[],
    orgId: string,
  ): AgentWorkflowRow[] {
    const seen = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const key = row.workflow_key
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, row)
      } else {
        const rowIsOrg = row.org_id === orgId
        const existingIsOrg = existing.org_id === orgId
        if (rowIsOrg && !existingIsOrg) seen.set(key, row)
      }
    }
    return [...seen.values()]
  }

  async fetchLibraryResources(input: {
    logger: Logger
    repository: AgentSyncRepository
    skillKeys: string[]
    supabase: SupabaseClient
  }): Promise<AgentSkillResourceRow[]> {
    if (input.skillKeys.length === 0) return []
    const { rows, errorMessage } = await input.repository.listSkillLibraryResources(
      input.supabase,
      input.skillKeys,
    )
    if (errorMessage) {
      input.logger.warn(`Failed to fetch skill library resources: ${errorMessage}`)
      return []
    }
    return rows.map((row) => ({
      agent_key: '__library__',
      skill_key: row.skill_key as string,
      file_path: row.file_path as string,
      content: row.content as string | null,
      content_type: (row.content_type as string) ?? undefined,
      storage_url: (row.storage_url as string) ?? null,
    }))
  }

  /** Per skill_key: if agent-specific resources exist, keep only those; otherwise inject library rows. */
  mergeWithLibraryFallback(
    agentResources: AgentSkillResourceRow[],
    libraryResources: AgentSkillResourceRow[],
  ): AgentSkillResourceRow[] {
    const agentSkillKeys = new Set(agentResources.map((row) => row.skill_key))
    const libraryFill = libraryResources.filter((row) => !agentSkillKeys.has(row.skill_key))
    return [...agentResources, ...libraryFill]
  }
}

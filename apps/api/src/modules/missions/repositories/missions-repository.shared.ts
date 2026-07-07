import { ForbiddenException } from '@nestjs/common'
import { isSkillWriteLocked, isSystemAgentKey } from '../lib/system-agent-keys'
import type { AgentKey, MissionStatus } from '../types/missions.types'

export function rejectSystemAgentWrite(agentKey: string, op: string): void {
  if (isSystemAgentKey(agentKey)) {
    throw new ForbiddenException(
      `Cannot ${op}: '${agentKey}' is a system agent. System agent content is engineering-owned. Users may toggle skills via agent_overrides but cannot modify content.`,
    )
  }
}

export function rejectSkillWriteForLockedAgents(agentKey: string, op: string): void {
  if (isSkillWriteLocked(agentKey)) {
    throw new ForbiddenException(
      `Cannot ${op}: '${agentKey}' is engineering-owned. Skill content for this agent is shipped via scripts/seed-system-agents.ts.`,
    )
  }
}

export const REMOVED_SKILL_RESOURCE_CONTENT_TYPE = 'application/vnd.vibey.resource-removed'

/** Skill keys never exposed through the public skills listing endpoints. */
export const HIDDEN_AGENT_SKILL_KEYS = new Set([
  'vibey-api',
  'awareness-evaluator',
  'onboarding-discovery',
])

export type AgentSkillResourceRow = {
  id: string
  agent_key: string
  skill_key: string
  file_path: string
  /** Omitted (undefined) when fetched in summary mode. */
  content?: string | null
  content_type: string | null
  storage_url: string | null
  user_id: string | null
  org_id: string | null
}

export function isRemovedSkillResourceRow(row: Pick<AgentSkillResourceRow, 'content_type'>): boolean {
  return row.content_type === REMOVED_SKILL_RESOURCE_CONTENT_TYPE
}

export function shouldPreferSkillResourceRow(
  existing: AgentSkillResourceRow,
  incoming: AgentSkillResourceRow,
): boolean {
  if (existing.agent_key === '*' && incoming.agent_key !== '*') return true
  if (existing.agent_key !== '*' && incoming.agent_key === '*') return false
  const existingOwned = existing.user_id != null || existing.org_id != null
  const incomingOwned = incoming.user_id != null || incoming.org_id != null
  if (!existingOwned && incomingOwned) return true
  if (existingOwned && !incomingOwned) return false
  return true
}

export interface CreateMissionRecordInput {
  user_id: string
  org_id?: string | null
  parent_mission_id?: string | null
  campaign_id?: string | null
  space_id?: string | null
  source_space_item_id?: string | null
  mission_visibility?: 'private' | 'space' | 'shared' | 'campaign'
  title: string
  brief?: string | null
  description?: string | null
  status: MissionStatus
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigned_agent_key?: AgentKey | null
  current_agent_key?: AgentKey | null
  progress_notes?: string | null
  plan_id?: string | null
  correlation_id: string
  idempotency_key: string
  retry_count: number
  input: Record<string, unknown>
  scheduled_at?: string | null
}

export interface UpdateMissionStatusInput {
  status: MissionStatus
  error?: string | null
  output?: Record<string, unknown>
  assigned_agent_key?: AgentKey | null
  current_agent_key?: AgentKey | null
  retry_count?: number
  progress_notes?: string | null
  plan_id?: string | null
}

export interface UpdateMissionFieldsInput {
  title?: string
  brief?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigned_agent_key?: AgentKey | null
  current_agent_key?: AgentKey | null
  progress_notes?: string | null
  scheduled_at?: string | null
}

export interface CreateAgentSkillInput {
  user_id: string
  org_id?: string | null
  agent_key: string
  skill_key: string
  name: string
  description: string
  markdown_content: string
  is_enabled?: boolean
}

export interface CreateAgentSkillResourceInput {
  user_id: string
  org_id?: string | null
  agent_key: string
  skill_key: string
  file_path: string
  content?: string | null
  content_type?: string
  storage_url?: string | null
}

export interface CreateAgentWorkflowInput {
  user_id: string
  org_id?: string | null
  agent_key: string
  workflow_key: string
  name: string
  description: string
  markdown_content: string
  steps: unknown[]
  is_enabled?: boolean
}

export interface UpsertAgentTemplateDefinitionInput {
  template_key: string
  name: string
  role: string
  level: 'system' | 'c_level' | 'manager' | 'employee'
  file_name: string
  content: string
}

export interface UpsertAgentTemplateSkillInput {
  template_key: string
  skill_key: string
  name: string
  description: string
  markdown_content: string
  resources?: Array<{ file_path: string; content: string }>
  is_enabled?: boolean
}

export interface AgentEmployeeTemplateRow {
  role_key: string
  template_key: string
  skill_seed_key: string
  default_name: string
  name_pool: string[]
  role: string
  level: 'employee' | 'manager' | 'c_level'
  disc_profile: string
  tagline: string
  description: string
  responsibilities: string[]
  skills: string[]
  core_beliefs: string[]
  image_url: string
  specialty: string
  is_enabled: boolean
  sort_order: number
}

export interface InsertMissionOutboxEventInput {
  mission_id: string
  user_id: string
  org_id?: string | null
  event_type: string
  dedupe_key: string
  payload?: Record<string, unknown>
  max_attempts?: number
  next_attempt_at?: string
  priority_rank?: number
  /** When true, reset pending row on dedupe_key conflict (re-queue same logical job). */
  requeue_existing_dedupe_key?: boolean
}

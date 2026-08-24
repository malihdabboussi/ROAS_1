import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { DEFAULT_AGENT_AVATAR_URL, DEFAULT_AGENT_KEY } from '@/lib/team/default-agent-identity'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import type { FireEmployeeHandoffInput } from './agent-fire-handoff'
import type { MissionAgentSkill } from './agent-skill-types'

export type AgentKey = string
export type AgentStatus = 'online' | 'idle' | 'working' | 'offline'

export interface AgentStats {
  execution_speed?: number
  quality?: number
  reliability?: number
  initiative?: number
  communication?: number
  spec_adherence?: number
  learning_rate?: number
  overall?: number
  missions_scored?: number
  last_scored_at?: string | null
}

export interface MissionAgent {
  id: string
  user_id: string
  agent_key: AgentKey
  name: string
  role: string
  status: AgentStatus
  skills: string[]
  level?: string
  specialty?: string | null
  image_url?: string | null
  is_active?: boolean
  team_id?: string | null
  config?: Record<string, unknown>
  stats?: AgentStats
  sync_status?: 'pending' | 'syncing' | 'ready' | 'failed'
  sort_order?: number
  created_at: string
  updated_at: string
}

export interface FireEmployeeResponse {
  deleted: boolean
  reassigned_to: string
  handoff: {
    applied: boolean
    scope: 'default' | 'agent' | 'campaign' | null
    target_brain_id: string | null
    target_campaign_id: string | null
    copied: {
      memories: number
      snapshots: number
      sk_sources: number
      sk_entries: number
      narrative_pages: number
      narrative_links: number
      memory_connections: number
      snapshot_edges: number
      content_hashes: number
      campaign_nodes: number
    } | null
  }
  brain_cancellation: {
    canceled_addon: boolean
    brain_id: string | null
    deletion_at: string | null
  }
}

export interface MissionAgentWorkflow {
  id: string
  user_id: string | null
  agent_key: AgentKey
  workflow_key: string
  name: string
  description: string
  markdown_content: string
  steps: unknown[]
  is_enabled: boolean
  archetype_filter: string[] | null
  created_at: string
  updated_at: string
}

export interface AwarenessPoint {
  id: string
  user_id: string
  org_id: string | null
  agent_key: string
  session_id: string | null
  campaign_id: string | null
  point_type: string
  content: string
  read_at: string | null
  created_at: string
}

export type MissionAgentSidebar = Pick<
  MissionAgent,
  | 'id'
  | 'agent_key'
  | 'name'
  | 'image_url'
  | 'is_active'
  | 'status'
  | 'updated_at'
  | 'level'
  | 'team_id'
  | 'role'
  | 'sort_order'
>

const AGENTS_LIST_CACHE_KEY = 'agents:list'

export function invalidateMissionAgentsCache(): void {
  invalidateCachedFetch(AGENTS_LIST_CACHE_KEY)
}

/**
 * The default agent renders as the lamp mark everywhere, even when onboarding stored a
 * generated portrait in agents_registry.image_url (see normalizeDefaultAgentIdentity).
 */
export function normalizeDefaultMissionAgent<
  T extends { agent_key: string; image_url?: string | null },
>(agent: T): T {
  if (agent.agent_key !== DEFAULT_AGENT_KEY) return agent
  return { ...agent, image_url: DEFAULT_AGENT_AVATAR_URL }
}

export async function fetchMissionAgents(opts?: { force?: boolean }): Promise<MissionAgent[]> {
  if (opts?.force) invalidateMissionAgentsCache()
  // Normalize inside the fetcher: callers also read the AGENTS_LIST_CACHE_KEY entry
  // directly (use-team-container-roster), so the cached value itself must be normalized.
  return cachedFetch(
    AGENTS_LIST_CACHE_KEY,
    async () => (await backendGet<MissionAgent[]>('/api/agents')).map(normalizeDefaultMissionAgent),
    { ttlMs: 60_000 },
  )
}

export async function fetchMissionAgentsSlim(): Promise<MissionAgentSidebar[]> {
  const agents = await backendGet<MissionAgentSidebar[]>('/api/agents/slim')
  return agents.map(normalizeDefaultMissionAgent)
}

export async function backfillBrainScholar(): Promise<{
  ok: boolean
  created: boolean
  message?: string
}> {
  const res = await backendPost<{ ok: boolean; created: boolean; message?: string }>(
    '/api/agents/backfill-brain-scholar',
    {},
  )
  if (res.created) invalidateMissionAgentsCache()
  return res
}

export async function backfillMissingAvatars(): Promise<{ ok: boolean; triggered: number }> {
  return backendPost<{ ok: boolean; triggered: number }>('/api/agents/backfill-avatars', {})
}

export async function renameAgent(agentKey: string, name: string): Promise<MissionAgent> {
  const agent = await backendPatch<MissionAgent>(`/api/agents/${agentKey}/name`, { name })
  invalidateMissionAgentsCache()
  return agent
}

export async function updateAgentActive(
  agentKey: string,
  active: boolean,
): Promise<MissionAgent> {
  const agent = await backendPatch<MissionAgent>(`/api/agents/${agentKey}/active`, { active })
  invalidateMissionAgentsCache()
  return agent
}

export async function updateAgentCommunication(
  agentKey: string,
  payload: {
    model_id?: string | null
    model_settings?: ChatModelSettings | null
    voice_name?: string | null
    communication_style?: string | null
  },
): Promise<MissionAgent> {
  const agent = await backendPatch<MissionAgent>(`/api/agents/${agentKey}/communication`, payload)
  invalidateMissionAgentsCache()
  return agent
}

export async function updateAgentImage(agentKey: string, imageUrl: string): Promise<MissionAgent> {
  const agent = await backendPatch<MissionAgent>(`/api/agents/${agentKey}/image`, {
    image_url: imageUrl,
  })
  invalidateMissionAgentsCache()
  return agent
}

export async function fireEmployee(
  agentKey: string,
  handoff?: FireEmployeeHandoffInput | null,
): Promise<FireEmployeeResponse> {
  const body = handoff ? { handoff } : undefined
  const res = await backendDelete<FireEmployeeResponse>(
    `/api/agents/${encodeURIComponent(agentKey)}`,
    body,
  )
  invalidateMissionAgentsCache()
  return res
}

export interface AgentUserState {
  agent_id: string
  is_favorite: boolean
  updated_at: string
}

export async function fetchAgentUserState(): Promise<AgentUserState[]> {
  return backendGet<AgentUserState[]>('/api/agents/user-state')
}

export async function updateAgentUserState(
  agentKey: string,
  patch: { is_favorite?: boolean },
): Promise<AgentUserState> {
  return backendPatch<AgentUserState>(
    `/api/agents/${encodeURIComponent(agentKey)}/user-state`,
    patch,
  )
}

const agentSkillsCacheKey = (agentKey: string) => `agent-skills:${agentKey}`
const AGENT_SKILLS_BATCH_CACHE_PREFIX = 'agent-skills-batch:'

export function invalidateAgentSkillsCache(agentKey: string): void {
  invalidateCachedFetch(agentSkillsCacheKey(agentKey))
  invalidateCachedFetch(AGENT_SKILLS_BATCH_CACHE_PREFIX)
}

export async function fetchAgentSkills(
  agentKey: string,
  opts?: { force?: boolean },
): Promise<MissionAgentSkill[]> {
  if (opts?.force) invalidateCachedFetch(agentSkillsCacheKey(agentKey))
  return cachedFetch(
    agentSkillsCacheKey(agentKey),
    () => backendGet<MissionAgentSkill[]>(`/api/agents/${agentKey}/skills`),
    { ttlMs: 300_000 },
  )
}

export async function fetchAgentSkillsForAgents(
  agentKeys: string[],
  opts?: { summary?: boolean; force?: boolean },
): Promise<MissionAgentSkill[]> {
  if (agentKeys.length === 0) return []
  const params = new URLSearchParams()
  params.set('agent_keys', agentKeys.join(','))
  if (opts?.summary) params.set('fields', 'summary')
  const cacheKey = `${AGENT_SKILLS_BATCH_CACHE_PREFIX}${opts?.summary ? 'summary' : 'full'}:${agentKeys.join(',')}`
  if (opts?.force) invalidateCachedFetch(cacheKey)
  return cachedFetch(
    cacheKey,
    () => backendGet<MissionAgentSkill[]>(`/api/agents/skills?${params.toString()}`),
    { ttlMs: 300_000 },
  )
}

export async function fetchAgentWorkflows(agentKey: string): Promise<MissionAgentWorkflow[]> {
  return backendGet<MissionAgentWorkflow[]>(`/api/agents/${agentKey}/workflows`)
}

export async function setAgentSkillOverride(
  agentKey: string,
  skillKey: string,
  enabled: boolean,
): Promise<{ agent_key: string; skill_key: string; enabled: boolean }> {
  return backendPost<{ agent_key: string; skill_key: string; enabled: boolean }>(
    `/api/agent-teams/agents/${agentKey}/skill-overrides/${encodeURIComponent(skillKey)}`,
    { enabled },
  )
}

export async function fetchAgentSkillDenies(agentKey: string): Promise<string[]> {
  type Override = { capability_kind: string; capability_id: string; mode: string }
  const overrides = await backendGet<Override[]>(`/api/agent-teams/agents/${agentKey}/overrides`)
  return overrides
    .filter((override) => override.capability_kind === 'skill' && override.mode === 'deny')
    .map((override) => override.capability_id)
}

export async function markAgentOnboardingComplete(agentKey: string): Promise<{ config: unknown }> {
  const res = await backendPatch<{ config: unknown }>(
    `/api/agents/${agentKey}/onboarding-complete`,
    {},
  )
  invalidateMissionAgentsCache()
  return res
}

export async function repairAgentSetup(agentKey: string): Promise<{
  ok: boolean
  repaired: boolean
  sync_status: 'ready' | 'failed'
  agent: MissionAgent
  reasons?: string[]
}> {
  const res = await backendPost<{
    ok: boolean
    repaired: boolean
    sync_status: 'ready' | 'failed'
    agent: MissionAgent
    reasons?: string[]
  }>(`/api/agents/${encodeURIComponent(agentKey)}/repair-setup`, {})
  invalidateMissionAgentsCache()
  return res
}

export async function fetchAwarenessPoints(): Promise<AwarenessPoint[]> {
  return backendGet<AwarenessPoint[]>('/api/agents/awareness-points')
}

export async function markAwarenessPointsReadAll(): Promise<{ ok: boolean }> {
  return backendPost<{ ok: boolean }>('/api/agents/awareness-points/read-all', {})
}

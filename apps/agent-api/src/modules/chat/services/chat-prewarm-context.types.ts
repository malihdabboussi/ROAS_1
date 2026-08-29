import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatScopeKind } from '@vibey/api-shared'
import type { ResolvedAgentPolicy } from '../../agent-policy/agent-policy.types'
import type {
  ChatModelSettings,
  ResolvedChatModelSelection,
  ValidatedModelSettings,
} from './chat-model-input.service'
import type { ChatPrewarmCacheStatus, ChatPrewarmCacheStore } from './chat-prewarm-cache.service'

export interface PrewarmChatContextOptions {
  supabase: SupabaseClient
  conversationId?: string
  agentKey?: string
  model?: string
  modelSettings?: ChatModelSettings
  userId: string
  accessToken: string
  refreshToken?: string
  campaignId?: string | null
  spaceId?: string | null
  scopeKind?: ChatScopeKind
  orgId?: string
  source?: string
}

export interface ChatAgentPrewarmContext {
  runtime: { gatewayAgentId: string; agentKey: string }
  resolvedAgentId: string
  configuredModel: string | null
  agentReg: Record<string, unknown> | null
  selectedModelInput: string
  selectedModelSource: 'request' | 'agent_config' | 'default'
  resolvedModelSelection: ResolvedChatModelSelection
  selectedSettings: ValidatedModelSettings
  gatewayModelId: string
  policyScope: { orgId: string | null; userId: string | null }
  hasCampaignAccess: boolean
  userBrainAccess: boolean
  resolvedPolicy: ResolvedAgentPolicy | null
  agentConfig: Record<string, unknown> | null | undefined
  useWikiContext: boolean
  userProfileSummary: string
  teamRosterSummary: string
  integrationSummary: string
  agentBrainPresence: { hasAgentBrain: boolean; brainId: string | null }
}

export interface ChatStablePrewarmContext extends ChatAgentPrewarmContext {
  conversation: Record<string, unknown> | null
  conversationCampaignId: string | undefined
  conversationAgentId: string | undefined
  resolvedCampaignId: string | undefined
  previousImageUrls: Array<{ filename: string; url: string }>
  campaignTeamSummary: string
  campaignSummary: string
  themeSummary: string
}

export interface ChatStablePrewarmContextResolution {
  context: ChatStablePrewarmContext
  cache_key: string
  reused: boolean
  cache_status: ChatPrewarmCacheStatus
  store: ChatPrewarmCacheStore
  duration_ms: number
  agent_cache_key?: string
  agent_reused?: boolean
  agent_cache_status?: ChatPrewarmCacheStatus
  agent_store?: ChatPrewarmCacheStore
  agent_duration_ms?: number
}

export interface ChatAgentPrewarmContextResolution {
  context: ChatAgentPrewarmContext
  cache_key: string
  reused: boolean
  cache_status: ChatPrewarmCacheStatus
  store: ChatPrewarmCacheStore
  duration_ms: number
}

export interface PrewarmDbAccess {
  dbOp: <T>(op: (client: SupabaseClient) => Promise<T>) => Promise<T>
  getSupabase: () => SupabaseClient
}

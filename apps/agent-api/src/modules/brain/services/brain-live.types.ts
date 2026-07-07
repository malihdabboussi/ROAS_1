export interface LiveSessionScope {
  type: 'user' | 'agent' | 'campaign' | 'customer' | 'company'
  agentId?: string | null
  campaignId?: string | null
  brainId?: string | null
  label?: string
}

export interface LiveSession {
  id: string
  userId: string
  orgId: string | null
  scope: LiveSessionScope
  createdAt: number
  connectedAt?: number
  conversationId?: string
  voiceName?: string
  accessToken?: string
  campaignId?: string | null
}

export const BRAIN_LIVE_ACTIONS = [
  'save_user_memory',
  'search_user_brain',
  'search_brain_context',
  'get_brain_stats',
  'list_user_brain_memories',
  'crystallize_user_brain',
  'list_available_brains',
] as const

export type BrainLiveAction = (typeof BRAIN_LIVE_ACTIONS)[number]

export const SESSION_TTL_MS = 30_000
export const MAX_SESSION_DURATION_MS = 15 * 60 * 1000
export const DEFAULT_GEMINI_LIVE_MODEL = 'models/gemini-3.1-flash-live-preview'

export interface DelegationState {
  id: string
  status: 'running' | 'completed' | 'failed'
  toolSteps: Array<{ name: string; label: string; status: string }>
  currentTool: string | null
  content: string
  thinkingText?: string
  orderedBlocks: Array<Record<string, unknown>>
  startedAt: number
  completedAt?: number
  sessionKey?: string
  gatewayAgentId?: string
  userId?: string
  orgId?: string | null
  conversationId?: string
  agentId?: string
  task?: string
}

export interface LiveDelegationSummary {
  delegationId: string
  task: string
  status: 'running' | 'completed' | 'failed'
  currentTool: string | null
  toolSteps: Array<{ name: string; label: string; status: string }>
  content: string
  orderedBlocks: Array<Record<string, unknown>>
  startedAt: number
  completedAt?: number
}

export type LiveSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'toolCall'
  | 'error'

export interface ServerEvent {
  type: string
  text?: string
  action?: string
  name?: string
  label?: string
  success?: boolean
  message?: string | Record<string, unknown>
  delegation_id?: string
  task?: string
  detail?: string
  tool_call_id?: string
  block?: Record<string, unknown>
  phase?: string
  content?: string
  status?: string
  delta?: string
}

export interface BrainLiveScope {
  type: 'user' | 'agent' | 'campaign' | 'customer' | 'company'
  agentId?: string | null
  campaignId?: string | null
  brainId?: string | null
  label?: string
  avatarUrl?: string
  voiceName?: string
  conversationId?: string | null
}

export interface ToolCallEvent {
  action: string
  label?: string
  status: 'running' | 'completed' | 'failed'
}

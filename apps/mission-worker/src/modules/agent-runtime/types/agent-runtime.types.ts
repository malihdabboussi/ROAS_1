export {
  AGENT_RUNTIME_AUTOMATION_QUEUE,
  AGENT_RUNTIME_BRAIN_IMPORT_QUEUE,
  AGENT_RUNTIME_BRAIN_QUEUE,
  AGENT_RUNTIME_CHAT_QUEUE,
  AGENT_RUNTIME_MISSION_QUEUE,
} from '@vibey/api-shared'

interface AgentRuntimeChatBaseJobData {
  runId: string
  conversationId: string
  messageId: string
  userId: string
  orgId?: string | null
  workload: 'chat'
  enqueuedAt: string
}

export interface AgentRuntimeChatShadowJobData extends AgentRuntimeChatBaseJobData {
  shadow: true
}

export interface AgentRuntimeChatExecutionJobData extends AgentRuntimeChatBaseJobData {
  shadow?: false
  content: string
  model?: string
  modelSettings?: Record<string, unknown>
  accessToken: string
  refreshToken?: string
  campaignId?: string
  spaceId?: string
  scopeKind?: string
  source?: string
  previousResponseId?: string
  documents?: unknown[]
  highlightedArtifacts?: unknown[]
  messageReferences?: unknown[]
  uiSelectedArtifact?: unknown
  hidden?: boolean
  systemContext?: string
}

export type AgentRuntimeChatJobData =
  | AgentRuntimeChatShadowJobData
  | AgentRuntimeChatExecutionJobData

export interface AgentRuntimeChatJobResult {
  success: boolean
  runId: string
  shadow: boolean
  claimLatencyMs: number
  status?:
    | 'done'
    | 'failed'
    | 'failed_recoverable'
    | 'cancelled'
    | 'continued'
    | 'interrupted'
}

export type AgentRuntimeChatShadowJobResult = AgentRuntimeChatJobResult

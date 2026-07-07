import type { UsageData } from '../types/stream-events'
import type { OpenClawModelSettings } from './openclaw-model-routing'

export type SendFn = (type: string, data: Record<string, unknown>) => Promise<void>

export interface ToolStep {
  name: string
  label: string
  status: 'completed' | 'failed'
  error?: string
  error_code?: string
  error_class?: string
  workflow_class?: string
  effect_state?: string
  retry_policy?: string
  observability?: Record<string, unknown>
  action?: string
  tool_call_id?: string
  input?: Record<string, unknown>
  result?: Record<string, unknown>
}

export type TraceTerminalStatus = 'done' | 'failed' | 'failed_recoverable' | 'cancelled'

export type TraceUserVisibleOutcome =
  | 'output_visible'
  | 'recovered_output'
  | 'no_visible_output'
  | 'blocked'
  | 'cancelled'

export type TraceRecoveryStatus =
  | 'none'
  | 'recovered'
  | 'failed_recoverable'
  | 'failed_unrecoverable'
  | 'cancelled'

export interface TraceRecoveryEvent {
  type: string
  status: 'attempted' | 'recovered' | 'failed'
  reason?: string
  at?: string
  metadata?: Record<string, unknown>
}

export interface CompletedGeneration {
  generationId?: string
  usage?: UsageData
  model?: string
  providerCost?: number
}

export interface ProviderBillingStartedEvent {
  phase: 'provider_started'
  provider?: string
  requested_model?: string
  resolved_model?: string
  provider_generation_id?: string
  provider_request_id?: string
  source?: string
  metadata?: Record<string, unknown>
}

export interface OpenClawSkillCatalog {
  source: 'vibey_db'
  entries: Array<{
    id: string
    skill_key: string
    name: string
    description: string
  }>
}

export interface SystemPromptReport {
  source: 'run' | 'estimate'
  generatedAt: number
  sessionId?: string
  sessionKey?: string
  provider?: string
  model?: string
  workspaceDir?: string
  bootstrapMaxChars?: number
  systemPrompt: {
    chars: number
    projectContextChars: number
    nonProjectContextChars: number
  }
  injectedWorkspaceFiles: Array<{
    name: string
    path: string
    missing?: boolean
    rawChars: number
    injectedChars: number
    truncated: boolean
  }>
  skills: {
    promptChars: number
    entries: Array<{ name: string; blockChars: number }>
  }
  tools: {
    listChars: number
    schemaChars: number
    entries: Array<{
      name: string
      summaryChars: number
      schemaChars: number
      propertiesCount?: number | null
    }>
  }
}

export type OpenClawInputContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; source: { type: 'url'; url: string } }
  | { type: 'input_image'; source: { type: 'base64'; media_type: string; data: string } }
  | {
      type: 'input_file'
      source: { type: 'url'; url: string; media_type: string; filename?: string }
    }
  | {
      type: 'input_file'
      source: { type: 'base64'; media_type: string; data: string; filename?: string }
    }
  | Record<string, unknown>

export type OpenClawInputMessage = {
  type: string
  role: string
  content: string | OpenClawInputContentPart[]
}

export interface ProxyOptions {
  input: OpenClawInputMessage[]
  instructions?: string
  send: SendFn
  model?: string
  agentId?: string
  sessionKey?: string
  signal?: AbortSignal
  conversationId?: string
  campaignId?: string | null
  orgId?: string | null
  traceId?: string | null
  messageId?: string | null
  runId?: string | null
  requestId?: string | null
  userId?: string
  channel?: 'telegram' | 'slack' | 'studio'
  disableResponseFilter?: boolean
  relaxedResponseFilter?: boolean
  identitySuffix?: string
  enabledToolkits?: string[]
  disabledNativeActions?: string[]
  strictDisabledNativeActions?: boolean
  skillCatalog?: OpenClawSkillCatalog
  modelSettings?: OpenClawModelSettings
}

export interface OpenClawCompletionResult {
  content: string
  toolSteps: ToolStep[]
  artifactOutputBlocks?: Array<Record<string, unknown>>
  recoveryEvents?: TraceRecoveryEvent[]
  usage?: UsageData
  failed?: string
  truncated?: boolean
  fullSystemPrompt?: string
  llmInput?: Record<string, unknown>
  llmOutput?: unknown[]
  generationId?: string
  completedGenerations?: CompletedGeneration[]
  providerBillingAttempts?: ProviderBillingStartedEvent[]
  providerBillingAttemptWriteFailed?: boolean
  lastCallInputTokens?: number
  contextWindowTokens?: number
  compactionCount?: number
  systemPromptReport?: SystemPromptReport
}

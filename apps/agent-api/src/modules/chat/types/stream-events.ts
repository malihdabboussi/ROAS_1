/**
 * SSE Stream Events — Single Source of Truth
 *
 * Stream event types. Clean protocol. No duplicates.
 *
 * | Event         | Purpose                                          |
 * |---------------|--------------------------------------------------|
 * | message_start | Stream begins, provides message ID                |
 * | status        | Phase change: thinking / executing / streaming / compacting |
 * | tool_start    | Tool call began (with smart label)                |
 * | tool_update   | Tool call progress update                          |
 * | tool_end      | Tool call finished (with status)                  |
 * | generation_start | Model entered "writing" phase (UI only)        |
 * | generation_end   | Writing phase complete (UI only)                |
 * | context_update   | Context token breakdown changed                 |
 * | content_delta | Streaming text chunk                              |
 * | error         | Something went wrong                              |
 * | done          | Stream complete, includes usage + credits         |
 */

export type StreamEventType =
  | 'message_start'
  | 'status'
  | 'tool_start'
  | 'tool_update'
  | 'tool_end'
  | 'ui_block'
  | 'generation_start'
  | 'generation_end'
  | 'context_update'
  | 'retrieval_receipt'
  | 'web_source'
  | 'content_delta'
  | 'content_snapshot'
  | 'thinking_delta'
  | 'a2a_message'
  | 'error'
  | 'done'

export type AgentPhase = 'thinking' | 'executing' | 'streaming' | 'compacting'

export interface MessageStartPayload {
  message_id: string
  conversation_id: string
}

export interface StatusPayload {
  phase: AgentPhase
  message?: string
}

export interface ToolStartPayload {
  name: string
  label: string
  tool_call_id?: string
}

export interface ToolUpdatePayload {
  name: string
  detail: string
  tool_call_id?: string
}

export interface ToolEndPayload {
  name: string
  label: string
  status: 'completed' | 'failed'
  tool_call_id?: string
  /** Tool/provider error detail when status is failed */
  error?: string
}

export interface UiBlockPayload {
  block: Record<string, unknown>
}

export interface GenerationStartPayload {
  /** Vibey-provided label, e.g. "Writing sales page component" */
  label: string
}

export interface GenerationEndPayload {
  /** Optional label for pairing/debug; UI may ignore */
  label?: string
}

export interface ContextUpdatePayload {
  context_breakdown: Record<string, unknown>
}

export interface ContentDeltaPayload {
  content: string
}

export interface ThinkingDeltaPayload {
  delta: string
  text: string
}

export interface A2AMessagePayload {
  delegationId: string
  from: string
  fromName: string
  fromImage?: string
  to?: string
  toName?: string
  toImage?: string
  content: string
  turnIndex: number
  turnType: 'message' | 'thinking' | 'tool_use' | 'tool_result'
  toolName?: string
  isComplete: boolean
  callerAgent?: string
  targetAgent?: string
  targetAgentName?: string
  targetAgentImage?: string
  delegationType?: 'query' | 'delegation'
  initialPrompt?: string
}

export interface ErrorPayload {
  message: string
}

export interface UsageData {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  total_tokens?: number
}

export interface CreditData {
  credits_used?: number
  credits_remaining?: number
  api_cost?: number
}

export interface DonePayload {
  message_id: string
  usage?: UsageData
  credits?: CreditData
}

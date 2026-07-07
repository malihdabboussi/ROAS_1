export interface AgentTraceToolStep {
  name: string
  label: string
  status: 'completed' | 'failed' | string
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

export interface RequestTraceEvent {
  id: string
  created_at: string
  request_id?: string | null
  trace_id?: string | null
  message_id?: string | null
  run_id?: string | null
  conversation_id?: string | null
  surface: string
  service?: string | null
  route?: string | null
  method?: string | null
  event_type: string
  stage?: string | null
  status?: string | null
  status_code?: number | null
  duration_ms?: number | null
  span_id?: string | null
  parent_span_id?: string | null
  error_code?: string | null
  error_class?: string | null
  workflow_class?: string | null
  effect_state?: string | null
  retry_policy?: string | null
  source_file?: string | null
  source_line?: number | null
  source_column?: number | null
  function_name?: string | null
  runtime_file?: string | null
  runtime_line?: number | null
  runtime_column?: number | null
  commit_sha?: string | null
  release_id?: string | null
  build_id?: string | null
  source_resolved?: boolean | null
  code_context?: Record<string, unknown> | null
  observability?: Record<string, unknown> | null
}

/** Lightweight row for list / dev-dashboard metrics (no LLM payloads). */
export interface AgentTraceSummary {
  id: string
  user_id: string
  org_id?: string | null
  /** Resolved for admin list: user_profiles.display_name or profiles.full_name */
  user_display_name?: string | null
  conversation_id: string
  message_id?: string | null
  run_id?: string | null
  request_id?: string | null
  campaign_id: string | null
  session_key: string
  user_message: string
  /** studio | slack | telegram | mission */
  channel?: string | null
  agent_key?: string | null
  gateway_agent_id?: string | null
  history_length: number
  tool_steps: AgentTraceToolStep[] | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_write_tokens: number | null
  total_tokens: number | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  status: 'streaming' | 'completed' | 'failed'
  terminal_status?: 'done' | 'failed' | 'failed_recoverable' | 'cancelled' | null
  user_visible_outcome?:
    | 'output_visible'
    | 'recovered_output'
    | 'no_visible_output'
    | 'blocked'
    | 'cancelled'
    | null
  recovery_status?:
    | 'none'
    | 'recovered'
    | 'failed_recoverable'
    | 'failed_unrecoverable'
    | 'cancelled'
    | null
  recovery_events?: Array<Record<string, unknown>> | null
  observability?: Record<string, unknown> | null
  route_events?: RequestTraceEvent[]
  error: string | null
  model: string | null
  cost_usd: number | null
  created_at: string
}

/** Full trace including prompts and raw LLM I/O (detail endpoint). */
export interface AgentTrace extends AgentTraceSummary {
  system_prompt: string | null
  response: string | null
  messages_input?: Record<string, unknown> | null
  messages_output?: unknown | null
}

export type TracesStatusFilter = '' | 'streaming' | 'completed' | 'failed'

export type TracesChannelFilter = '' | 'studio' | 'mission' | 'brain-ops' | 'slack' | 'telegram'

export interface SourceCodePointer {
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
  source_resolved?: boolean
  code_context?: Record<string, unknown> | null
}

export interface ReleaseContext {
  commit_sha: string | null
  release_id: string | null
  build_id: string | null
}

export interface SourceCodePointerInput extends SourceCodePointer {
  stack?: string | null
  component_stack?: string | null
  source_context?: Record<string, unknown> | null
}

export interface RequestTraceEventInput extends SourceCodePointer {
  request_id?: string | null
  trace_id?: string | null
  message_id?: string | null
  run_id?: string | null
  conversation_id?: string | null
  user_id?: string | null
  org_id?: string | null
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
  observability?: Record<string, unknown> | null
}

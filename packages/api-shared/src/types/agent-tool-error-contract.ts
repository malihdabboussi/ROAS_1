export type AgentToolErrorReliability = 'high_confidence' | 'probable' | 'raw_unclassified'

export type AgentToolErrorEffectState =
  | 'failed_before_effect'
  | 'partial_effect'
  | 'succeeded_delivery_failed'
  | 'unknown_effect'

export type AgentToolRetryPolicyMode =
  | 'retry_same_payload'
  | 'retry_with_corrected_payload'
  | 'retry_after_delay'
  | 'do_not_retry_use_fallback'
  | 'do_not_retry_needs_user_action'
  | 'do_not_retry_terminal'

export interface AgentToolRetryPolicy {
  mode: AgentToolRetryPolicyMode
  max_attempts: number
  stop_after_same_error: boolean
  reason: string
  wait_ms?: number
}

export interface AgentToolCorrectionPlan {
  summary: string
  next_tool_preference?: string[]
}

export interface AgentToolFallbackPlan {
  summary: string
  user_visible_progress?: string
}

export interface AgentToolUserExplanation {
  intent: string
  sentence: string
}

export interface AgentToolErrorObservability {
  fingerprint: string
  report_level: 'info' | 'warn' | 'error'
}

export interface AgentToolErrorContract<ErrorClass extends string = string> {
  success: false
  error: string
  error_code: string
  error_class: ErrorClass
  workflow_class?: string
  reliability: AgentToolErrorReliability
  effect_state: AgentToolErrorEffectState
  retry_policy: AgentToolRetryPolicy
  correction: AgentToolCorrectionPlan
  fallback: AgentToolFallbackPlan | null
  agent_diagnosis: string
  agent_instruction: string
  user_explanation: AgentToolUserExplanation
  forbidden_user_framing: string[]
  observability: AgentToolErrorObservability
}

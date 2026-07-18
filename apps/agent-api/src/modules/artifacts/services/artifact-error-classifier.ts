import type {
  AgentToolCorrectionPlan,
  AgentToolErrorContract,
  AgentToolErrorEffectState,
  AgentToolErrorObservability,
  AgentToolErrorReliability,
  AgentToolFallbackPlan,
  AgentToolRetryPolicy,
  AgentToolRetryPolicyMode,
  AgentToolUserExplanation,
} from '@vibey/api-shared'
import {
  classifyArtifactError,
  toArtifactErrorMessage,
  type ArtifactErrorClass,
} from './artifact-error-classification'

export { classifyArtifactError, type ArtifactErrorClass } from './artifact-error-classification'

export type ArtifactErrorReliability = AgentToolErrorReliability
export type ArtifactErrorEffectState = AgentToolErrorEffectState
export type ArtifactRetryPolicyMode = AgentToolRetryPolicyMode
export type ArtifactRetryPolicy = AgentToolRetryPolicy
export type ArtifactCorrectionPlan = AgentToolCorrectionPlan
export type ArtifactFallbackPlan = AgentToolFallbackPlan
export type ArtifactUserExplanation = AgentToolUserExplanation
export type ArtifactErrorObservability = AgentToolErrorObservability

export interface ArtifactErrorContractOptions {
  errorCode?: string
  errorClass?: ArtifactErrorClass
  reliability?: ArtifactErrorReliability
  effectState?: ArtifactErrorEffectState
  retryPolicy?: Partial<ArtifactRetryPolicy>
  correction?: Partial<ArtifactCorrectionPlan>
  fallback?: ArtifactFallbackPlan | null
  agentDiagnosis?: string
  agentInstruction?: string
  userExplanation?: Partial<ArtifactUserExplanation>
  forbiddenUserFraming?: string[]
  observability?: Partial<ArtifactErrorObservability>
}

export interface ArtifactErrorEnvelope extends AgentToolErrorContract<ArtifactErrorClass> {
  retryable: boolean
  agent_guidance: string
  user_hint: string
}

const GUIDANCE: Record<ArtifactErrorClass, string> = {
  system_auth:
    "The user's session has expired. Do NOT retry this action or any other save/read action until they refresh. Tell the user to refresh their browser tab. You can still chat, draft content, and brainstorm — just no saves until they refresh.",
  integration_disconnected:
    'The required integration is not connected. Do NOT retry this action. Tell the user they need to connect the integration in Settings > Integrations. You can use the check_integration_connection action to verify status, or the initiate_integration_connect action to start the connection flow.',
  rate_limit:
    'This service is temporarily busy. You may retry after a brief pause, or try an alternative approach. If generating an image failed, try with a simpler prompt or a different style. Do not retry more than twice.',
  credits_exhausted:
    'The user has used all their credits. Do NOT retry any action that consumes credits. Let the user know they can add more credits in Settings > Billing.',
  wrong_action_family:
    'The agent chose the wrong action family. Do not retry the same action. Switch to the correct action family: for decks use create_presentation, for durable user facts use save_user_memory, for brain ingestion/model/narrative work delegate to Atlas, and for agent identity work delegate to HR.',
  permission_denied:
    'The action was blocked because the user does not have access to update or create that resource. Do NOT retry the same action. Tell the user clearly that they do not have the required access, and explain the required role or team membership from the error message.',
  validation:
    'The action failed due to invalid or missing input data. Review the error message, correct the input, and retry. Common issues: missing required fields, IDs that do not exist, or invalid formats.',
  integration_validation:
    'The integration call failed because the action slug or input parameters are invalid. Do NOT switch to document tools. Call get_integration for the same service, inspect the exact action_slug and required params, then retry use_integration with corrected data.params.',
  platform_schema_contract_mismatch:
    'The database schema does not match this action contract. Do NOT retry this action or an adjacent artifact action. A human engineer must apply the missing database migration and reload the PostgREST schema cache before this workflow can continue.',
  platform_data_query_failed:
    'The data lookup failed. Do NOT retry the same broad lookup repeatedly. If you already have a document_id, call get_document with that exact document_id. Otherwise use a narrower list_documents call with campaign_id, space_id, or search.',
  system_fault:
    'This action failed unexpectedly. Do NOT retry — it will fail again. Do NOT tell the user something went wrong, do NOT mention a platform error or internal issue, and do NOT suggest contacting support. Say you will try a different approach, then move on.',
}

const USER_HINTS: Record<ArtifactErrorClass, string> = {
  system_auth:
    'Your session has expired. Please refresh your browser tab and try again — I will pick up right where we left off.',
  integration_disconnected:
    'I need a connected integration to do this. Head to Settings > Integrations to connect it, then come back and we will finish this together.',
  rate_limit: 'The service I am using is busy right now. Give me a moment and I will try again.',
  credits_exhausted:
    'You have used all your credits for now. You can add more in Settings > Billing to keep going.',
  wrong_action_family: 'I need to route this to the right action first.',
  permission_denied: 'You do not have access to do that. An admin or agent team member can help.',
  validation: 'I ran into a small hiccup — let me adjust and try again.',
  integration_validation:
    'The integration needs different inputs. I will check the integration action details and try again.',
  platform_schema_contract_mismatch:
    'This step needs a database schema repair before it can continue.',
  platform_data_query_failed:
    'I hit a lookup issue, so I will use the document ID or narrow the search.',
  system_fault: 'I was not able to do that just now. Let me try a different approach.',
}

const ERROR_CODE_BY_CLASS: Record<ArtifactErrorClass, string> = {
  system_auth: 'ARTIFACT_SYSTEM_AUTH',
  integration_disconnected: 'ARTIFACT_INTEGRATION_DISCONNECTED',
  rate_limit: 'ARTIFACT_RATE_LIMIT',
  credits_exhausted: 'ARTIFACT_CREDITS_EXHAUSTED',
  wrong_action_family: 'ARTIFACT_WRONG_ACTION_FAMILY',
  permission_denied: 'ARTIFACT_PERMISSION_DENIED',
  validation: 'ARTIFACT_VALIDATION',
  integration_validation: 'ARTIFACT_INTEGRATION_VALIDATION',
  platform_schema_contract_mismatch: 'ARTIFACT_SCHEMA_CONTRACT_MISMATCH',
  platform_data_query_failed: 'ARTIFACT_DATA_QUERY_FAILED',
  system_fault: 'ARTIFACT_SYSTEM_FAULT',
}

const RELIABILITY_BY_CLASS: Record<ArtifactErrorClass, ArtifactErrorReliability> = {
  system_auth: 'probable',
  integration_disconnected: 'probable',
  rate_limit: 'probable',
  credits_exhausted: 'probable',
  wrong_action_family: 'probable',
  permission_denied: 'probable',
  validation: 'probable',
  integration_validation: 'probable',
  platform_schema_contract_mismatch: 'probable',
  platform_data_query_failed: 'probable',
  system_fault: 'raw_unclassified',
}

const EFFECT_STATE_BY_CLASS: Record<ArtifactErrorClass, ArtifactErrorEffectState> = {
  system_auth: 'failed_before_effect',
  integration_disconnected: 'failed_before_effect',
  rate_limit: 'unknown_effect',
  credits_exhausted: 'failed_before_effect',
  wrong_action_family: 'failed_before_effect',
  permission_denied: 'failed_before_effect',
  validation: 'failed_before_effect',
  integration_validation: 'failed_before_effect',
  platform_schema_contract_mismatch: 'failed_before_effect',
  platform_data_query_failed: 'unknown_effect',
  system_fault: 'unknown_effect',
}

const RETRY_POLICY_BY_CLASS: Record<ArtifactErrorClass, ArtifactRetryPolicy> = {
  system_auth: {
    mode: 'do_not_retry_needs_user_action',
    max_attempts: 0,
    stop_after_same_error: true,
    reason: 'The browser session must be refreshed before save/read actions can work.',
  },
  integration_disconnected: {
    mode: 'do_not_retry_needs_user_action',
    max_attempts: 0,
    stop_after_same_error: true,
    reason: 'The missing integration must be connected before this action can succeed.',
  },
  rate_limit: {
    mode: 'retry_after_delay',
    max_attempts: 2,
    stop_after_same_error: true,
    wait_ms: 5000,
    reason: 'A delayed retry can succeed, but repeated immediate retries amplify the failure.',
  },
  credits_exhausted: {
    mode: 'do_not_retry_needs_user_action',
    max_attempts: 0,
    stop_after_same_error: true,
    reason: 'The user needs available credits before credit-consuming actions can work.',
  },
  wrong_action_family: {
    mode: 'retry_with_corrected_payload',
    max_attempts: 1,
    stop_after_same_error: true,
    reason: 'Retry only by switching to the correct action family or delegated agent.',
  },
  permission_denied: {
    mode: 'do_not_retry_needs_user_action',
    max_attempts: 0,
    stop_after_same_error: true,
    reason: 'The user or agent lacks access to this resource.',
  },
  validation: {
    mode: 'retry_with_corrected_payload',
    max_attempts: 1,
    stop_after_same_error: true,
    reason: 'Retry only after correcting the missing or invalid fields named in the error.',
  },
  integration_validation: {
    mode: 'retry_with_corrected_payload',
    max_attempts: 1,
    stop_after_same_error: true,
    reason: 'Retry only after checking the integration action contract and required params.',
  },
  platform_schema_contract_mismatch: {
    mode: 'do_not_retry_terminal',
    max_attempts: 0,
    stop_after_same_error: true,
    reason:
      'Changing the action payload cannot repair a missing database column or stale schema contract.',
  },
  platform_data_query_failed: {
    mode: 'retry_with_corrected_payload',
    max_attempts: 1,
    stop_after_same_error: true,
    reason: 'Retry only with an exact id or a narrower lookup.',
  },
  system_fault: {
    mode: 'do_not_retry_use_fallback',
    max_attempts: 0,
    stop_after_same_error: true,
    reason: 'The failure is not classified as correctable from the current tool payload.',
  },
}

const CORRECTION_BY_CLASS: Record<ArtifactErrorClass, ArtifactCorrectionPlan> = {
  system_auth: {
    summary: 'Pause save/read actions until the user refreshes the browser session.',
  },
  integration_disconnected: {
    summary: 'Ask the user to connect the integration, or start the connection flow if available.',
    next_tool_preference: ['check_integration_connection', 'initiate_integration_connect'],
  },
  rate_limit: {
    summary: 'Wait briefly, then retry at most twice or use a lighter alternative.',
  },
  credits_exhausted: {
    summary: 'Do not retry credit-consuming actions until the user adds credits.',
  },
  wrong_action_family: {
    summary: 'Switch to the correct action family instead of repeating this call.',
    next_tool_preference: ['create_presentation', 'save_user_memory', 'ask_agent'],
  },
  permission_denied: {
    summary: 'Stop this action and explain the required role or team membership.',
  },
  validation: {
    summary: 'Fix the named missing or invalid fields before retrying.',
    next_tool_preference: ['describe_action'],
  },
  integration_validation: {
    summary: 'Fetch the integration action contract and retry with corrected params.',
    next_tool_preference: ['get_integration', 'use_integration'],
  },
  platform_schema_contract_mismatch: {
    summary: 'Apply the missing database migration and reload the PostgREST schema cache.',
  },
  platform_data_query_failed: {
    summary: 'Use an exact id when available, otherwise narrow the lookup query.',
    next_tool_preference: ['get_document', 'list_documents'],
  },
  system_fault: {
    summary: 'Stop this call and choose a different user-useful approach.',
  },
}

const FALLBACK_BY_CLASS: Record<ArtifactErrorClass, ArtifactFallbackPlan | null> = {
  system_auth: {
    summary: 'Continue with drafting, planning, or explanation that does not require saved state.',
  },
  integration_disconnected: null,
  rate_limit: {
    summary: 'Offer a lighter output or continue with non-generative work while waiting.',
  },
  credits_exhausted: null,
  wrong_action_family: {
    summary: 'Delegate to the right specialist or use the matching artifact action.',
  },
  permission_denied: null,
  validation: null,
  integration_validation: {
    summary: 'Inspect the integration contract before trying the integration call again.',
  },
  platform_schema_contract_mismatch: null,
  platform_data_query_failed: {
    summary: 'Use a known id, active artifact context, or narrower list call.',
  },
  system_fault: {
    summary: 'Try a different action path that still helps the user.',
    user_visible_progress: 'I will try a different approach.',
  },
}

const DIAGNOSIS_BY_CLASS: Record<ArtifactErrorClass, string> = {
  system_auth:
    'The action needs a valid browser session and the current session is missing or expired.',
  integration_disconnected: 'The requested external integration is not connected or enabled.',
  rate_limit: 'The target service rejected the call because of rate or quota pressure.',
  credits_exhausted:
    'The requested action consumes credits and no credits are currently available.',
  wrong_action_family: 'The selected tool family does not own the requested resource or workflow.',
  permission_denied: 'The caller does not have permission for the requested resource operation.',
  validation: 'The tool payload is missing required data or contains invalid data.',
  integration_validation:
    'The integration tool slug or params do not match the integration contract.',
  platform_schema_contract_mismatch:
    'The action requires a database column that is absent from the live PostgREST schema contract.',
  platform_data_query_failed: 'The data lookup failed or was too broad for the available context.',
  system_fault: 'The raw error did not match a reliable correctable failure class.',
}

const USER_EXPLANATION_BY_CLASS: Record<ArtifactErrorClass, ArtifactUserExplanation> = {
  system_auth: {
    intent: 'ask_user_to_refresh',
    sentence: USER_HINTS.system_auth,
  },
  integration_disconnected: {
    intent: 'ask_user_to_connect_integration',
    sentence: USER_HINTS.integration_disconnected,
  },
  rate_limit: {
    intent: 'retry_later',
    sentence: USER_HINTS.rate_limit,
  },
  credits_exhausted: {
    intent: 'ask_user_to_add_credits',
    sentence: USER_HINTS.credits_exhausted,
  },
  wrong_action_family: {
    intent: 'reroute_work',
    sentence: USER_HINTS.wrong_action_family,
  },
  permission_denied: {
    intent: 'explain_access_limit',
    sentence: USER_HINTS.permission_denied,
  },
  validation: {
    intent: 'correct_and_retry',
    sentence: USER_HINTS.validation,
  },
  integration_validation: {
    intent: 'inspect_contract_and_retry',
    sentence: USER_HINTS.integration_validation,
  },
  platform_schema_contract_mismatch: {
    intent: 'needs_schema_repair',
    sentence: USER_HINTS.platform_schema_contract_mismatch,
  },
  platform_data_query_failed: {
    intent: 'narrow_lookup',
    sentence: USER_HINTS.platform_data_query_failed,
  },
  system_fault: {
    intent: 'use_alternate_approach',
    sentence: USER_HINTS.system_fault,
  },
}

const REPORT_LEVEL_BY_CLASS: Record<
  ArtifactErrorClass,
  ArtifactErrorObservability['report_level']
> = {
  system_auth: 'warn',
  integration_disconnected: 'info',
  rate_limit: 'warn',
  credits_exhausted: 'info',
  wrong_action_family: 'warn',
  permission_denied: 'warn',
  validation: 'info',
  integration_validation: 'warn',
  platform_schema_contract_mismatch: 'error',
  platform_data_query_failed: 'warn',
  system_fault: 'error',
}

const LEGACY_RETRYABLE_CLASSES = new Set<ArtifactErrorClass>([
  'validation',
  'integration_validation',
  'rate_limit',
])

const FORBIDDEN_USER_FRAMING = [
  'platform error',
  'platform problem',
  'platform rendering issue',
  'infrastructure issue',
  'backend problem',
  'internal issue',
]

export function buildErrorEnvelope(
  error: unknown,
  options: ArtifactErrorContractOptions = {},
): ArtifactErrorEnvelope {
  const message = toArtifactErrorMessage(error)
  const errorClass = options.errorClass ?? classifyArtifactError(error)
  const errorCode = options.errorCode ?? ERROR_CODE_BY_CLASS[errorClass]
  const agentInstruction = options.agentInstruction ?? GUIDANCE[errorClass]
  const userExplanation = {
    ...USER_EXPLANATION_BY_CLASS[errorClass],
    ...(options.userExplanation ?? {}),
  }
  const forbiddenUserFraming = [
    ...new Set([...FORBIDDEN_USER_FRAMING, ...(options.forbiddenUserFraming ?? [])]),
  ]

  return {
    success: false,
    error: message,
    error_code: errorCode,
    error_class: errorClass,
    reliability:
      options.reliability ??
      (options.errorClass ? 'high_confidence' : RELIABILITY_BY_CLASS[errorClass]),
    effect_state: options.effectState ?? EFFECT_STATE_BY_CLASS[errorClass],
    retry_policy: {
      ...RETRY_POLICY_BY_CLASS[errorClass],
      ...(options.retryPolicy ?? {}),
    },
    correction: {
      ...CORRECTION_BY_CLASS[errorClass],
      ...(options.correction ?? {}),
    },
    fallback: options.fallback === undefined ? FALLBACK_BY_CLASS[errorClass] : options.fallback,
    agent_diagnosis: options.agentDiagnosis ?? DIAGNOSIS_BY_CLASS[errorClass],
    agent_instruction: agentInstruction,
    user_explanation: userExplanation,
    forbidden_user_framing: forbiddenUserFraming,
    observability: {
      fingerprint: `artifact.${errorCode.toLowerCase()}`,
      report_level: REPORT_LEVEL_BY_CLASS[errorClass],
      ...(options.observability ?? {}),
    },
    retryable: LEGACY_RETRYABLE_CLASSES.has(errorClass),
    agent_guidance: agentInstruction,
    user_hint: USER_HINTS[errorClass] || message,
  }
}

/**
 * Track consecutive failures per session to escalate guidance.
 * After ESCALATION_THRESHOLD identical non-validation failures,
 * prepend a forceful "STOP retrying" directive.
 */
const sessionFailureCounts = new Map<string, { errorClass: ArtifactErrorClass; count: number }>()
const ESCALATION_THRESHOLD = 3

export function buildErrorEnvelopeWithEscalation(
  error: unknown,
  sessionKey: string | undefined,
  options: ArtifactErrorContractOptions = {},
): ArtifactErrorEnvelope {
  const envelope = buildErrorEnvelope(error, options)

  if (
    !sessionKey ||
    envelope.error_class === 'validation' ||
    envelope.error_class === 'integration_validation'
  )
    return envelope

  const key = sessionKey
  const entry = sessionFailureCounts.get(key)

  if (entry && entry.errorClass === envelope.error_class) {
    entry.count++
  } else {
    sessionFailureCounts.set(key, {
      errorClass: envelope.error_class,
      count: 1,
    })
  }

  const current = sessionFailureCounts.get(key)!
  if (current.count >= ESCALATION_THRESHOLD) {
    const stopInstruction = `STOP RETRYING. You have tried this ${current.count} times and it keeps failing. Move on. `
    envelope.agent_guidance = stopInstruction + envelope.agent_guidance
    envelope.agent_instruction = stopInstruction + envelope.agent_instruction
    envelope.retry_policy = {
      mode: 'do_not_retry_terminal',
      max_attempts: 0,
      stop_after_same_error: true,
      reason: 'The same non-correctable tool error repeated in this session.',
    }
  }

  return envelope
}

export function clearSessionFailures(sessionKey: string): void {
  sessionFailureCounts.delete(sessionKey)
}

export function recordSessionSuccess(sessionKey: string | undefined): void {
  if (sessionKey) sessionFailureCounts.delete(sessionKey)
}

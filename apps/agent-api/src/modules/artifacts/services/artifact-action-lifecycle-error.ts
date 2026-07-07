import type { ErrorReporter } from '@vibey/api-shared'
import {
  buildActionOnHoldMessage,
  getPromptModeActionLifecycle,
} from './artifact-action-lifecycle'
import { buildErrorEnvelopeWithEscalation } from './artifact-error-classifier'

type ActionOnHoldHost = {
  errorReporter?: ErrorReporter
  resolveUserId?: (sessionKey?: string) => string | null | undefined
  parseAgentIdFromSessionKey?: (sessionKey?: string) => string | null | undefined
}

export function buildActionOnHoldPreflightFailure(input: {
  host: ActionOnHoldHost
  action: string
  actionData: Record<string, unknown>
  normalizedKeys: unknown[]
  sessionKey?: string
}) {
  const lifecycle = getPromptModeActionLifecycle(input.action)
  const message = buildActionOnHoldMessage(input.action)

  input.host.errorReporter?.report({
    app: 'agent-api',
    severity: 'warn',
    feature: 'artifacts',
    error_code: 'action_on_hold',
    message,
    category: 'tool',
    context: {
      action: input.action,
      lifecycle,
      providedKeys: Object.keys(input.actionData),
      normalizedKeys: input.normalizedKeys,
      sessionKey: input.sessionKey?.slice(0, 40),
    },
    user_id: input.host.resolveUserId?.(input.sessionKey) ?? undefined,
    agent_key: input.host.parseAgentIdFromSessionKey?.(input.sessionKey) ?? undefined,
  })

  return buildErrorEnvelopeWithEscalation(message, input.sessionKey, {
    errorClass: 'validation',
    reliability: 'high_confidence',
    effectState: 'failed_before_effect',
    errorCode: 'ACTION_ON_HOLD',
    retryPolicy: {
      mode: 'do_not_retry_terminal',
      max_attempts: 0,
      stop_after_same_error: true,
      reason: 'This action is on hold. Do not retry the same action.',
    },
    agentDiagnosis:
      'The requested backend action exists only for compatibility and is currently hidden from PromptMode agents.',
    agentInstruction: lifecycle.replacement_guidance,
    correction: {
      summary: 'Choose an active PromptMode action instead of this on-hold action.',
      next_tool_preference: ['describe_action'],
    },
    userExplanation: {
      intent: 'choose_available_action',
      sentence: 'I picked an unavailable action, so I will switch to an available one.',
    },
    observability: { fingerprint: 'artifact.action_on_hold' },
  })
}

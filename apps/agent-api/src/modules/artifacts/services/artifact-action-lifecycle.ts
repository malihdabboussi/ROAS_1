import {
  isPromptModeActionOnHold as isPolicyPromptModeActionOnHold,
  ON_HOLD_PROMPTMODE_ACTIONS,
} from '@vibey/agent-policy'
import { VALID_ACTIONS } from '../dtos/artifact-action.dto'

export type PromptModeBackendAction = (typeof VALID_ACTIONS)[number]
export type PromptModeActionLifecycleStatus = 'active' | 'on_hold'

export type PromptModeActionLifecycle = {
  status: PromptModeActionLifecycleStatus
  agent_available: boolean
  reason: string
  replacement_guidance: string
}

const VALID_ACTION_SET = new Set<string>(VALID_ACTIONS)

export const ACTIVE_PROMPTMODE_ACTIONS = VALID_ACTIONS.filter(
  (action) => !isPolicyPromptModeActionOnHold(action),
) as PromptModeBackendAction[]

export function isPromptModeActionOnHold(action: string): boolean {
  return isPolicyPromptModeActionOnHold(action)
}

export function getPromptModeActionLifecycle(action: string): PromptModeActionLifecycle {
  if (isPolicyPromptModeActionOnHold(action)) {
    return {
      status: 'on_hold',
      agent_available: false,
      reason: 'This action exists in backend but is not available to agents right now.',
      replacement_guidance:
        'Pick an active action from describe_action or the current vibey-api skill docs. Do not retry this action.',
    }
  }

  return {
    status: 'active',
    agent_available: VALID_ACTION_SET.has(action),
    reason: VALID_ACTION_SET.has(action)
      ? 'This action is available to agents.'
      : 'This action is not registered in the backend action list.',
    replacement_guidance: VALID_ACTION_SET.has(action)
      ? 'Use the documented schema and preflight guidance for this action.'
      : 'Choose a registered action from describe_action or the current vibey-api skill docs.',
  }
}

export function buildActionOnHoldMessage(action: string): string {
  return `Action "${action}" exists in backend for compatibility, but is not available to agents right now.`
}

export function assertPromptModeOnHoldActionsExistInBackend(): void {
  const missing = ON_HOLD_PROMPTMODE_ACTIONS.filter((action) => !VALID_ACTION_SET.has(action))
  if (missing.length > 0) {
    throw new Error(`On-hold PromptMode actions missing from backend: ${missing.join(', ')}`)
  }
}

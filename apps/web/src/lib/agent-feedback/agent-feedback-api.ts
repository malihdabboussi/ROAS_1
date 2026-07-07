import { backendPost } from '@/lib/api/backend-client'
import type {
  AgentTurnFeedbackLookupResponse,
  AgentTurnFeedbackPayload,
  AgentTurnFeedbackRow,
  AgentTurnFeedbackTarget,
} from './types'

export async function saveAgentTurnFeedback(
  payload: AgentTurnFeedbackPayload,
): Promise<AgentTurnFeedbackRow> {
  return backendPost<AgentTurnFeedbackRow>('/api/agent-feedback', payload)
}

export async function lookupAgentTurnFeedback(
  targets: AgentTurnFeedbackTarget[],
): Promise<AgentTurnFeedbackLookupResponse> {
  return backendPost<AgentTurnFeedbackLookupResponse>('/api/agent-feedback/lookup', { targets })
}

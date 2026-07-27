import { ACTION_TO_DOMAIN, type Domain } from '@vibey/agent-policy'
import type { MissionStatus } from '../../types'
import type {
  MissionContractVerificationResult,
  MissionOutputContract,
} from '../persistence/mission-output-contract.types'

export type MissionPreflightDomain = Domain

export const CONTRACT_ACTION_DOMAINS: Partial<Record<string, MissionPreflightDomain>> =
  ACTION_TO_DOMAIN

export function resolveMissionStatusWhileSubtaskRuns(status: MissionStatus): MissionStatus {
  return status === 'awaiting_access_approval' ? status : 'in_progress'
}

export type ToolDeliverableReceipt = {
  deliverable_id: string
  title: string | null
  file_url: string | null
  file_name: string | null
}

export function extractToolDeliverableReceipt(result: unknown): ToolDeliverableReceipt | null {
  const visited = new Set<object>()

  const visit = (value: unknown, depth: number): ToolDeliverableReceipt | null => {
    if (depth > 8 || value == null) return null
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
      try {
        return visit(JSON.parse(trimmed), depth + 1)
      } catch {
        return null
      }
    }
    if (typeof value !== 'object') return null
    if (visited.has(value)) return null
    visited.add(value)

    if (Array.isArray(value)) {
      for (const item of value) {
        const receipt = visit(item, depth + 1)
        if (receipt) return receipt
      }
      return null
    }

    const record = value as Record<string, unknown>
    const deliverableId =
      typeof record.deliverable_id === 'string' ? record.deliverable_id.trim() : ''
    if (deliverableId) {
      return {
        deliverable_id: deliverableId,
        title: typeof record.title === 'string' ? record.title : null,
        file_url: typeof record.file_url === 'string' ? record.file_url : null,
        file_name: typeof record.file_name === 'string' ? record.file_name : null,
      }
    }

    for (const key of ['content', 'text', 'details', 'data', 'result']) {
      const receipt = visit(record[key], depth + 1)
      if (receipt) return receipt
    }
    return null
  }

  return visit(result, 0)
}

export function activeSubtasksAllDone(statusRows: Array<{ status: unknown }>): boolean {
  const active = statusRows.filter((row) => String(row.status) !== 'cancelled')
  return active.length > 0 && active.every((row) => String(row.status) === 'done')
}

export function normalizeOutputContract(value: unknown): MissionOutputContract | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const artifactKind = String(record.artifact_kind ?? '')
  const requiredAction = String(record.required_action ?? '')
  const requiredArtifactType = String(record.required_artifact_type ?? '')
  if (
    ![
      'agent_skill',
      'document_artifact',
      'presentation_artifact',
      'brain_ingestion',
      'ad_artifact',
      'funnel_artifact',
      'media_artifact',
    ].includes(artifactKind)
  ) {
    return null
  }
  if (!requiredAction || !requiredArtifactType) return null
  return {
    artifact_kind: artifactKind as MissionOutputContract['artifact_kind'],
    required_action: requiredAction,
    required_artifact_type: requiredArtifactType,
    expected:
      record.expected && typeof record.expected === 'object' && !Array.isArray(record.expected)
        ? (record.expected as Record<string, unknown>)
        : undefined,
  }
}

export function getOutputContractConsistencyError(contract: MissionOutputContract): string | null {
  if (contract.required_action !== 'process_media') return null
  if (contract.artifact_kind !== 'media_artifact') {
    return 'Action "process_media" requires artifact_kind "media_artifact".'
  }
  if (!['image', 'video', 'file'].includes(contract.required_artifact_type)) {
    return 'Action "process_media" requires required_artifact_type "image", "video", or "file".'
  }
  return null
}

export function prepareExecutionStateForContractCorrection(
  executionState: unknown,
  requiredAction: string,
  verification: MissionContractVerificationResult,
): Record<string, unknown> {
  const state =
    executionState && typeof executionState === 'object' && !Array.isArray(executionState)
      ? (executionState as Record<string, unknown>)
      : {}
  const completedActions = Array.isArray(state.completed_actions)
    ? (state.completed_actions as Array<Record<string, unknown>>)
    : []
  const retainedActions = completedActions.filter((entry) => {
    const action = typeof entry.action === 'string' ? entry.action : ''
    const toolAction = typeof entry.toolAction === 'string' ? entry.toolAction : ''
    return action !== requiredAction && toolAction !== requiredAction
  })
  const { partial_output: _partialOutput, current_tool: _currentTool, ...rest } = state

  return {
    ...rest,
    completed_actions: retainedActions,
    execution_status: 'pending_correction',
    contract_correction: {
      required_action: requiredAction,
      reason: verification.reason,
    },
  }
}

export function buildContractCorrectionContext(executionState: unknown): string {
  const state =
    executionState && typeof executionState === 'object' && !Array.isArray(executionState)
      ? (executionState as Record<string, unknown>)
      : {}
  const correction =
    state.contract_correction &&
    typeof state.contract_correction === 'object' &&
    !Array.isArray(state.contract_correction)
      ? (state.contract_correction as Record<string, unknown>)
      : null
  if (!correction) return ''

  const requiredAction = String(correction.required_action || '').trim()
  const reason = String(correction.reason || '').trim()
  return [
    '\nCONTRACT_CORRECTION (MANDATORY):',
    `- previous_failure: ${reason || 'The prior artifact failed output verification.'}`,
    `- required_action: ${requiredAction || 'Re-run the contracted creation action.'}`,
    '- Do not reuse, cite, or return the previously failed artifact as proof of completion.',
    '- Call the required creation action again and return the new compliant deliverable_id.',
    '- The correction is incomplete until the newly created artifact passes the output contract.',
  ].join('\n')
}

export function evaluateSubtaskOutputAlignment(
  subtask: Record<string, any>,
  output: Record<string, unknown>,
  latestComment: string,
): { ok: boolean; reason: string } {
  const content = String(output.content || '').trim()
  const summary = String(output.summary || '').trim()
  if (content.length < 40) return { ok: false, reason: 'output content is too short or missing' }
  if (summary.length < 6) return { ok: false, reason: 'summary is too short or missing' }

  if (subtask.status === 'revision' && subtask.feedback) {
    const feedbackKeywords = extractIntentKeywords(String(subtask.feedback))
    if (feedbackKeywords.length > 0) {
      const corpus = `${content} ${summary}`.toLowerCase()
      if (!feedbackKeywords.some((keyword) => corpus.includes(keyword))) {
        return { ok: false, reason: 'revision feedback was not reflected in the output' }
      }
    }
  }

  if (latestComment.trim().length > 0) {
    const commentKeywords = extractIntentKeywords(latestComment)
    if (commentKeywords.length > 0) {
      const corpus = `${content} ${summary}`.toLowerCase()
      if (!commentKeywords.some((keyword) => corpus.includes(keyword))) {
        return { ok: false, reason: 'latest user intent is not reflected in the output' }
      }
    }
  }

  return { ok: true, reason: 'aligned' }
}

function extractIntentKeywords(text: string): string[] {
  const stop = new Set([
    'please',
    'this',
    'that',
    'with',
    'from',
    'about',
    'there',
    'their',
    'have',
    'your',
    'would',
    'could',
    'should',
    'make',
    'need',
    'want',
    'task',
    'comment',
    'latest',
    'user',
    'intent',
  ])
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 5 && !stop.has(word))
  return [...new Set(words)].slice(0, 6)
}

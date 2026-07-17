import type { MissionOutputContract } from '../persistence/mission-deliverables.repository'

export type MissionPreflightDomain =
  | 'manage_content'
  | 'write_marketing_artifacts'
  | 'manage_own_skills'
  | 'write_brain'
  | 'edit_brain_models'
  | 'edit_brain_company'
  | 'edit_brain_customer'

export const CONTRACT_ACTION_DOMAINS: Record<string, MissionPreflightDomain> = {
  save_document: 'manage_content',
  create_pdf: 'manage_content',
  create_docx: 'manage_content',
  create_presentation: 'write_marketing_artifacts',
  create_agent_skill: 'manage_own_skills',
  update_agent_skill: 'manage_own_skills',
  create_agent_skill_resource: 'manage_own_skills',
  ingest_user_brain_document: 'write_brain',
  ingest_user_brain_text: 'write_brain',
  ingest_agent_brain_text: 'write_brain',
  ingest_agent_brain_link: 'write_brain',
  ingest_fathom_meeting: 'write_brain',
  ingest_fireflies_transcript: 'write_brain',
  create_brain_page: 'write_brain',
  create_strategy_node: 'edit_brain_models',
  propose_company_brain_signal: 'edit_brain_company',
  create_company_brain_object: 'edit_brain_company',
  update_company_brain_object: 'edit_brain_company',
  save_customer_memory: 'edit_brain_customer',
  ingest_customer_brain_text: 'edit_brain_customer',
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

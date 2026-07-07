import type { SkillRecommendation } from '@/lib/skill-recommendations'

export const AGENT_IMPROVEMENT_SUGGESTION_MESSAGES = {
  REVIEW_ACTION: 'Review',
  MODAL_TITLE: 'Review suggestion',
  MODAL_SOURCE_BADGE: 'Jaime suggestion',
  APPLY_ACTION: 'Apply suggestion',
  CHECK_ACTION: 'Check experiment',
  DISMISS_ACTION: 'Dismiss suggestion',
  CLOSE_ACTION: 'Close',
  SUMMARY_TITLE: 'Why this came up',
  TARGET_TITLE: 'Target',
  PATCH_TITLE: 'Proposed change',
  RESOURCES_TITLE: 'Resources',
  ACTIONS_TITLE: 'Recommended actions',
  NO_PATCH: 'No patch preview available.',
  APPLY_SUCCESS: 'Agent improvement applied',
  APPLY_ERROR: 'Failed to apply agent improvement',
  EVALUATE_ERROR: 'Failed to evaluate experiment',
  DISMISS_ERROR: 'Failed to dismiss recommendation',
} as const

export function formatAgentImprovementConfidence(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

export function formatAgentImprovementEvidenceCount(item: Pick<SkillRecommendation, 'evidence_event_ids'>): string {
  const count = item.evidence_event_ids.length
  return `${count} evidence ${count === 1 ? 'point' : 'points'}`
}

export function formatAgentImprovementProposalLabel(
  item: Pick<
    SkillRecommendation,
    'proposal_kind' | 'target_artifact_key' | 'skill_key' | 'target_artifact_kind'
  >,
): string {
  if (item.proposal_kind === 'agent_file_update') return item.target_artifact_key ?? 'Agent file'
  if (item.proposal_kind === 'skill_update') return `Update ${item.skill_key}`
  if (item.proposal_kind === 'skill_resource_update') return `Resource for ${item.skill_key}`
  if (item.proposal_kind === 'route_out') return item.target_artifact_kind
  return `Create ${item.skill_key}`
}

export function getAgentImprovementPatchPreview(item: SkillRecommendation, maxLength = 140): string | null {
  const patch = item.proposed_patch ?? {}
  const direct =
    typeof patch.content === 'string'
      ? patch.content
      : typeof patch.markdown_content === 'string'
        ? patch.markdown_content
        : typeof patch.problem === 'string'
          ? patch.problem
          : null
  if (!direct) return null
  const compact = direct.replace(/\s+/g, ' ').trim()
  if (!compact) return null
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact
}

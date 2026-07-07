import {
  formatAgentImprovementConfidence,
  formatAgentImprovementProposalLabel,
  getAgentImprovementPatchPreview,
} from '@/features/home/config/agent-improvement-suggestions.config'
import type { CompanyCortexSignal } from '@/lib/brain'
import type { SkillRecommendation, SkillRecommendationStatus } from '@/lib/skill-recommendations'

export type SuggestionReviewSource = 'jaime' | 'atlas'

export type SuggestionReviewItem =
  | {
      id: string
      source: 'jaime'
      title: string
      summary: string
      recommendation: SkillRecommendation
    }
  | {
      id: string
      source: 'atlas'
      title: string
      summary: string
      signal: CompanyCortexSignal
      localStatus?: 'approved' | 'rejected'
    }

export function toJaimeSuggestionItem(item: SkillRecommendation): SuggestionReviewItem {
  return {
    id: `jaime:${item.id}`,
    source: 'jaime',
    title: item.name,
    summary: item.workflow_summary || item.description,
    recommendation: item,
  }
}

export function toAtlasSuggestionItem(signal: CompanyCortexSignal): SuggestionReviewItem {
  return {
    id: `atlas:${signal.id}`,
    source: 'atlas',
    title: signal.truth,
    summary: signal.reason ?? signal.context_form ?? 'Atlas found a Company Cortex signal.',
    signal,
  }
}

export function getSuggestionSourceLabel(source: SuggestionReviewSource): string {
  return source === 'jaime' ? 'Jaime' : 'Atlas'
}

export function getSuggestionStatusLabel(item: SuggestionReviewItem): string {
  if (item.source === 'atlas') {
    if (item.localStatus === 'approved' || item.signal.status === 'active') return 'Approved'
    if (item.localStatus === 'rejected' || item.signal.status === 'rejected') return 'Rejected'
    return 'Open'
  }

  const status = item.recommendation.status
  if (status === 'experiment_running') return 'Experiment'
  if (status === 'kept' || status === 'converted') return 'Approved'
  if (status === 'dismissed' || status === 'reverted') return 'Rejected'
  if (status === 'revising') return 'Revise'
  if (status === 'inconclusive') return 'Inconclusive'
  return 'Open'
}

export function getSuggestionStatusBadgeClass(item: SuggestionReviewItem): string {
  const label = getSuggestionStatusLabel(item)
  if (label === 'Approved') return 'badge-glass-green'
  if (label === 'Rejected' || label === 'Revise') return 'badge-glass-orange'
  if (label === 'Experiment') return 'badge-glass-blue'
  if (label === 'Inconclusive') return 'badge-glass-muted'
  return 'badge-glass-purple'
}

export function getSuggestionSourceBadgeClass(_source: SuggestionReviewSource): string {
  return 'badge-glass-orange'
}

export function getSuggestionConfidenceLabel(item: SuggestionReviewItem): string {
  const value = item.source === 'jaime' ? item.recommendation.confidence : item.signal.confidence
  return formatAgentImprovementConfidence(value)
}

export function getSuggestionEvidenceLabel(item: SuggestionReviewItem): string {
  const count =
    item.source === 'jaime'
      ? item.recommendation.evidence_event_ids.length
      : item.signal.evidence_refs.length
  return `${count} evidence ${count === 1 ? 'point' : 'points'}`
}

export function getSuggestionTargetLabel(item: SuggestionReviewItem): string {
  if (item.source === 'atlas') return formatAtlasSignalType(item.signal.signal_type)
  const rec = item.recommendation
  return [rec.target_agent_key, rec.target_artifact_kind, rec.target_artifact_key ?? rec.skill_key]
    .filter(Boolean)
    .join(' / ')
}

export function getSuggestionActionLabel(item: SuggestionReviewItem): string {
  if (item.source === 'atlas') return 'Review Company Cortex signal'
  return formatAgentImprovementProposalLabel(item.recommendation)
}

export function getSuggestionPatchPreview(
  item: SuggestionReviewItem,
  maxLength = 1600,
): string | null {
  if (item.source === 'atlas') return null
  return getAgentImprovementPatchPreview(item.recommendation, maxLength)
}

export function isJaimeActionableStatus(status: SkillRecommendationStatus): boolean {
  return status === 'ready' || status === 'experiment_running'
}

export function formatAtlasSignalType(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getSuggestionBannerBody(items: SuggestionReviewItem[]): string {
  const count = items.length
  const hasJaime = items.some((item) => item.source === 'jaime')
  const hasAtlas = items.some((item) => item.source === 'atlas')
  const sourceLabel = hasJaime && hasAtlas ? 'Jaime and Atlas' : hasJaime ? 'Jaime' : 'Atlas'
  return `${sourceLabel} found ${count} ${count === 1 ? 'suggestion' : 'suggestions'} to review.`
}

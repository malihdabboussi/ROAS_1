import type { ClassifiedArtifactContext } from '../../artifacts/services/artifact-context-relevance.service'
import { classifyArtifactContext } from '../../artifacts/services/artifact-context-relevance.service'
import type {
  SpaceRetrievalCandidate,
  SpaceRetrievalSearchResult,
} from '../types/space-retrieval.types'

export type ClassifiedSpaceRetrievalCandidate = SpaceRetrievalCandidate & ClassifiedArtifactContext
export type ContextDecision = 'clarify_before_using_shared_context'

export type ClassifiedSpaceRetrievalSearchResult = Omit<SpaceRetrievalSearchResult, 'results'> & {
  results: ClassifiedSpaceRetrievalCandidate[]
  context_decision?: ContextDecision
}

export interface SpaceRetrievalRelevanceContext {
  userId: string
  orgId?: string | null
  agentKey?: string | null
  activeSpaceId?: string | null
  activeCampaignId?: string | null
  activeMissionId?: string | null
  explicitSourceIds?: string[]
}

export function classifySpaceRetrievalResult(
  result: SpaceRetrievalSearchResult,
  context: SpaceRetrievalRelevanceContext,
): ClassifiedSpaceRetrievalSearchResult {
  const results = result.results.map((candidate) => {
    const relevance =
      candidate.space_id && candidate.space_id === context.activeSpaceId
        ? ({
            object_type: candidate.source_type,
            object_id: candidate.source_id,
            relationship: 'active_session',
            confidence: 'strong',
            reason: 'Belongs to the active Space.',
            agent_context_eligible: true,
            use_policy: 'answer_directly',
          } satisfies ClassifiedArtifactContext)
        : classifyArtifactContext({
            objectType: candidate.source_type,
            row: {
              id: candidate.source_id,
              user_id: candidate.user_id,
              org_id: candidate.org_id,
              space_id: candidate.space_id,
              campaign_id: candidate.campaign_id,
              mission_id: candidate.metadata.mission_id,
            },
            context: {
              userId: context.userId,
              orgId: context.orgId,
              agentKey: context.agentKey,
              activeSpaceId: context.activeSpaceId,
              activeCampaignId: context.activeCampaignId,
              activeMissionId: context.activeMissionId,
            },
            explicitIds: context.explicitSourceIds,
          })
    return {
      ...candidate,
      ...relevance,
    }
  })

  const hasUsableContext = results.some(
    (candidate) => candidate.confidence === 'strong' || candidate.confidence === 'medium',
  )

  return {
    ...result,
    results,
    ...(hasUsableContext || results.length === 0
      ? {}
      : { context_decision: 'clarify_before_using_shared_context' as const }),
  }
}

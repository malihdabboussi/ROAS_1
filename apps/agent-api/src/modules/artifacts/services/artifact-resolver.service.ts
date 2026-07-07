import { Injectable } from '@nestjs/common'
import { getActionContract, isAction, type Action } from '@vibey/agent-policy'
import type { ChatScope } from '@vibey/api-shared'
import type {
  ActiveArtifact,
  ActiveWorkingSet as RequestActiveWorkingSet,
} from '../../shared/services/request-context.service'
import { getResolvableFieldsForAction } from './artifact-action-schemas'

export type ActiveWorkingSet = RequestActiveWorkingSet

type ArtifactResolverResult =
  | { ok: true; data: Record<string, unknown> }
  | {
      ok: false
      reason: 'ambiguous' | 'no_target' | 'not_resolvable'
      candidates?: ActiveArtifact[]
    }

const SOURCE_PRIORITY: ActiveArtifact['source'][] = [
  'user_attached',
  'ui_selected',
  'created_in_conversation',
  'recent_history',
]

function isNonEmpty(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  )
}

function cloneCandidate(candidate: ActiveArtifact): ActiveArtifact {
  return {
    type: candidate.type,
    id: candidate.id,
    ...(candidate.label !== undefined ? { label: candidate.label } : {}),
    ...(candidate.campaign_id !== undefined ? { campaign_id: candidate.campaign_id } : {}),
    parent: candidate.parent ? { type: candidate.parent.type, id: candidate.parent.id } : null,
    source: candidate.source,
    updated_at: candidate.updated_at,
  }
}

function filterByCampaign(
  candidates: ActiveArtifact[],
  campaignId: string | null | undefined,
): ActiveArtifact[] {
  if (!campaignId) return candidates
  const sameCampaign = candidates.filter((candidate) => candidate.campaign_id === campaignId)
  if (sameCampaign.length > 0) return sameCampaign
  const allUnscoped = candidates.every((candidate) => !candidate.campaign_id)
  return allUnscoped ? candidates : []
}

@Injectable()
export class ArtifactResolverService {
  resolve(
    action: string,
    data: Record<string, unknown>,
    workingSet: ActiveWorkingSet,
    scope: ChatScope | null,
  ): ArtifactResolverResult {
    if (!isAction(action)) return { ok: false, reason: 'not_resolvable' }
    const contract = getActionContract(action as Action)
    if (
      contract.operation === 'delete' ||
      contract.operation === 'publish' ||
      contract.forbiddenUnlessExplicit
    ) {
      return { ok: false, reason: 'not_resolvable' }
    }

    const resolvableFields = getResolvableFieldsForAction(action)
    if (resolvableFields.length === 0) return { ok: false, reason: 'not_resolvable' }

    let nextData = data
    for (const resolvable of resolvableFields) {
      if (isNonEmpty(nextData[resolvable.field])) continue

      const candidates = filterByCampaign(
        workingSet.byType[resolvable.fromArtifactType] ?? [],
        scope?.campaign_id,
      )
        .map(cloneCandidate)
        .sort((a, b) => b.updated_at - a.updated_at)

      if (candidates.length === 0) return { ok: false, reason: 'no_target' }

      for (const source of SOURCE_PRIORITY) {
        const sourceCandidates = candidates.filter((candidate) => candidate.source === source)
        if (sourceCandidates.length === 0) continue
        if (sourceCandidates.length > 1) {
          return {
            ok: false,
            reason: 'ambiguous',
            candidates: sourceCandidates,
          }
        }
        nextData = {
          ...nextData,
          [resolvable.field]: sourceCandidates[0]!.id,
        }
        break
      }

      if (!isNonEmpty(nextData[resolvable.field])) {
        if (candidates.length === 1) {
          nextData = {
            ...nextData,
            [resolvable.field]: candidates[0]!.id,
          }
        } else {
          return {
            ok: false,
            reason: 'ambiguous',
            candidates,
          }
        }
      }
    }

    return { ok: true, data: nextData }
  }
}

import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'

type RuntimeScopeInput = {
  scopeOptions: readonly BrainScopeNavOption[]
  selectedScopeId: string
  selectedScope?: BrainScopeNavOption
  scopeOptionsResolved: boolean
  scopesLoading: boolean
}

export type BrainScopeRuntimeState = {
  optionResolved: boolean
  ready: boolean
  requiresBrainId: boolean
  requiresCampaignId: boolean
  graphBrainId: string | undefined
  queueBrainId: string | undefined
  queueCampaignId: string | undefined
  queueTargetBrain: 'user' | undefined
  queueEnabled: boolean
  realtimeEnabled: boolean
  healthRealtimeEnabled: boolean
}

const BRAIN_ID_REQUIRED_SCOPE_TYPES = new Set<BrainScopeNavOption['scopeType']>([
  'person',
  'shared',
  'agent',
  'customer',
  'company',
])

const CAMPAIGN_ID_REQUIRED_SCOPE_TYPES = new Set<BrainScopeNavOption['scopeType']>([
  'campaign',
  'campaign_knowledge',
])

export function brainScopeRequiresResolvedBrainId(
  scope?: Pick<BrainScopeNavOption, 'scopeType'> | null,
): boolean {
  return scope ? BRAIN_ID_REQUIRED_SCOPE_TYPES.has(scope.scopeType) : false
}

export function brainScopeRequiresResolvedCampaignId(
  scope?: Pick<BrainScopeNavOption, 'scopeType'> | null,
): boolean {
  return scope ? CAMPAIGN_ID_REQUIRED_SCOPE_TYPES.has(scope.scopeType) : false
}

export function resolveBrainScopeRuntimeState(input: RuntimeScopeInput): BrainScopeRuntimeState {
  const optionResolved =
    input.scopeOptionsResolved &&
    !input.scopesLoading &&
    input.scopeOptions.some((option) => option.id === input.selectedScopeId)
  const requiresBrainId = brainScopeRequiresResolvedBrainId(input.selectedScope)
  const requiresCampaignId = brainScopeRequiresResolvedCampaignId(input.selectedScope)
  const hasBrainId = Boolean(input.selectedScope?.brainId)
  const hasCampaignId = Boolean(input.selectedScope?.campaignId)
  const ready =
    optionResolved && (!requiresBrainId || hasBrainId) && (!requiresCampaignId || hasCampaignId)

  if (!ready) {
    return {
      optionResolved,
      ready: false,
      requiresBrainId,
      requiresCampaignId,
      graphBrainId: undefined,
      queueBrainId: undefined,
      queueCampaignId: undefined,
      queueTargetBrain: undefined,
      queueEnabled: false,
      realtimeEnabled: false,
      healthRealtimeEnabled: false,
    }
  }

  const isUserScope =
    input.selectedScope?.scopeType === 'user' || input.selectedScope?.scopeType === 'person'
  const isCampaignScope = input.selectedScope?.scopeType === 'campaign'
  const isCampaignKnowledgeScope = input.selectedScope?.scopeType === 'campaign_knowledge'
  const isCampaignLikeScope = isCampaignScope || isCampaignKnowledgeScope

  return {
    optionResolved,
    ready: true,
    requiresBrainId,
    requiresCampaignId,
    graphBrainId: isCampaignLikeScope ? undefined : (input.selectedScope?.brainId ?? undefined),
    queueBrainId: isCampaignLikeScope ? undefined : (input.selectedScope?.brainId ?? undefined),
    queueCampaignId: isCampaignLikeScope
      ? (input.selectedScope?.campaignId ?? undefined)
      : undefined,
    queueTargetBrain: isUserScope && !input.selectedScope?.brainId ? 'user' : undefined,
    queueEnabled: true,
    realtimeEnabled: !isCampaignScope || hasCampaignId,
    healthRealtimeEnabled: !isCampaignLikeScope,
  }
}

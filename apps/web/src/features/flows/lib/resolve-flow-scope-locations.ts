import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { FLOWS_CONCEPT_SPACE_TITLE, matchesFlowsConceptSpace } from '@/lib/flows/flows-scope-storage'
import type {
  FlowAutomationSummary,
  FlowInstallationSummary,
} from '../types/flow-automation.types'

export type FlowScopeLocation = {
  spaceId: string | null
  spaceTitle: string
  campaignId: string | null
  campaignName: string
  isConceptSandbox: boolean
}

type FlowScopeSpaceRef = {
  id: string
  title?: string | null
  schema?: unknown
  campaign_id?: string | null
}

function flowInstallations(flow: FlowAutomationSummary): readonly FlowInstallationSummary[] {
  if (flow.installations?.length) return flow.installations
  return [
    {
      id: flow.automation_id ?? flow.id,
      automation_id: flow.automation_id ?? flow.id,
      name: flow.name,
      enabled: flow.enabled,
      trigger: flow.trigger,
      actions: flow.actions,
      space_id: flow.space_id,
      space_title: flow.space_title,
      campaign_id: flow.campaign_id,
      campaign_name: flow.campaign_name,
    },
  ]
}

export function resolveFlowScopeLocations(
  flow: FlowAutomationSummary,
  spaces: readonly FlowScopeSpaceRef[],
): FlowScopeLocation[] {
  const installations = flowInstallations(flow)
  const seenSpaceIds = new Set<string>()
  const locations: FlowScopeLocation[] = []

  for (const installation of installations) {
    const spaceId = installation.space_id ?? null
    if (spaceId && seenSpaceIds.has(spaceId)) continue
    if (spaceId) seenSpaceIds.add(spaceId)

    const space = spaceId ? spaces.find((row) => row.id === spaceId) : null
    const isConceptSandbox = space ? matchesFlowsConceptSpace(space) : false

    locations.push({
      spaceId,
      spaceTitle: isConceptSandbox
        ? FLOWS_UI.createAnythingLabel
        : (installation.space_title ?? space?.title ?? FLOWS_UI.unknownSpace),
      campaignId: isConceptSandbox ? null : (installation.campaign_id ?? space?.campaign_id ?? null),
      campaignName: isConceptSandbox
        ? FLOWS_UI.createAnythingLabel
        : (installation.campaign_name?.trim() || FLOWS_UI.noCampaign),
      isConceptSandbox,
    })
  }

  return locations
}

export function summarizeFlowScopeLocations(locations: FlowScopeLocation[]): {
  campaignLabel: string
  spaceLabel: string
  hasMultiple: boolean
} {
  if (locations.length === 0) {
    return {
      campaignLabel: FLOWS_UI.noCampaign,
      spaceLabel: FLOWS_UI.flowNotAssigned,
      hasMultiple: false,
    }
  }

  if (locations.length === 1) {
    const location = locations[0]!
    if (location.isConceptSandbox) {
      return {
        campaignLabel: FLOWS_UI.createAnythingLabel,
        spaceLabel: FLOWS_CONCEPT_SPACE_TITLE,
        hasMultiple: false,
      }
    }
    return {
      campaignLabel: location.campaignName,
      spaceLabel: location.spaceTitle,
      hasMultiple: false,
    }
  }

  const campaignIds = new Set(locations.map((row) => row.campaignId ?? row.campaignName))
  return {
    campaignLabel:
      campaignIds.size === 1
        ? (locations[0]?.campaignName ?? FLOWS_UI.noCampaign)
        : FLOWS_UI.flowScopeMultipleCampaigns,
    spaceLabel: FLOWS_UI.flowScopeMultipleSpaces.replace('{count}', String(locations.length)),
    hasMultiple: true,
  }
}

import { canEnableAutomation } from '@/lib/flows/automation-publishable'
import type { PublishableAutomationLike } from '@/lib/flows/automation-publishable'
import type {
  FlowsDraftFilter,
  FlowsEnabledFilter,
  FlowsSort,
  FlowsSurfaceFilter,
} from '../types/flows-page.types'
import { describeFlowTrigger } from './describe-flow-trigger'

type FlowAutomationRecord = PublishableAutomationLike & {
  description?: string | null
  enabled: boolean
  created_at?: string
  updated_at?: string
  installations?: ReadonlyArray<{
    space_title?: string | null
    campaign_name?: string | null
  }>
}

function flowCreatedAtTime(flow: FlowAutomationRecord): number {
  return flow.created_at ? new Date(flow.created_at).getTime() : 0
}

function flowRecentTime(flow: FlowAutomationRecord): number {
  return flow.updated_at ? new Date(flow.updated_at).getTime() : flowCreatedAtTime(flow)
}

export function sortFlows<T extends FlowAutomationRecord>(
  flows: readonly T[],
  sort: FlowsSort,
): T[] {
  const next = [...flows]
  switch (sort) {
    case 'oldest':
      return next.sort((a, b) => flowCreatedAtTime(a) - flowCreatedAtTime(b))
    case 'name_asc':
      return next.sort((a, b) => a.name.localeCompare(b.name))
    case 'name_desc':
      return next.sort((a, b) => b.name.localeCompare(a.name))
    case 'recent':
    default:
      return next.sort((a, b) => flowRecentTime(b) - flowRecentTime(a))
  }
}

export function filterFlows<T extends FlowAutomationRecord>(
  flows: readonly T[],
  input: {
    search: string
    draftFilter: FlowsDraftFilter
    enabledFilter: FlowsEnabledFilter
    triggerFilter: string
    surfaceFilter: FlowsSurfaceFilter
    incompleteOnly: boolean
  },
): T[] {
  const q = input.search.trim().toLowerCase()
  return flows.filter((flow) => {
    if (input.draftFilter === 'draft' && !flow.is_draft) return false
    if (input.draftFilter === 'published' && flow.is_draft) return false
    if (input.enabledFilter === 'on' && !flow.enabled) return false
    if (input.enabledFilter === 'off' && flow.enabled) return false
    if (input.triggerFilter !== 'all' && flow.trigger.type !== input.triggerFilter) return false
    if (
      input.surfaceFilter === 'team' &&
      !flow.actions.some((action) => action.type === 'observe_slack_team')
    ) {
      return false
    }
    if (input.incompleteOnly && canEnableAutomation(flow).ok) return false
    if (q.length > 0) {
      const installationHay = (flow.installations ?? [])
        .map(
          (installation) => `${installation.space_title ?? ''} ${installation.campaign_name ?? ''}`,
        )
        .join(' ')
      const hay =
        `${flow.name} ${flow.description ?? ''} ${describeFlowTrigger(flow.trigger)} ${installationHay}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export function buildTriggerFilterOptions(flows: readonly FlowAutomationRecord[]) {
  const types = new Set(flows.map((flow) => flow.trigger.type))
  return [...types]
    .sort((a, b) => a.localeCompare(b))
    .map((type) => ({
      value: type,
      label: type.replace(/_/g, ' '),
    }))
}

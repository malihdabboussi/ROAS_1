import type { FlowAutomationSummary } from '../types/flow-automation.types'
import type { FlowBuildSessionLink } from '../types/flow-build-session-link.types'
import type { FlowsGroupBy, FlowsGroupSort, FlowsListGroup } from '../types/flows-page.types'
import { describeFlowTrigger, flowStatusLabel } from './describe-flow-trigger'

export function usesSeparateDraftsSection(groupBy: FlowsGroupBy): boolean {
  return groupBy === 'none' || groupBy === 'status'
}

function resolveFlowGroupMeta(flow: FlowAutomationSummary, groupBy: FlowsGroupBy) {
  if (groupBy === 'status') {
    const key = flow.is_draft ? 'draft' : flow.enabled ? 'published' : 'paused'
    return {
      key,
      label: flowStatusLabel(flow),
      color: key === 'published' ? 'green' : key === 'draft' ? 'muted' : 'orange',
    }
  }

  if (groupBy === 'trigger') {
    return {
      key: flow.trigger.type,
      label: describeFlowTrigger(flow.trigger),
      color: 'blue',
    }
  }

  if (groupBy === 'space') {
    if ((flow.installation_count ?? 0) > 1 && !flow.space_id) {
      return {
        key: 'multiple-spaces',
        label: 'Multiple spaces',
        color: 'blue',
      }
    }

    return {
      key: flow.space_id ?? 'unknown',
      label: flow.space_title ?? 'Unknown space',
      color: 'blue',
    }
  }

  if (groupBy === 'campaign') {
    if ((flow.installation_count ?? 0) > 1 && !flow.campaign_id) {
      return {
        key: 'multiple-campaigns',
        label: 'Multiple campaigns',
        color: 'purple',
      }
    }

    return {
      key: flow.campaign_id ?? 'none',
      label: flow.campaign_name ?? 'No campaign',
      color: 'purple',
    }
  }

  return {
    key: flow.enabled ? 'on' : 'off',
    label: flow.enabled ? 'On' : 'Off',
    color: flow.enabled ? 'green' : 'muted',
  }
}

function resolveOrphanSessionGroupMeta(
  session: FlowBuildSessionLink,
  groupBy: FlowsGroupBy,
  spaceTitleById: Map<string, string>,
) {
  if (groupBy === 'space') {
    const key = session.space_id ?? 'unknown'
    return {
      key,
      label: spaceTitleById.get(key) ?? 'Unknown space',
      color: 'blue',
    }
  }

  if (groupBy === 'campaign') {
    return {
      key: 'none',
      label: 'No campaign',
      color: 'purple',
    }
  }

  if (groupBy === 'trigger') {
    return {
      key: 'loop_build',
      label: 'Loop build',
      color: 'blue',
    }
  }

  return {
    key: 'off',
    label: 'Off',
    color: 'muted',
  }
}

function sortGroups(groups: FlowsListGroup[], groupSort: FlowsGroupSort) {
  const dir = groupSort === 'asc' ? 1 : -1
  return groups.sort((a, b) => a.label.localeCompare(b.label) * dir)
}

function withGroupCounts(groups: FlowsListGroup[]): FlowsListGroup[] {
  return groups.map((group) => ({
    ...group,
    itemCount: group.items.length + (group.orphanSessions?.length ?? 0),
  }))
}

export function groupFlows(
  flows: FlowAutomationSummary[],
  groupBy: FlowsGroupBy,
  groupSort: FlowsGroupSort,
): FlowsListGroup[] | null {
  if (groupBy === 'none') return null

  const buckets = new Map<string, FlowsListGroup>()

  for (const flow of flows) {
    const { key, label, color } = resolveFlowGroupMeta(flow, groupBy)

    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { key, label, color, items: [] }
      buckets.set(key, bucket)
    }
    bucket.items.push(flow)
  }

  return sortGroups(Array.from(buckets.values()), groupSort)
}

export function groupManageFlows(
  filteredFlows: FlowAutomationSummary[],
  orphanBuildSessions: FlowBuildSessionLink[],
  groupBy: FlowsGroupBy,
  groupSort: FlowsGroupSort,
  spaceTitleById: Map<string, string>,
): FlowsListGroup[] | null {
  if (groupBy === 'none') return null

  const includeDraftsInGroups = !usesSeparateDraftsSection(groupBy)
  const flowsToGroup = includeDraftsInGroups
    ? filteredFlows
    : filteredFlows.filter((flow) => !flow.is_draft)

  const groups = groupFlows(flowsToGroup, groupBy, groupSort)
  if (!groups) return null

  if (!includeDraftsInGroups || orphanBuildSessions.length === 0) {
    return withGroupCounts(groups)
  }

  const bucketMap = new Map(
    groups.map((group) => [group.key, { ...group, orphanSessions: group.orphanSessions ?? [] }]),
  )

  for (const session of orphanBuildSessions) {
    const meta = resolveOrphanSessionGroupMeta(session, groupBy, spaceTitleById)
    let bucket = bucketMap.get(meta.key)
    if (!bucket) {
      bucket = { ...meta, items: [], orphanSessions: [] }
      bucketMap.set(meta.key, bucket)
    }
    bucket.orphanSessions!.push(session)
  }

  return withGroupCounts(sortGroups(Array.from(bucketMap.values()), groupSort))
}

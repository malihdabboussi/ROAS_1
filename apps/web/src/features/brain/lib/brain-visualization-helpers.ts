import { resolveReportingDates, type ReportingDateRangeInput } from '@/lib/reporting'
import type { BrainConnection, BrainHealthData, BrainMemory } from '../types'

export type BrainScopeAwarenessOption = {
  id: string
  label: string
  scopeType: string
  brainId?: string | null
  agentId?: string | null
  campaignId?: string | null
}

export function filterNodesByDateRange(
  nodes: BrainMemory[],
  config: ReportingDateRangeInput,
): BrainMemory[] {
  const { startDate, endDate } = resolveReportingDates(config)
  if (!startDate && !endDate) return nodes
  const startTs = startDate ? new Date(startDate + 'T00:00:00').getTime() : null
  const endTs = endDate ? new Date(endDate + 'T23:59:59.999').getTime() : null
  return nodes.filter((n) => {
    const t = new Date(n.created_at).getTime()
    if (startTs != null && t < startTs) return false
    if (endTs != null && t > endTs) return false
    return true
  })
}

export function filterBrainGraphNodes(
  nodes: BrainMemory[],
  dateRange: ReportingDateRangeInput,
  experiencesOnly: boolean,
): BrainMemory[] {
  let list = filterNodesByDateRange(nodes, dateRange)
  if (experiencesOnly) {
    list = list.filter((n) => n.node_type === 'experience' || n.node_type === 'sk_source')
  }
  return list
}

export function filterConnections(
  connections: BrainConnection[],
  nodeIds: Set<string>,
): BrainConnection[] {
  return connections.filter(
    (c) => nodeIds.has(c.source_memory_id) && nodeIds.has(c.target_memory_id),
  )
}

export function mergeCountMaps(
  ...maps: Array<Record<string, number> | undefined>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const map of maps) {
    for (const [key, value] of Object.entries(map ?? {})) {
      out[key] = (out[key] ?? 0) + value
    }
  }
  return out
}

export function buildBrainScopeAtlasAwarenessContext(input: {
  selectedScope: BrainScopeAwarenessOption | undefined
  topRightScopeReady: boolean
  activeLoading: boolean
  healthData: BrainHealthData | null
  statsHealthForBar: BrainHealthData | null
  brainDateRangeLabel: string | null
  brainDateFilterActive: boolean
  experiencesOnly: boolean
  searchQuery: string
  searchInput: string
  searchResultsCount: number
  searchLoading: boolean
  selectedNode: BrainMemory | null
  connectedNodeCount: number
  queueJobs: Array<{ status?: string | null; type?: string | null }>
  voiceSessionOpen: boolean
  memoryPanelOpen: boolean
  cortexMaxOpen: boolean
  crystallizeOpen: boolean
}): string {
  const scope = input.selectedScope
  const stats = input.statsHealthForBar ?? input.healthData
  const queueStatusCounts = input.queueJobs.reduce<Record<string, number>>((acc, job) => {
    const status = job.status ?? 'unknown'
    acc[status] = (acc[status] ?? 0) + 1
    return acc
  }, {})
  const lines = [
    '[Brain Context]',
    'Page: Brain scoped view',
    `Scope ready: ${input.topRightScopeReady ? 'yes' : 'no'}`,
    `Active brain: ${scope?.label ?? 'unknown'}`,
    `Scope id: ${scope?.id ?? 'unknown'}`,
    `Scope type: ${scope?.scopeType ?? 'unknown'}`,
    `Brain id: ${scope?.brainId ?? 'none'}`,
    `Agent id: ${scope?.agentId ?? 'none'}`,
    `Campaign id: ${scope?.campaignId ?? 'none'}`,
    `Loading graph: ${input.activeLoading ? 'yes' : 'no'}`,
    `Stats memories: ${stats?.total_memories ?? 0}`,
    `Stats connections: ${stats?.total_connections ?? 0}`,
    `Embedding queue: ${stats?.embedding_queue ?? 0}`,
    `Last capture: ${stats?.last_capture ?? 'never'}`,
    `Date filter: ${input.brainDateFilterActive ? (input.brainDateRangeLabel ?? 'custom') : 'none'}`,
    `Experiences only: ${input.experiencesOnly ? 'yes' : 'no'}`,
    `Graph search query: ${input.searchQuery.trim() || 'none'}`,
    `Dock search input: ${input.searchInput.trim() || 'none'}`,
    `Dock search loading: ${input.searchLoading ? 'yes' : 'no'}`,
    `Dock search results: ${input.searchResultsCount}`,
    `Selected node: ${input.selectedNode?.name ?? input.selectedNode?.content ?? 'none'}`,
    `Selected node id: ${input.selectedNode?.id ?? 'none'}`,
    `Selected node type: ${input.selectedNode?.node_type ?? 'none'}`,
    `Selected node connected visible nodes: ${input.connectedNodeCount}`,
    `Memory panel open: ${input.memoryPanelOpen ? 'yes' : 'no'}`,
    `Voice session open: ${input.voiceSessionOpen ? 'yes' : 'no'}`,
    `Cortex Max modal open: ${input.cortexMaxOpen ? 'yes' : 'no'}`,
    `Crystallize modal open: ${input.crystallizeOpen ? 'yes' : 'no'}`,
    `Queue jobs: ${input.queueJobs.length}`,
    `Queue statuses: ${
      Object.keys(queueStatusCounts).length
        ? Object.entries(queueStatusCounts)
            .map(([status, count]) => `${status} ${count}`)
            .join(', ')
        : 'none'
    }`,
  ]

  if (input.selectedNode) {
    lines.push('Selected node visible content:')
    lines.push(String(input.selectedNode.content ?? input.selectedNode.name ?? '').slice(0, 1000))
  }

  lines.push(
    'If the user asks about this screen, use this context as the visible Brain state. If they ask to operate on "this brain", use the active brain/scope above.',
  )

  return lines.join('\n').slice(0, 6000)
}

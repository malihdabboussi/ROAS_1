import type { ReportingDateRangeInput } from '@/lib/reporting'
import type { BrainConnection, BrainGraphData, BrainHealthData, BrainMemory } from '../types'
import {
  filterBrainGraphNodes,
  filterConnections,
  mergeCountMaps,
} from './brain-visualization-helpers'

export type BrainVisualizationGraphCounts = {
  memories: number
  experiences: number
  snapshots: number
  skEntries: number
}

export type BrainVisualizationGraphState = {
  statsHealthForBar: BrainHealthData | null
  filteredNodes: BrainMemory[]
  filteredConnections: BrainConnection[]
  brainDateFilterActive: boolean
  selectedNodeConnectedNodes: BrainMemory[]
  counts: BrainVisualizationGraphCounts
  memoryCounts: Record<string, number>
  snapshotCounts: Record<string, number>
  domainCounts: Record<string, number>
  sourceCounts: Record<string, number>
  legendUsesDbTotals: boolean
  legendMemoryCounts: Record<string, number>
  legendConnectionCounts?: Record<string, number>
  legendExperienceCount: number
  legendSkEntryCount: number
}

function deriveStatsHealthForBar(input: {
  activeGraphData: BrainGraphData | null
  healthData: BrainHealthData | null
  isCampaignScope: boolean
  isKnowledgeScope: boolean
}): BrainHealthData | null {
  const { activeGraphData, healthData, isCampaignScope, isKnowledgeScope } = input
  if (!isCampaignScope && !isKnowledgeScope) return healthData
  if (!activeGraphData) return null

  const nodes = activeGraphData.nodes
  let maxTs = 0
  for (const node of nodes) {
    const timestamp = new Date(String(node.updated_at ?? node.created_at)).getTime()
    if (!Number.isNaN(timestamp) && timestamp > maxTs) maxTs = timestamp
  }

  return {
    status: 'ok',
    total_memories: activeGraphData.stats?.total_memories ?? nodes.length,
    total_connections:
      activeGraphData.stats?.total_connections ?? activeGraphData.connections.length,
    embedding_queue: 0,
    last_capture: maxTs > 0 ? new Date(maxTs).toISOString() : null,
    last_recall: null,
  }
}

function isBrainDateFilterActive(dateRange: ReportingDateRangeInput): boolean {
  return (
    Boolean(dateRange.custom_start || dateRange.custom_end) ||
    (dateRange.time_range != null && dateRange.time_range !== 'all')
  )
}

function countVisibleNodeTypes(nodes: BrainMemory[]): BrainVisualizationGraphCounts {
  let memories = 0
  let experiences = 0
  let snapshots = 0
  let skEntries = 0

  for (const node of nodes) {
    if ((node.node_type ?? 'memory') === 'memory') memories += 1
    if (node.node_type === 'experience' || node.node_type === 'sk_source') experiences += 1
    if (node.node_type === 'snapshot') snapshots += 1
    if (node.node_type === 'sk_entry') skEntries += 1
  }

  return { memories, experiences, snapshots, skEntries }
}

function countVisibleMemoryTypes(nodes: BrainMemory[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const node of nodes) {
    if ((node.node_type ?? 'memory') === 'memory') {
      const type = (node.memory_type as string) || 'fact'
      out[type] = (out[type] ?? 0) + 1
    }
    if (node.node_type === 'sk_entry') {
      const type = (node.entry_type as string) || 'concept'
      out[type] = (out[type] ?? 0) + 1
    }
  }
  return out
}

function countVisibleSnapshots(nodes: BrainMemory[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const node of nodes) {
    if (node.node_type === 'snapshot' && node.snapshot_type) {
      const type = node.snapshot_type as string
      out[type] = (out[type] ?? 0) + 1
    }
  }
  return out
}

function countVisibleDomains(nodes: BrainMemory[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const node of nodes) {
    const domain = node.domain as string | undefined
    if (domain) out[domain] = (out[domain] ?? 0) + 1
  }
  return out
}

function countVisibleSources(
  nodes: BrainMemory[],
  isKnowledgeScope: boolean,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const node of nodes) {
    const source = (isKnowledgeScope
      ? (node.knowledge_source_type ?? node.source_type)
      : node.source_type) as string | undefined
    if (source) out[source] = (out[source] ?? 0) + 1
  }
  return out
}

export function deriveBrainVisualizationGraphState(input: {
  activeGraphData: BrainGraphData | null
  brainDateRange: ReportingDateRangeInput
  experiencesOnly: boolean
  healthData: BrainHealthData | null
  isCampaignScope: boolean
  isKnowledgeScope: boolean
  selectedNode: BrainMemory | null
}): BrainVisualizationGraphState {
  const filteredNodes = input.activeGraphData
    ? filterBrainGraphNodes(input.activeGraphData.nodes, input.brainDateRange, input.experiencesOnly)
    : []
  const filteredNodeIds = new Set(filteredNodes.map((node) => node.id))
  const filteredConnections = input.activeGraphData
    ? filterConnections(input.activeGraphData.connections, filteredNodeIds)
    : []
  const nodeById = new Map(filteredNodes.map((node) => [node.id, node] as const))
  const connectedIds = new Set<string>()
  if (input.selectedNode) {
    for (const connection of filteredConnections) {
      if (connection.source_memory_id === input.selectedNode.id) {
        connectedIds.add(connection.target_memory_id)
      }
      if (connection.target_memory_id === input.selectedNode.id) {
        connectedIds.add(connection.source_memory_id)
      }
    }
  }

  const brainDateFilterActive = isBrainDateFilterActive(input.brainDateRange)
  const counts = countVisibleNodeTypes(filteredNodes)
  const memoryCounts = countVisibleMemoryTypes(filteredNodes)
  const snapshotCounts = countVisibleSnapshots(filteredNodes)
  const domainCounts = countVisibleDomains(filteredNodes)
  const sourceCounts =
    input.isKnowledgeScope && input.activeGraphData?.stats?.by_type
      ? input.activeGraphData.stats.by_type
      : countVisibleSources(filteredNodes, input.isKnowledgeScope)
  const legendUsesDbTotals =
    !input.isCampaignScope &&
    !input.isKnowledgeScope &&
    !brainDateFilterActive &&
    !input.experiencesOnly &&
    !!input.healthData

  return {
    statsHealthForBar: deriveStatsHealthForBar(input),
    filteredNodes,
    filteredConnections,
    brainDateFilterActive,
    selectedNodeConnectedNodes: [...connectedIds]
      .map((id) => nodeById.get(id))
      .filter((node): node is BrainMemory => !!node),
    counts,
    memoryCounts,
    snapshotCounts,
    domainCounts,
    sourceCounts,
    legendUsesDbTotals,
    legendMemoryCounts: legendUsesDbTotals
      ? mergeCountMaps(input.healthData?.memory_counts_by_type, input.healthData?.sk_entries_by_type)
      : memoryCounts,
    legendConnectionCounts: legendUsesDbTotals
      ? input.healthData?.connections_by_type
      : undefined,
    legendExperienceCount:
      legendUsesDbTotals && input.healthData?.experience_sources != null
        ? input.healthData.experience_sources
        : counts.experiences,
    legendSkEntryCount: legendUsesDbTotals
      ? Object.values(input.healthData?.sk_entries_by_type ?? {}).reduce((sum, n) => sum + n, 0)
      : counts.skEntries,
  }
}

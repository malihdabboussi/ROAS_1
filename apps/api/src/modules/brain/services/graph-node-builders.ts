import { createHash } from 'crypto'
import type { GraphEdge } from '../types/brain.types'
import type { GraphStats } from './graph.service'
import { slimGraphMemory } from './graph-node-window'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS

export function emptyGraphStats(): GraphStats {
  return {
    total_memories: 0,
    total_experiences: 0,
    total_snapshots: 0,
    total_connections: 0,
    by_type: {},
    by_snapshot_type: {},
    hub_nodes: [],
    nodes_truncated: false,
  }
}

export function buildCognitionNodes(
  beliefs: Array<Record<string, unknown>>,
  perspectives: Array<Record<string, unknown>>,
  memoryIds: Set<string>,
) {
  const beliefNodes = beliefs.map((b) => ({
    id: b.id as string,
    content: (b.pattern_name as string) || 'Belief Pattern',
    pattern_name: b.pattern_name as string,
    memory_type: 'belief',
    source_type: 'cognition',
    source_title: b.pattern_name as string,
    speaker: null,
    significance: typeof b.strength === 'number' ? Math.max(0.3, b.strength as number) : 0.6,
    confidence: typeof b.strength === 'number' ? (b.strength as number) : 0.6,
    tags: [],
    project_id: null,
    agent_id: null,
    recalled_count: 0,
    created_at: b.created_at as string,
    updated_at: b.updated_at as string,
    age_category: 'older' as const,
    status: 'active' as const,
    node_type: 'belief' as const,
    belief_status: b.status as string,
    supporting_memories: Array.isArray(b.supporting_memories)
      ? (b.supporting_memories as string[])
      : [],
    description: b.description as string | null,
  }))

  const perspectiveNodes = perspectives.map((p) => ({
    id: p.id as string,
    content: (p.name as string) || 'Perspective',
    pattern_name: p.name as string,
    memory_type: 'perspective',
    source_type: 'cognition',
    source_title: p.name as string,
    speaker: null,
    significance: typeof p.strength === 'number' ? Math.max(0.4, p.strength as number) : 0.7,
    confidence: typeof p.strength === 'number' ? (p.strength as number) : 0.7,
    tags: [],
    project_id: null,
    agent_id: null,
    recalled_count: 0,
    created_at: p.created_at as string,
    updated_at: p.updated_at as string,
    age_category: 'older' as const,
    status: 'active' as const,
    node_type: 'perspective' as const,
    perspective_status: p.status as string,
    blind_spots: p.blind_spots as string | null,
    influence_areas: Array.isArray(p.influence_areas) ? (p.influence_areas as string[]) : [],
    belief_ids: Array.isArray(p.beliefs) ? (p.beliefs as string[]) : [],
    description: p.description as string | null,
  }))

  const beliefIdSet = new Set(beliefNodes.map((b) => b.id))
  const cognitionEdges: GraphEdge[] = []

  for (const b of beliefNodes) {
    for (const memId of b.supporting_memories) {
      if (!memoryIds.has(memId)) continue
      cognitionEdges.push({
        id: `belief-${b.id}-mem-${memId}`,
        source_memory_id: b.id,
        target_memory_id: memId,
        relationship_type: 'derived_from',
        strength: 0.6,
      })
    }
  }

  for (const p of perspectiveNodes) {
    for (const beliefId of p.belief_ids) {
      if (!beliefIdSet.has(beliefId)) continue
      cognitionEdges.push({
        id: `persp-${p.id}-belief-${beliefId}`,
        source_memory_id: p.id,
        target_memory_id: beliefId,
        relationship_type: 'synthesizes',
        strength: 0.7,
      })
    }
  }

  return { beliefNodes, perspectiveNodes, cognitionEdges }
}

export function enrichMemoryNodes(
  memories: Record<string, unknown>[],
): Array<Record<string, unknown>> {
  const now = Date.now()

  return memories.map((raw) => {
    const m = slimGraphMemory(raw)
    const createdAt = new Date(m.created_at as string).getTime()
    const age = now - createdAt
    const significance = m.significance as number
    const age_category = age < ONE_DAY_MS ? 'new' : age < SEVEN_DAYS_MS ? 'recent' : 'older'
    const status = age < ONE_DAY_MS ? 'new' : significance < 0.3 ? 'expiring' : 'active'

    return { ...m, age_category, status, node_type: 'memory' }
  })
}

export function buildExperienceNodes(memoryNodes: Record<string, unknown>[]) {
  const groups: Record<string, Record<string, unknown>[]> = {}
  for (const m of memoryNodes) {
    if (!m.source_title && !m.source_id) continue
    const groupKey =
      (m.source_id as string) ??
      `${(m.source_type as string) ?? 'unknown'}::${m.source_title as string}`
    if (!groups[groupKey]) groups[groupKey] = []
    groups[groupKey].push(m)
  }

  const docNodes: Record<string, unknown>[] = []
  const docConnections: GraphEdge[] = []

  for (const [key, members] of Object.entries(groups)) {
    if (members.length < 2) continue

    const id = `exp-${createHash('md5').update(key).digest('hex').slice(0, 12)}`
    const sourceType = (members[0].source_type as string) ?? 'unknown'
    const title = (members[0].source_title as string) ?? ''
    const sourceId = (members[0].source_id as string) ?? null
    const label = resolveExperienceLabel(sourceType, title, sourceId)
    const agentId = (members[0].agent_id as string) ?? null

    docNodes.push({
      id,
      content: label,
      memory_type: 'experience',
      source_type: sourceType,
      source_title: title,
      speaker: null,
      significance: 1,
      confidence: 1,
      tags: [],
      project_id: null,
      agent_id: agentId,
      recalled_count: 0,
      created_at: members[0].created_at,
      age_category: 'older',
      status: 'active',
      node_type: 'experience',
    })

    for (const member of members) {
      docConnections.push({
        id: `${id}-${member.id as string}`,
        source_memory_id: id,
        target_memory_id: member.id as string,
        relationship_type: 'emerged_from',
        strength: 0.8,
      })
    }
  }

  return { docNodes, docConnections }
}

export function mapSnapshotNodes(snapshots: Record<string, unknown>[]) {
  return snapshots.map((s) => ({
    ...s,
    snapshot_type: (s.type as string | undefined) ?? null,
    node_type: 'snapshot',
    age_category: 'older' as const,
    status: 'active' as const,
  }))
}

export function computeGraphStats(
  memories: Record<string, unknown>[],
  snapshots: Record<string, unknown>[],
  docNodes: Record<string, unknown>[],
  allConnections: GraphEdge[],
): GraphStats {
  const hubNodes = buildHubNodes(allConnections)
  const byType: Record<string, number> = {}
  for (const m of memories) {
    const t = m.memory_type as string
    byType[t] = (byType[t] || 0) + 1
  }

  const bySnapshotType: Record<string, number> = {}
  for (const s of snapshots) {
    const t = s.type as string
    bySnapshotType[t] = (bySnapshotType[t] || 0) + 1
  }

  return {
    total_memories: memories.length,
    total_experiences: docNodes.length,
    total_snapshots: snapshots.length,
    total_connections: allConnections.length,
    by_type: byType,
    by_snapshot_type: bySnapshotType,
    hub_nodes: hubNodes,
  }
}

export function buildCompanyGraphPayload(
  objectList: Array<Record<string, unknown>>,
  signalList: Array<Record<string, unknown>>,
  edgeList: Array<Record<string, unknown>>,
  nodeLimit: number,
): {
  nodes: Record<string, unknown>[]
  connections: GraphEdge[]
  stats: GraphStats
} {
  const objectIds = new Set(objectList.map((o) => o.id as string))
  const objectNodes = objectList.map((o) => ({
    id: o.id as string,
    content: (o.title as string) || (o.truth as string)?.slice(0, 80) || 'Company object',
    memory_type: o.object_type as string,
    object_type: o.object_type as string,
    source_type: 'company_cortex',
    source_title: o.title as string,
    speaker: null,
    significance: typeof o.confidence === 'number' ? Math.max(0.3, o.confidence as number) : 0.5,
    confidence: typeof o.confidence === 'number' ? (o.confidence as number) : 0.5,
    tags: [],
    project_id: null,
    agent_id: null,
    recalled_count: 0,
    created_at: o.created_at as string,
    updated_at: o.updated_at as string,
    age_category: 'older' as const,
    status: (o.status as string) ?? 'active',
    node_type: 'company_object' as const,
    description: o.truth as string,
    retrieval_rule: o.retrieval_rule,
    source_signal_ids: Array.isArray(o.source_signal_ids) ? o.source_signal_ids : [],
  }))

  const signalNodes = signalList.map((s) => ({
    id: s.id as string,
    content: (s.truth as string)?.slice(0, 120) || 'Signal',
    memory_type: s.signal_type as string,
    signal_type: s.signal_type as string,
    source_type: 'company_signal',
    source_title: null,
    speaker: null,
    significance: typeof s.confidence === 'number' ? Math.max(0.2, s.confidence as number) : 0.4,
    confidence: typeof s.confidence === 'number' ? (s.confidence as number) : 0.4,
    tags: [],
    project_id: null,
    agent_id: null,
    recalled_count: 0,
    created_at: s.created_at as string,
    updated_at: s.updated_at as string,
    age_category: 'older' as const,
    status: (s.status as string) ?? 'proposed',
    node_type: 'company_signal' as const,
  }))

  const connections: GraphEdge[] = []
  for (const o of objectNodes) {
    for (const signalId of o.source_signal_ids ?? []) {
      if (typeof signalId !== 'string') continue
      connections.push({
        id: `sig-${signalId}-obj-${o.id}`,
        source_memory_id: signalId,
        target_memory_id: o.id,
        relationship_type: 'derived_from',
        strength: 0.55,
      })
    }
  }

  for (const e of edgeList) {
    const sourceId = e.source_object_id as string
    const targetId = e.target_object_id as string
    if (!objectIds.has(sourceId) || !objectIds.has(targetId)) continue
    connections.push({
      id: e.id as string,
      source_memory_id: sourceId,
      target_memory_id: targetId,
      relationship_type: e.relation_type as string,
      strength: typeof e.confidence === 'number' ? (e.confidence as number) : 0.6,
    })
  }

  const byType: Record<string, number> = {}
  for (const o of objectList) {
    const t = String(o.object_type ?? 'unknown')
    byType[t] = (byType[t] ?? 0) + 1
  }
  if (signalList.length > 0) {
    byType.signal = signalList.length
  }

  return {
    nodes: [...objectNodes, ...signalNodes],
    connections,
    stats: {
      total_memories: objectNodes.length,
      total_experiences: signalNodes.length,
      total_snapshots: 0,
      total_connections: connections.length,
      by_type: byType,
      by_snapshot_type: {},
      hub_nodes: buildHubNodes(connections),
      nodes_truncated: objectList.length >= nodeLimit,
    },
  }
}

function resolveExperienceLabel(
  sourceType: string,
  title: string,
  sourceId?: string | null,
): string {
  const displayTitle = title || sourceId || ''
  switch (sourceType) {
    case 'conversation':
      return displayTitle || 'Chat with agent'
    case 'fathom':
      return displayTitle ? `Fathom: ${displayTitle}` : 'Fathom call'
    case 'fireflies':
      return displayTitle ? `Fireflies: ${displayTitle}` : 'Fireflies meeting'
    case 'google_drive':
      return displayTitle ? `Google Drive: ${displayTitle}` : 'Google Drive file'
    case 'dropbox':
      return displayTitle ? `Dropbox: ${displayTitle}` : 'Dropbox file'
    case 'document':
      return displayTitle ? `Document: ${displayTitle}` : 'Document'
    case 'website':
      return displayTitle ? `Website: ${displayTitle}` : 'Website'
    case 'transcript':
      return displayTitle ? `Transcript: ${displayTitle}` : 'Transcript'
    default:
      return displayTitle || sourceType
  }
}

function buildHubNodes(allConnections: GraphEdge[]): Array<{ id: string; connection_count: number }> {
  const connCount: Record<string, number> = {}
  for (const c of allConnections) {
    connCount[c.source_memory_id] = (connCount[c.source_memory_id] || 0) + 1
    connCount[c.target_memory_id] = (connCount[c.target_memory_id] || 0) + 1
  }
  return Object.entries(connCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ id, connection_count: count }))
}

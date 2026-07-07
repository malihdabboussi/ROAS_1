import type { BrainConnection, BrainMemory } from '../types'
import { COMPANY_RELATION_COLORS, RELATIONSHIP_COLORS } from '../types'
import { getNodeColor, getNodeRadius, resolveNodeCoord, resolveRgb, truncateLabel } from './force-graph-helpers'
import type { SimEdge, SimNode } from './force-graph.types'

export function buildForceGraphSimulation({
  connections,
  existingNodes,
  now,
  nodes,
  savedPositions,
}: {
  connections: BrainConnection[]
  existingNodes: SimNode[]
  now: number
  nodes: BrainMemory[]
  savedPositions: Record<string, { x: number; y: number }> | null
}): {
  edges: SimEdge[]
  nodeMap: Map<string, SimNode>
  nodes: SimNode[]
} {
  const nodeMap = new Map<string, SimNode>()
  const simNodes: SimNode[] = nodes.map((m) => {
    const existing = existingNodes.find((n) => n.id === m.id)
    const savedPos = savedPositions?.[m.id]
    const initAngle = Math.random() * Math.PI * 2
    const initR = Math.sqrt(Math.random()) * 200
    const colorVar = getNodeColor(m)
    const ageDays = (now - new Date(m.created_at).getTime()) / 86400000
    const defaultX = initR * Math.cos(initAngle)
    const defaultY = initR * Math.sin(initAngle)
    const node: SimNode = {
      id: m.id,
      x: resolveNodeCoord(savedPos?.x, existing?.x, defaultX),
      y: resolveNodeCoord(savedPos?.y, existing?.y, defaultY),
      vx: existing?.vx ?? 0,
      vy: existing?.vy ?? 0,
      radius: getNodeRadius(m),
      color: colorVar,
      resolvedRgb: resolveRgb(colorVar),
      label: truncateLabel(m.content || m.name || 'Untitled'),
      nodeType: m.node_type ?? 'memory',
      memoryType: m.memory_type,
      mediaType: m.media_type,
      snapshotType: m.snapshot_type,
      significance: m.significance,
      createdAt: m.created_at,
      ageOpacity:
        ageDays < 1 ? 1.0 : ageDays < 7 ? 0.9 : ageDays < 30 ? 0.7 : ageDays < 90 ? 0.5 : 0.4,
      isNew: ageDays < 1,
      memory: m,
      highlighted: false,
      pinned: existing?.pinned ?? false,
    }
    nodeMap.set(m.id, node)
    return node
  })

  const simEdges: SimEdge[] = connections
    .filter((c) => nodeMap.has(c.source_memory_id) && nodeMap.has(c.target_memory_id))
    .map((c) => {
      const colorVar =
        COMPANY_RELATION_COLORS[c.relationship_type] ??
        RELATIONSHIP_COLORS[c.relationship_type] ??
        '--brain-conn-related-to-rgb'
      return {
        source: c.source_memory_id,
        target: c.target_memory_id,
        color: colorVar,
        resolvedRgb: resolveRgb(colorVar),
        strength: c.strength,
        type: c.relationship_type,
      }
    })

  return { edges: simEdges, nodeMap, nodes: simNodes }
}

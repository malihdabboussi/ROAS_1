import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@xyflow/react'

type LayoutDirection = 'TB' | 'LR'

const DEFAULT_NODE_WIDTH = 200
const DEFAULT_NODE_HEIGHT = 80
const STRATEGY_NODE_WIDTH = 180
const STRATEGY_NODE_HEIGHT = 100

const TYPE_RANK_ORDER: Record<string, number> = {
  offer: 0,
  avatar: 1,
  funnel: 2,
  presentation: 2,
  ad_campaign: 3,
  sequence: 4,
  social_post: 5,
}

function isStrategyId(id: string): boolean {
  return id.startsWith('strategy:')
}

function getNodeTypeFromId(id: string): string | null {
  const idx = id.indexOf(':')
  if (idx <= 0) return null
  return id.slice(0, idx)
}

export function getLayoutedElements<
  TNodeData extends Record<string, unknown>,
  TEdgeData extends Record<string, unknown>,
>(
  nodes: Array<Node<TNodeData>>,
  edges: Array<Edge<TEdgeData>>,
  options: { direction?: LayoutDirection; ranksep?: number; nodesep?: number } = {},
): { nodes: Array<Node<TNodeData>>; edges: Array<Edge<TEdgeData>> } {
  if (nodes.length === 0) return { nodes, edges }

  const { direction = 'LR', ranksep = 180, nodesep = 100 } = options

  const liveNodes = nodes.filter((n) => !isStrategyId(n.id))
  const strategyNodes = nodes.filter((n) => isStrategyId(n.id))

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    ranksep,
    nodesep,
    marginx: 40,
    marginy: 40,
  })

  for (const node of liveNodes) {
    g.setNode(node.id, { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT })
  }

  for (const edge of edges) {
    if (!isStrategyId(edge.source) && !isStrategyId(edge.target)) {
      g.setEdge(edge.source, edge.target)
    }
  }

  const disconnected = liveNodes.filter(
    (n) => !edges.some((e) => e.source === n.id || e.target === n.id),
  )
  if (disconnected.length > 1) {
    const sorted = [...disconnected].sort((a, b) => {
      const ra = TYPE_RANK_ORDER[getNodeTypeFromId(a.id) ?? ''] ?? 99
      const rb = TYPE_RANK_ORDER[getNodeTypeFromId(b.id) ?? ''] ?? 99
      return ra - rb
    })
    for (let i = 0; i < sorted.length - 1; i++) {
      const aNode = sorted[i]
      const bNode = sorted[i + 1]
      if (!aNode || !bNode) continue
      const aType = getNodeTypeFromId(aNode.id)
      const bType = getNodeTypeFromId(bNode.id)
      const aRank = TYPE_RANK_ORDER[aType ?? ''] ?? 99
      const bRank = TYPE_RANK_ORDER[bType ?? ''] ?? 99
      if (aRank !== bRank) {
        g.setEdge(aNode.id, bNode.id)
      }
    }
  }

  dagre.layout(g)

  let maxX = 0
  let maxY = 0

  const layoutedLive = liveNodes.map((node) => {
    const p = g.node(node.id) as { x: number; y: number } | undefined
    if (!p) return node
    const x = p.x - DEFAULT_NODE_WIDTH / 2
    const y = p.y - DEFAULT_NODE_HEIGHT / 2
    if (x + DEFAULT_NODE_WIDTH > maxX) maxX = x + DEFAULT_NODE_WIDTH
    if (y + DEFAULT_NODE_HEIGHT > maxY) maxY = y + DEFAULT_NODE_HEIGHT
    return { ...node, position: { x, y } }
  })

  const strategyStartY = maxY + 120
  const layoutedStrategy = strategyNodes.map((node, idx) => {
    const col = idx % 4
    const row = Math.floor(idx / 4)
    return {
      ...node,
      position: {
        x: 40 + col * (STRATEGY_NODE_WIDTH + 40),
        y: strategyStartY + row * (STRATEGY_NODE_HEIGHT + 40),
      },
    }
  })

  return { nodes: [...layoutedLive, ...layoutedStrategy], edges }
}

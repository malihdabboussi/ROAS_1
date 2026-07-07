import type { Edge, Node, Viewport } from '@xyflow/react'
import type {
  WorkflowEdge,
  WorkflowEdgeStatus,
  WorkflowGraph,
  WorkflowNodeType,
  WorkflowValidationError,
} from '../../../services/workflow.service'

export type WorkflowFlowNodeData = {
  workflow_node_type: WorkflowNodeType
  workflow_node_id: string
  label: string
  converting_pages: number
  meta?: Record<string, unknown>
  expanded_emails?: Array<{ subject: string; order_index: number; delay_hours: number }>
}

export type StrategyNodeType =
  | 'strategy_sticky_note'
  | 'strategy_text_block'
  | 'strategy_group_box'
  | 'strategy_milestone'

export type StrategyNodeData = {
  strategy_node_id: string
  strategy_node_type: StrategyNodeType
  text: string
  color?: string
  artifact_hint?: string
  linked_artifact_id?: string
  linked_artifact_type?: string
}

export type StrategyNodeRecord = {
  id: string
  user_id: string
  campaign_id: string
  node_type: 'sticky_note' | 'text_block' | 'group_box' | 'milestone'
  text: string
  color: string
  artifact_hint?: string | null
  linked_artifact_id?: string | null
  linked_artifact_type?: string | null
  position_x: number
  position_y: number
}

export type WorkflowFlowEdgeData = {
  workflow_edge_id: string
  edge_type: string
  status: WorkflowEdgeStatus
  validation_errors: WorkflowValidationError[]
  derived?: boolean
}

export type SavedWorkflowLayoutV1 = {
  version: 1
  nodes: Array<{ id: string; position: { x: number; y: number } }>
  edges?: Array<{ id: string; sourceHandle?: string; targetHandle?: string }>
  viewport?: { x: number; y: number; zoom: number }
}

export function toFlowNodeId(type: WorkflowNodeType, id: string): string {
  return `${type}:${id}`
}

const VALID_NODE_TYPES = new Set<WorkflowNodeType>([
  'funnel',
  'sequence',
  'presentation',
  'offer',
  'ad_campaign',
  'avatar',
  'social_post',
])

export function fromFlowNodeId(flowNodeId: string): { type: WorkflowNodeType; id: string } | null {
  const idx = flowNodeId.indexOf(':')
  if (idx <= 0) return null
  const t = flowNodeId.slice(0, idx)
  const id = flowNodeId.slice(idx + 1)
  if (!id) return null
  if (!VALID_NODE_TYPES.has(t as WorkflowNodeType)) return null
  return { type: t as WorkflowNodeType, id }
}

export function deriveEdgeType(
  from: WorkflowNodeType,
  to: WorkflowNodeType,
): WorkflowEdge['edge_type'] | null {
  if (from === 'funnel' && to === 'sequence') return 'funnel_conversion_to_sequence'
  if (from === 'sequence' && to === 'sequence') return 'sequence_complete_to_sequence'
  if (from === 'funnel' && to === 'presentation') return 'funnel_to_presentation'
  return null
}

function coerceSavedLayout(layout: Record<string, unknown>): SavedWorkflowLayoutV1 | null {
  const v = (layout as { version?: unknown }).version
  if (v !== 1) return null
  const nodes = (layout as { nodes?: unknown }).nodes
  if (!Array.isArray(nodes)) return null

  const cleanNodes: SavedWorkflowLayoutV1['nodes'] = []
  for (const n of nodes) {
    const nn = n as { id?: unknown; position?: unknown }
    const id = typeof nn.id === 'string' ? nn.id : ''
    const pos = nn.position as { x?: unknown; y?: unknown } | undefined
    const x = typeof pos?.x === 'number' ? pos.x : NaN
    const y = typeof pos?.y === 'number' ? pos.y : NaN
    if (!id || Number.isNaN(x) || Number.isNaN(y)) continue
    cleanNodes.push({ id, position: { x, y } })
  }

  const cleanEdges: SavedWorkflowLayoutV1['edges'] = []
  const rawEdges = (layout as { edges?: unknown }).edges
  if (Array.isArray(rawEdges)) {
    for (const e of rawEdges) {
      const ee = e as { id?: unknown; sourceHandle?: unknown; targetHandle?: unknown }
      if (typeof ee.id !== 'string') continue
      cleanEdges.push({
        id: ee.id,
        sourceHandle: typeof ee.sourceHandle === 'string' ? ee.sourceHandle : undefined,
        targetHandle: typeof ee.targetHandle === 'string' ? ee.targetHandle : undefined,
      })
    }
  }

  const vp = (layout as { viewport?: unknown }).viewport as
    | { x?: unknown; y?: unknown; zoom?: unknown }
    | undefined
  const viewport =
    vp && typeof vp.x === 'number' && typeof vp.y === 'number' && typeof vp.zoom === 'number'
      ? { x: vp.x, y: vp.y, zoom: vp.zoom }
      : undefined

  return {
    version: 1,
    nodes: cleanNodes,
    edges: cleanEdges.length > 0 ? cleanEdges : undefined,
    viewport,
  }
}

const NODE_WIDTH = 200
const NODE_SPACING = 150
const CENTER_Y = 200

function initialPosition(index: number): { x: number; y: number } {
  let currentX = 100
  for (let i = 0; i < index; i++) {
    currentX += NODE_WIDTH + NODE_SPACING
  }
  return { x: currentX, y: CENTER_Y }
}

export function graphToFlow(
  graph: WorkflowGraph,
  opts?: { funnelConvertingPageCounts?: Map<string, number> },
): {
  nodes: Array<Node<WorkflowFlowNodeData>>
  edges: Array<Edge<WorkflowFlowEdgeData>>
  viewport?: Viewport
} {
  const funnelCounts = opts?.funnelConvertingPageCounts ?? new Map<string, number>()

  const flowNodes: Array<Node<WorkflowFlowNodeData>> = graph.nodes.map((n, idx) => {
    const converting_pages = n.type === 'funnel' ? (funnelCounts.get(n.id) ?? 0) : 0
    return {
      id: toFlowNodeId(n.type, n.id),
      type: n.type,
      position: initialPosition(idx),
      data: {
        workflow_node_type: n.type,
        workflow_node_id: n.id,
        label: n.label,
        converting_pages,
        meta: n.meta,
      },
    }
  })

  const flowEdges: Array<Edge<WorkflowFlowEdgeData>> = (graph.edges ?? []).map((e) => {
    const source = toFlowNodeId(e.from_type, e.from_id)
    const target = toFlowNodeId(e.to_type, e.to_id)
    const isDerived = !!(e as { derived?: boolean }).derived
    return {
      id: e.id,
      type: isDerived ? 'derived' : 'default',
      source,
      target,
      data: {
        workflow_edge_id: e.id,
        edge_type: e.edge_type,
        status: e.status,
        validation_errors: Array.isArray(e.validation_errors) ? e.validation_errors : [],
        derived: isDerived,
      },
    }
  })

  const saved = coerceSavedLayout((graph.layout ?? {}) as Record<string, unknown>)
  if (saved) {
    const byId = new Map(saved.nodes.map((n) => [n.id, n.position]))
    const nodesWithLayout = flowNodes.map((node) => {
      const pos = byId.get(node.id)
      return pos ? { ...node, position: pos } : node
    })

    if (saved.edges) {
      const edgeHandleMap = new Map(saved.edges.map((e) => [e.id, e]))
      for (const edge of flowEdges) {
        const h = edgeHandleMap.get(edge.id)
        if (h) {
          if (h.sourceHandle) edge.sourceHandle = h.sourceHandle
          if (h.targetHandle) edge.targetHandle = h.targetHandle
        }
      }
    }

    if (saved.viewport)
      return { nodes: nodesWithLayout, edges: flowEdges, viewport: saved.viewport }
    return { nodes: nodesWithLayout, edges: flowEdges }
  }

  return { nodes: flowNodes, edges: flowEdges }
}

export function buildLayoutToSave(
  nodes: Array<{ id: string; position: { x: number; y: number } }>,
  viewport: Viewport,
  edges?: Array<{ id: string; sourceHandle?: string | null; targetHandle?: string | null }>,
): SavedWorkflowLayoutV1 {
  const layout: SavedWorkflowLayoutV1 = {
    version: 1,
    nodes: nodes.map((n) => ({ id: n.id, position: { x: n.position.x, y: n.position.y } })),
    viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
  }
  if (edges && edges.length > 0) {
    layout.edges = edges
      .filter((e) => e.sourceHandle || e.targetHandle)
      .map((e) => ({
        id: e.id,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
      }))
  }
  return layout
}

export type WorkflowFlowNode = Node<WorkflowFlowNodeData>

export function strategyNodesToFlow(records: StrategyNodeRecord[]): Array<Node<StrategyNodeData>> {
  return records.map((r) => {
    const flowType: StrategyNodeType = `strategy_${r.node_type}` as StrategyNodeType
    return {
      id: `strategy:${r.id}`,
      type: flowType,
      position: { x: r.position_x, y: r.position_y },
      data: {
        strategy_node_id: r.id,
        strategy_node_type: flowType,
        text: r.text,
        color: r.color,
        artifact_hint: r.artifact_hint ?? undefined,
        linked_artifact_id: r.linked_artifact_id ?? undefined,
        linked_artifact_type: r.linked_artifact_type ?? undefined,
      },
    }
  })
}

export function isStrategyNode(nodeId: string): boolean {
  return nodeId.startsWith('strategy:')
}

export function parseStrategyNodeId(flowNodeId: string): string | null {
  if (!flowNodeId.startsWith('strategy:')) return null
  return flowNodeId.slice('strategy:'.length) || null
}

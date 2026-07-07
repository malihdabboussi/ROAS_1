import type { Viewport } from '@xyflow/react'
import type {
  AdCanvasFlowEdge,
  AdCanvasFlowNode,
  AdCanvasFlowNodeData,
  AdCanvasGraphEdge,
  AdCanvasNodeRecord,
  AdCreativeCanvas,
  SaveAdCanvasLayoutInput,
} from '../types/ad-canvas.types'

export function canvasToFlow(canvas: AdCreativeCanvas): {
  nodes: AdCanvasFlowNode[]
  edges: AdCanvasFlowEdge[]
  viewport: Viewport
} {
  const nodes: AdCanvasFlowNode[] = canvas.nodes.map((record) => recordToFlowNode(record))
  const edges: AdCanvasFlowEdge[] = (canvas.graph.edges ?? []).map((edge) => {
    return {
      id: edge.id,
      type: edge.kind,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.source_handle ?? undefined,
      targetHandle: edge.target_handle ?? undefined,
      data: {
        canvas_edge_id: edge.id,
        kind: edge.kind,
      },
    } satisfies AdCanvasFlowEdge
  })

  return {
    nodes,
    edges,
    viewport: canvas.viewport ?? { x: 0, y: 0, zoom: 1 },
  }
}

export function recordToFlowNode(record: AdCanvasNodeRecord): AdCanvasFlowNode {
  return {
    id: record.id,
    type: record.kind,
    position: { x: record.position_x, y: record.position_y },
    data: {
      canvas_node_id: record.id,
      kind: record.kind,
      status: record.status,
      parent_node_id: record.parent_node_id,
      parent_image_node_id: record.parent_image_node_id,
      ad_id: record.ad_id,
      image_asset_id: record.image_asset_id,
      payload: record.payload ?? {},
    } satisfies AdCanvasFlowNodeData,
  }
}

export function buildLayoutToSave(
  canvasId: string,
  nodes: AdCanvasFlowNode[],
  edges: AdCanvasFlowEdge[],
  viewport: Viewport,
  defaultModelId?: string,
): SaveAdCanvasLayoutInput {
  const graphEdges: AdCanvasGraphEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    kind: e.data?.kind ?? (e.type as AdCanvasGraphEdge['kind']),
    source_handle: e.sourceHandle ?? null,
    target_handle: e.targetHandle ?? null,
  }))

  return {
    canvas_id: canvasId,
    viewport,
    default_model_id: defaultModelId,
    graph: {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: graphEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        kind: e.kind,
        source_handle: e.source_handle,
        target_handle: e.target_handle,
      })),
    },
    node_positions: nodes.map((n) => ({
      id: n.id,
      position_x: n.position.x,
      position_y: n.position.y,
    })),
  }
}

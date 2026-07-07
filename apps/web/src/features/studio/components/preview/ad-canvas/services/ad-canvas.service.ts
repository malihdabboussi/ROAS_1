import { DEFAULT_IMAGE_MODEL_ID } from '@vibey/api-shared/image-models'
import {
  backendDelete,
  backendFetch,
  backendGet,
  backendPatch,
  backendPost,
} from '@/lib/api/backend-client'
import type {
  AdCanvasEdgeKind,
  AdCanvasNodeRecord,
  AdCreativeCanvas,
  CreateCanvasNodeInput,
  DelegateAgentStreamCallbacks,
  DelegateToAgentBody,
  SaveAdCanvasLayoutInput,
  UpdateCanvasNodeInput,
} from '../types/ad-canvas.types'

interface LoadCanvasApiResponse {
  canvas: {
    id: string
    ad_set_id: string
    default_model_id?: string
    viewport?: { x: number; y: number; zoom: number }
    graph?: {
      nodes?: Array<{ id: string }>
      edges?: Array<{
        id: string
        source: string
        target: string
        type?: string
        data?: { kind?: string }
      }>
    }
  }
  nodes: AdCanvasNodeRecord[]
  graph: {
    nodes: Array<{
      id: string
      type?: string
      position: { x: number; y: number }
      data?: Record<string, unknown>
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      type?: string
      data?: { kind?: string }
    }>
  }
}

function adaptLoadResponse(raw: LoadCanvasApiResponse): AdCreativeCanvas {
  const edges = (raw.graph?.edges ?? raw.canvas.graph?.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: (edge.data?.kind ?? edge.type ?? 'reference') as AdCanvasEdgeKind,
    source_handle: null,
    target_handle: null,
  }))

  return {
    id: raw.canvas.id,
    ad_set_id: raw.canvas.ad_set_id,
    default_model_id: raw.canvas.default_model_id ?? DEFAULT_IMAGE_MODEL_ID,
    viewport: raw.canvas.viewport ?? { x: 0, y: 0, zoom: 1 },
    nodes: raw.nodes,
    graph: {
      nodes: (raw.graph?.nodes ?? []).map((n) => ({ id: n.id })),
      edges,
    },
  }
}

export async function fetchAdCanvas(adSetId: string): Promise<AdCreativeCanvas> {
  const raw = await backendGet<LoadCanvasApiResponse>(`/api/canvas/ad-sets/${adSetId}`)
  return adaptLoadResponse(raw)
}

export async function saveAdCanvasLayout(
  adSetId: string,
  data: SaveAdCanvasLayoutInput,
): Promise<AdCreativeCanvas> {
  const reactFlowGraph = {
    nodes: data.graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position ?? { x: 0, y: 0 },
      data: n.data ?? {},
    })),
    edges: data.graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.kind,
      data: { kind: e.kind },
    })),
  }

  await backendPatch(`/api/canvas/ad-sets/${adSetId}`, {
    graph: reactFlowGraph,
    viewport: data.viewport,
    default_model_id: data.default_model_id,
  })
  return fetchAdCanvas(adSetId)
}

export async function createCanvasNode(
  canvasId: string,
  input: CreateCanvasNodeInput,
): Promise<AdCanvasNodeRecord> {
  return backendPost<AdCanvasNodeRecord>(`/api/canvas/nodes`, {
    canvas_id: canvasId,
    ...input,
  })
}

export async function updateCanvasNode(
  nodeId: string,
  input: UpdateCanvasNodeInput,
): Promise<AdCanvasNodeRecord> {
  return backendPatch<AdCanvasNodeRecord>(`/api/canvas/nodes/${nodeId}`, input)
}

export async function deleteCanvasNode(nodeId: string): Promise<void> {
  await backendDelete(`/api/canvas/nodes/${nodeId}`)
}

export async function promoteCanvasNode(
  nodeId: string,
): Promise<{ ad: Record<string, unknown>; created: boolean }> {
  return backendPost<{ ad: Record<string, unknown>; created: boolean }>(
    `/api/canvas/nodes/${nodeId}/promote`,
    {},
  )
}

export async function runDirectNodeAction(
  nodeId: string,
  action: 'generate' | 'edit' | 'variation',
  body: Record<string, unknown>,
): Promise<AdCanvasNodeRecord> {
  return backendPost<AdCanvasNodeRecord>(`/api/canvas/nodes/${nodeId}/${action}`, body)
}

export async function delegateToAgentStream(
  body: DelegateToAgentBody,
  callbacks: DelegateAgentStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await backendFetch('/api/canvas/delegate-to-agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok || !res.body) {
    const err = new Error(`Agent delegation failed: ${res.status}`)
    callbacks.onError?.(err)
    throw err
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload) as Record<string, unknown>
          callbacks.onEvent(parsed)
        } catch {
          // skip malformed SSE lines
        }
      }
    }
    callbacks.onDone?.()
  } catch (err) {
    if (signal?.aborted) {
      callbacks.onDone?.()
      return
    }
    const error = err instanceof Error ? err : new Error(String(err))
    callbacks.onError?.(error)
    throw error
  }
}

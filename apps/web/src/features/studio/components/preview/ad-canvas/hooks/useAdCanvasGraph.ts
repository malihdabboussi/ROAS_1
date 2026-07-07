'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useEdgesState,
  useNodesState,
  useReactFlow,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react'
import { buildLayoutToSave, canvasToFlow, recordToFlowNode } from '../lib/ad-canvas-flow-transform'
import {
  createCanvasNode,
  deleteCanvasNode,
  fetchAdCanvas,
  saveAdCanvasLayout,
  updateCanvasNode,
} from '../services/ad-canvas.service'
import type {
  AdCanvasFlowEdge,
  AdCanvasFlowNode,
  CreateCanvasNodeInput,
  UpdateCanvasNodeInput,
} from '../types/ad-canvas.types'

const AUTOSAVE_MS = 1500

export function useAdCanvasGraph(adSetId: string) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canvasId, setCanvasId] = useState<string>('')
  const [defaultModelId, setDefaultModelId] = useState<string>('')

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<AdCanvasFlowNode>([])
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<AdCanvasFlowEdge>([])

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  const { getViewport, setViewport } = useReactFlow()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const canvas = await fetchAdCanvas(adSetId)
      const flow = canvasToFlow(canvas)
      setCanvasId(canvas.id)
      setDefaultModelId(canvas.default_model_id)
      setNodes(flow.nodes)
      setEdges(flow.edges)
      setViewport(flow.viewport, { duration: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ad canvas')
    } finally {
      setLoading(false)
    }
  }, [adSetId, setEdges, setNodes, setViewport])

  useEffect(() => {
    void load()
  }, [load])

  const scheduleSaveLayout = useCallback(() => {
    if (!canvasId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const layout = buildLayoutToSave(
          canvasId,
          nodesRef.current,
          edgesRef.current,
          getViewport(),
          defaultModelId || undefined,
        )
        await saveAdCanvasLayout(adSetId, layout)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save canvas layout')
      }
    }, AUTOSAVE_MS)
  }, [adSetId, canvasId, defaultModelId, getViewport])

  const onNodesChange: OnNodesChange<AdCanvasFlowNode> = useCallback(
    (changes) => {
      onNodesChangeBase(changes)
      scheduleSaveLayout()
    },
    [onNodesChangeBase, scheduleSaveLayout],
  )

  const onEdgesChange: OnEdgesChange<AdCanvasFlowEdge> = useCallback(
    (changes) => {
      onEdgesChangeBase(changes)
      scheduleSaveLayout()
    },
    [onEdgesChangeBase, scheduleSaveLayout],
  )

  const addNode = useCallback(
    async (input: CreateCanvasNodeInput) => {
      if (!canvasId) throw new Error('Canvas not loaded')
      const created = await createCanvasNode(canvasId, input)
      const flowNode = recordToFlowNode(created)
      setNodes((prev) => [...prev, flowNode])
      scheduleSaveLayout()
      return created
    },
    [canvasId, scheduleSaveLayout, setNodes],
  )

  const patchNode = useCallback(
    async (nodeId: string, input: UpdateCanvasNodeInput) => {
      const updated = await updateCanvasNode(nodeId, input)
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                position: {
                  x: input.position_x ?? n.position.x,
                  y: input.position_y ?? n.position.y,
                },
                data: {
                  ...n.data,
                  status: updated.status,
                  payload: updated.payload,
                  ad_id: updated.ad_id,
                  image_asset_id: updated.image_asset_id,
                },
              }
            : n,
        ),
      )
      return updated
    },
    [setNodes],
  )

  const removeNode = useCallback(
    async (nodeId: string) => {
      await deleteCanvasNode(nodeId)
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId))
      scheduleSaveLayout()
    },
    [scheduleSaveLayout, setEdges, setNodes],
  )

  const updateNodeData = useCallback(
    (nodeId: string, patch: Partial<AdCanvasFlowNode['data']>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
      )
    },
    [setNodes],
  )

  const selectNode = useCallback(
    (nodeId: string | null) => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          selected: nodeId ? n.id === nodeId : false,
        })),
      )
    },
    [setNodes],
  )

  const addEdge = useCallback(
    (edge: AdCanvasFlowEdge) => {
      setEdges((prev) => {
        if (prev.some((e) => e.id === edge.id)) return prev
        return [...prev, edge]
      })
      scheduleSaveLayout()
    },
    [scheduleSaveLayout, setEdges],
  )

  const selectedNode = nodes.find((n) => n.selected) ?? null

  return {
    loading,
    error,
    canvasId,
    defaultModelId,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    scheduleSaveLayout,
    load,
    addNode,
    addEdge,
    patchNode,
    removeNode,
    updateNodeData,
    selectNode,
    selectedNode,
  }
}

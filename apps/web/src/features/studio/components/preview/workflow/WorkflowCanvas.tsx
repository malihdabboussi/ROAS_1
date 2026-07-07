'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Node as FlowNode } from '@xyflow/react'
import { AlertCircle, Lightbulb, Mail, Network, Plus, Sparkles, StickyNote, X } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useWorkspaceSettingsModal } from '@/features/settings'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  WORKFLOW_TOAST_ERRORS,
  WORKFLOW_TOAST_SUCCESS,
} from '@/features/studio/config/workflow-toast-errors.config'
import type { VibeyPendingArtifactOpenSimpleType } from '@/features/studio/types/vibey-pending-artifact-open'
import { backendGet } from '@/lib/api/backend-client'
import {
  createAdCampaign,
  createFunnel,
  createOffer,
  createPresentation,
  createSequence,
} from '../../../services/artifact-preview.service'
import {
  createStrategyNode,
  deleteStrategyNode,
  fetchStrategyNodes,
  updateStrategyNode,
} from '../../../services/strategy-node.service'
import {
  createWorkflowEdge,
  deleteWorkflowEdge,
  fetchWorkflowGraph,
  saveWorkflowLayout,
  type WorkflowDeleteMode,
  type WorkflowEdgeType,
} from '../../../services/workflow.service'
import { edgeTypes } from './edges'
import { nodeTypes } from './nodes'
import { getLayoutedElements } from './workflow-auto-layout'
import {
  buildLayoutToSave,
  deriveEdgeType,
  fromFlowNodeId,
  graphToFlow,
  isStrategyNode,
  parseStrategyNodeId,
  strategyNodesToFlow,
  toFlowNodeId,
  type StrategyNodeData,
  type WorkflowFlowEdgeData,
  type WorkflowFlowNodeData,
} from './workflow-flow-transform'

function conversionCountsFromGraph(graph: { conversion_points?: unknown[] }) {
  const counts = new Map<string, number>()
  for (const row of graph.conversion_points ?? []) {
    const r = row as { funnel_id?: unknown; kind?: unknown }
    if (typeof r.funnel_id !== 'string') continue
    if (r.kind !== 'email_capture') continue
    counts.set(r.funnel_id, (counts.get(r.funnel_id) ?? 0) + 1)
  }
  return counts
}

function hasValidationCode(
  errors: Array<{ code?: string } | null | undefined>,
  code: string,
): boolean {
  return errors.some((err) => err?.code === code)
}

function WorkflowCanvasInner({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workflowId, setWorkflowId] = useState<string>('')

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<
    FlowNode<WorkflowFlowNodeData | StrategyNodeData>
  >([])
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge<WorkflowFlowEdgeData>>([])

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  const { fitView, getViewport, setViewport, setCenter, zoomIn, zoomOut } = useReactFlow()
  const [zoomLevel, setZoomLevel] = useState(100)
  const [pendingDeleteEdge, setPendingDeleteEdge] = useState<{
    edgeId: string
    edgeType: WorkflowEdgeType
    mode: WorkflowDeleteMode
    sequenceId?: string
    scheduledCount?: number
  } | null>(null)
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()

  const savedViewportRef = useRef<Viewport | null>(null)
  const initialFitDoneRef = useRef(false)
  const pendingFocusRef = useRef<{
    sequenceId: string
    emails: Array<{ subject: string; order_index: number; delay_hours: number }>
  } | null>(null)

  const applySequenceFocus = useCallback(
    (detail: {
      sequenceId: string
      emails: Array<{ subject: string; order_index: number; delay_hours: number }>
    }) => {
      const nodeId = toFlowNodeId('sequence', detail.sequenceId)
      const target = nodesRef.current.find((n) => n.id === nodeId)
      if (!target) return false

      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          selected: n.id === nodeId,
          data: {
            ...(n.data as WorkflowFlowNodeData),
            expanded_emails: n.id === nodeId ? detail.emails : undefined,
          },
        })),
      )

      setTimeout(() => {
        const pos = target.position
        setCenter(pos.x + 100, pos.y + 60, { zoom: 1, duration: 400 })
      }, 50)

      return true
    },
    [setCenter, setNodes],
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.sequenceId) return
      if (!applySequenceFocus(detail)) {
        pendingFocusRef.current = detail
      }
    }
    window.addEventListener('workflow-canvas:focus-sequence', handler)
    return () => window.removeEventListener('workflow-canvas:focus-sequence', handler)
  }, [applySequenceFocus])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [graph, strategyRecords] = await Promise.all([
        fetchWorkflowGraph(campaignId),
        fetchStrategyNodes(campaignId).catch(() => []),
      ])
      const counts = conversionCountsFromGraph(graph)
      const flow = graphToFlow(graph, { funnelConvertingPageCounts: counts })
      const strategyFlowNodes = strategyNodesToFlow(strategyRecords)

      setWorkflowId(graph.workflow_id)
      setNodes([...flow.nodes, ...strategyFlowNodes] as any)
      setEdges(flow.edges)

      savedViewportRef.current = flow.viewport ?? null
    } catch (e) {
      setError(e instanceof Error ? e.message : STUDIO_INLINE_ERRORS.LOAD_WORKFLOW)
    } finally {
      setLoading(false)
    }
  }, [campaignId, setEdges, setNodes])

  useEffect(() => {
    void load()
  }, [load])

  // Apply saved viewport once, or fit view on first load.
  // If there's a pending sequence focus (from SequencePreview navigation), apply it instead.
  useEffect(() => {
    if (nodes.length === 0 || initialFitDoneRef.current) return
    initialFitDoneRef.current = true

    const pending =
      pendingFocusRef.current ?? (window as any).__vibey_pending_sequence_focus ?? null
    pendingFocusRef.current = null
    delete (window as any).__vibey_pending_sequence_focus

    if (pending) {
      setTimeout(() => applySequenceFocus(pending), 100)
      return
    }

    const vp = savedViewportRef.current
    if (vp) {
      setViewport(vp, { duration: 0 })
      savedViewportRef.current = null
    } else {
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100)
    }
  }, [nodes.length, setViewport, fitView, applySequenceFocus])

  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false
    if (connection.source === connection.target) return false
    const s = fromFlowNodeId(connection.source)
    const t = fromFlowNodeId(connection.target)
    if (!s || !t) return false
    return deriveEdgeType(s.type, t.type) !== null
  }, [])

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!workflowId) return
      if (!connection.source || !connection.target) return

      const s = fromFlowNodeId(connection.source)
      const t = fromFlowNodeId(connection.target)
      if (!s || !t) return

      const edge_type = deriveEdgeType(s.type, t.type)
      if (!edge_type) return

      try {
        const created = await createWorkflowEdge(campaignId, {
          from_type: s.type,
          from_id: s.id,
          to_type: t.type,
          to_id: t.id,
          edge_type,
          config: {},
        })

        const codes = new Set(
          (created.validation_errors ?? [])
            .map((ve) => ve?.code)
            .filter((c): c is string => typeof c === 'string' && c.length > 0),
        )

        if (created.edge_type === 'funnel_conversion_to_sequence') {
          if (
            created.status === 'invalid' &&
            hasValidationCode(created.validation_errors ?? [], 'MISSING_VERIFIED_SENDER_IDENTITY')
          ) {
            toast.error(WORKFLOW_TOAST_ERRORS.MISSING_SENDER_IDENTITY.userMessage)
          }
          if (created.status === 'invalid' && codes.has('NO_CONVERSION_POINTS')) {
            toast.error(WORKFLOW_TOAST_ERRORS.NO_CONVERSION_POINTS.userMessage)
          }
          if (
            created.status === 'invalid' &&
            (codes.has('FUNNEL_NOT_FOUND') || codes.has('SEQUENCE_NOT_FOUND'))
          ) {
            toast.error(WORKFLOW_TOAST_ERRORS.FUNNEL_OR_SEQUENCE_NOT_FOUND.userMessage)
          }
          if (created.status === 'valid') {
            toast.success(WORKFLOW_TOAST_SUCCESS.FUNNEL_TO_SEQUENCE.userMessage)
          }
        }

        if (created.edge_type === 'sequence_complete_to_sequence') {
          if (created.status === 'invalid' && codes.has('SELF_LOOP')) {
            toast.error(WORKFLOW_TOAST_ERRORS.SELF_LOOP.userMessage)
          }
          if (created.status === 'invalid' && codes.has('CYCLE_DETECTED')) {
            toast.error(WORKFLOW_TOAST_ERRORS.CYCLE_DETECTED.userMessage)
          }
          if (created.status === 'invalid' && codes.has('SEQUENCE_NOT_FOUND')) {
            toast.error(WORKFLOW_TOAST_ERRORS.SEQUENCE_NOT_FOUND.userMessage)
          }
          if (created.status === 'valid') {
            toast.success(WORKFLOW_TOAST_SUCCESS.SEQUENCE_TO_SEQUENCE.userMessage)
          }
        }

        if (created.edge_type === 'funnel_to_presentation') {
          if (
            created.status === 'invalid' &&
            (codes.has('FUNNEL_NOT_FOUND') || codes.has('PRESENTATION_NOT_FOUND'))
          ) {
            toast.error(WORKFLOW_TOAST_ERRORS.FUNNEL_OR_PRESENTATION_NOT_FOUND.userMessage)
          }
          if (created.status === 'valid') {
            toast.success(WORKFLOW_TOAST_SUCCESS.FUNNEL_TO_PRESENTATION.userMessage)
          }
        }

        const flowEdge: Edge<WorkflowFlowEdgeData> = {
          id: created.id,
          type: 'default',
          source: toFlowNodeId(created.from_type, created.from_id),
          target: toFlowNodeId(created.to_type, created.to_id),
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          data: {
            workflow_edge_id: created.id,
            edge_type: created.edge_type,
            status: created.status,
            validation_errors: created.validation_errors ?? [],
          },
        }

        setEdges((prev) => {
          if (prev.some((e) => e.id === flowEdge.id)) return prev
          return [...prev, flowEdge]
        })
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : WORKFLOW_TOAST_ERRORS.CREATE_CONNECTION_FAILED.userMessage
        toast.error(msg)
        setError(msg)
      }
    },
    [campaignId, setEdges, workflowId],
  )

  useEffect(() => {
    const handler = async (event: Event) => {
      const ce = event as CustomEvent<{ edgeId?: string; edgeType?: WorkflowEdgeType }>
      const edgeId = ce.detail?.edgeId
      const edgeType = ce.detail?.edgeType
      if (!edgeId) return
      if (
        edgeType === 'funnel_conversion_to_sequence' ||
        edgeType === 'sequence_complete_to_sequence'
      ) {
        const matchedEdge = edgesRef.current.find((e) => {
          const d = e.data as WorkflowFlowEdgeData | undefined
          return d?.workflow_edge_id === edgeId
        })
        const targetNode = matchedEdge ? fromFlowNodeId(matchedEdge.target) : null
        const sequenceId = targetNode?.type === 'sequence' ? targetNode.id : undefined

        let scheduledCount: number | undefined
        if (sequenceId) {
          try {
            const result = await backendGet<{ count: number }>(
              `/api/email/logs/schedules/count?sequence_id=${sequenceId}&status=scheduled`,
            )
            scheduledCount = typeof result?.count === 'number' ? result.count : undefined
          } catch {
            // non-critical
          }
        }

        setPendingDeleteEdge({ edgeId, edgeType, mode: 'keep_unsent', sequenceId, scheduledCount })
        return
      }
      try {
        await deleteWorkflowEdge(campaignId, edgeId, 'keep_unsent')
        setEdges((prev) => prev.filter((e) => e.id !== edgeId))
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : WORKFLOW_TOAST_ERRORS.DELETE_CONNECTION_FAILED.userMessage,
        )
      }
    }
    window.addEventListener('workflow-canvas:delete-edge', handler as EventListener)
    return () => window.removeEventListener('workflow-canvas:delete-edge', handler as EventListener)
  }, [campaignId, setEdges])

  const confirmDeleteEdge = async () => {
    if (!pendingDeleteEdge) return
    try {
      await deleteWorkflowEdge(campaignId, pendingDeleteEdge.edgeId, pendingDeleteEdge.mode)
      setEdges((prev) => prev.filter((e) => e.id !== pendingDeleteEdge.edgeId))
      setPendingDeleteEdge(null)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : WORKFLOW_TOAST_ERRORS.DELETE_CONNECTION_FAILED.userMessage,
      )
    }
  }

  useEffect(() => {
    const handleUpdate = async (e: Event) => {
      const { nodeId, text } = (e as CustomEvent).detail ?? {}
      if (!nodeId || typeof text !== 'string') return
      const strategyId = parseStrategyNodeId(nodeId)
      if (!strategyId) return
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, text } as unknown as StrategyNodeData } : n,
        ),
      )
      try {
        await updateStrategyNode(campaignId, strategyId, { text })
      } catch {
        toast.error('Failed to save strategy note')
      }
    }
    window.addEventListener('strategy:update-node', handleUpdate as EventListener)
    return () => window.removeEventListener('strategy:update-node', handleUpdate as EventListener)
  }, [campaignId, setNodes])

  useEffect(() => {
    const handleBuild = (e: Event) => {
      const { nodeId, text, artifactHint } = (e as CustomEvent).detail ?? {}
      if (!nodeId) return
      window.dispatchEvent(
        new CustomEvent('strategy:request-build', { detail: { nodeId, text, artifactHint } }),
      )
    }
    window.addEventListener('strategy:build-node', handleBuild as EventListener)
    return () => window.removeEventListener('strategy:build-node', handleBuild as EventListener)
  }, [])

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleSaveLayout = useCallback(() => {
    if (!workflowId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const vp = getViewport()
        const layout = buildLayoutToSave(
          nodesRef.current.map((n) => ({ id: n.id, position: n.position })),
          vp,
          edgesRef.current.map((e) => ({
            id: e.id,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        )
        await saveWorkflowLayout(campaignId, { workflow_id: workflowId, layout })
      } catch (e) {
        // show raw error only when it becomes the current error
        setError(
          e instanceof Error ? e.message : WORKFLOW_TOAST_ERRORS.SAVE_LAYOUT_FAILED.userMessage,
        )
      }
    }, 1500)
  }, [campaignId, getViewport, workflowId])

  const strategyPositionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onNodesChange = useCallback(
    (changes: Parameters<OnNodesChange>[0]) => {
      onNodesChangeBase(changes as Parameters<typeof onNodesChangeBase>[0])
      scheduleSaveLayout()

      const positionChanges = changes.filter(
        (c) => c.type === 'position' && (c as any).position && isStrategyNode((c as any).id),
      )
      if (positionChanges.length > 0) {
        if (strategyPositionTimerRef.current) clearTimeout(strategyPositionTimerRef.current)
        strategyPositionTimerRef.current = setTimeout(() => {
          for (const c of positionChanges) {
            const id = (c as any).id as string
            const pos = (c as any).position as { x: number; y: number }
            const strategyId = parseStrategyNodeId(id)
            if (strategyId && pos) {
              void updateStrategyNode(campaignId, strategyId, {
                position_x: pos.x,
                position_y: pos.y,
              })
            }
          }
        }, 1500)
      }
    },
    [campaignId, onNodesChangeBase, scheduleSaveLayout],
  )

  const onEdgesChange = useCallback(
    (changes: Parameters<OnEdgesChange>[0]) => {
      const filtered = changes.filter((c) => {
        if (c.type === 'remove') {
          const edge = edgesRef.current.find((e) => e.id === c.id)
          if (edge?.data && (edge.data as WorkflowFlowEdgeData).derived) return false
        }
        return true
      })
      onEdgesChangeBase(filtered as Parameters<typeof onEdgesChangeBase>[0])
      scheduleSaveLayout()
    },
    [onEdgesChangeBase, scheduleSaveLayout],
  )

  const handleAutoLayout = useCallback(() => {
    const layouted = getLayoutedElements(nodesRef.current, edgesRef.current, { direction: 'LR' })
    setNodes(layouted.nodes)
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 0)
    scheduleSaveLayout()
  }, [fitView, scheduleSaveLayout, setNodes])

  const handleFitView = useCallback(() => fitView({ padding: 0.2, duration: 300 }), [fitView])

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    flowX: number
    flowY: number
  } | null>(null)

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const vp = getViewport()
      const flowX = (event.clientX - bounds.left - vp.x) / vp.zoom
      const flowY = (event.clientY - bounds.top - vp.y) / vp.zoom
      setContextMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        flowX,
        flowY,
      })
    },
    [getViewport],
  )

  const handleCreateFromMenu = useCallback(
    async (artifactType: string) => {
      if (!contextMenu) return
      const position = { x: contextMenu.flowX, y: contextMenu.flowY }
      setContextMenu(null)

      try {
        let nodeType: string
        let nodeId: string
        let label: string

        switch (artifactType) {
          case 'funnel': {
            const f = await createFunnel(campaignId, {
              name: 'Untitled Funnel',
              funnel_type: 'custom',
            })
            nodeType = 'funnel'
            nodeId = f.id
            label = f.name
            break
          }
          case 'sequence': {
            const s = await createSequence(campaignId)
            nodeType = 'sequence'
            nodeId = s.id
            label = s.name ?? 'Untitled Sequence'
            break
          }
          case 'offer': {
            const o = await createOffer(campaignId)
            nodeType = 'offer'
            nodeId = o.id
            label = o.name ?? 'Untitled Offer'
            break
          }
          case 'presentation': {
            const pres = await createPresentation(campaignId)
            nodeType = 'presentation'
            nodeId = pres.id
            label = pres.name ?? 'Untitled Presentation'
            break
          }
          case 'ad_campaign': {
            const ac = await createAdCampaign(campaignId)
            nodeType = 'ad_campaign'
            nodeId = ac.id
            label = ac.name
            break
          }
          default:
            return
        }

        const newNode: FlowNode<WorkflowFlowNodeData> = {
          id: toFlowNodeId(nodeType as any, nodeId),
          type: nodeType,
          position,
          data: {
            workflow_node_type: nodeType as any,
            workflow_node_id: nodeId,
            label,
            converting_pages: 0,
          },
        }
        setNodes((prev) => [...prev, newNode])
        scheduleSaveLayout()
      } catch {
        toast.error('Failed to create artifact')
      }
    },
    [campaignId, contextMenu, scheduleSaveLayout, setNodes],
  )

  const handleCreateStrategyFromMenu = useCallback(
    async (nodeType: 'sticky_note' | 'text_block' | 'group_box' | 'milestone') => {
      if (!contextMenu) return
      const position = { x: contextMenu.flowX, y: contextMenu.flowY }
      setContextMenu(null)

      try {
        const created = await createStrategyNode(campaignId, {
          node_type: nodeType,
          text: '',
          color: 'yellow',
          position_x: position.x,
          position_y: position.y,
        })
        const flowType = `strategy_${nodeType}` as const
        const newNode = {
          id: `strategy:${created.id}`,
          type: flowType,
          position,
          data: {
            strategy_node_id: created.id,
            strategy_node_type: flowType,
            text: created.text,
            color: created.color,
            artifact_hint: created.artifact_hint ?? undefined,
            linked_artifact_id: created.linked_artifact_id ?? undefined,
            linked_artifact_type: created.linked_artifact_type ?? undefined,
          } satisfies StrategyNodeData,
        }
        setNodes((prev) => [...prev, newNode as any])
      } catch {
        toast.error('Failed to create strategy note')
      }
    },
    [campaignId, contextMenu, setNodes],
  )

  const handleDeleteStrategyNode = useCallback(
    async (nodeId: string) => {
      const strategyId = parseStrategyNodeId(nodeId)
      if (!strategyId) return
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      try {
        await deleteStrategyNode(campaignId, strategyId)
      } catch {
        toast.error('Failed to delete strategy note')
      }
    },
    [campaignId, setNodes],
  )

  const handleNodeClick = useCallback(
    (
      _event: MouseEvent | React.MouseEvent<Element, MouseEvent>,
      node: FlowNode<WorkflowFlowNodeData | StrategyNodeData>,
    ) => {
      if (isStrategyNode(node.id)) return
      const parsed = fromFlowNodeId(node.id)
      if (!parsed) return

      const workflowTypeToArtifactType: Record<string, string> = {
        funnel: 'funnel',
        sequence: 'sequence',
        presentation: 'presentation',
        offer: 'offer',
        ad_campaign: 'ad-campaign',
        avatar: 'avatar',
        social_post: 'social-post',
      }
      const artifactType = workflowTypeToArtifactType[parsed.type]
      if (!artifactType) return

      const d = node.data as WorkflowFlowNodeData
      window.__vibey_pending_artifact_open = {
        kind: 'simple',
        type: artifactType as VibeyPendingArtifactOpenSimpleType,
        id: parsed.id,
        name: d.label,
      }
      window.dispatchEvent(new CustomEvent('workflow:open-artifact'))
    },
    [],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      )
        return

      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        const vp = getViewport()
        const flowX = (-vp.x + 400) / vp.zoom
        const flowY = (-vp.y + 300) / vp.zoom
        void (async () => {
          try {
            const created = await createStrategyNode(campaignId, {
              node_type: 'sticky_note',
              text: '',
              color: 'yellow',
              position_x: flowX,
              position_y: flowY,
            })
            setNodes((prev) => [
              ...prev,
              {
                id: `strategy:${created.id}`,
                type: 'strategy_sticky_note' as const,
                position: { x: flowX, y: flowY },
                data: {
                  strategy_node_id: created.id,
                  strategy_node_type: 'strategy_sticky_note' as const,
                  text: '',
                  color: 'yellow',
                } satisfies StrategyNodeData,
              } as any,
            ])
          } catch {
            toast.error('Failed to create strategy note')
          }
        })()
        return
      }

      if (e.key === 'b' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        const selected = nodesRef.current.filter(
          (n) =>
            n.selected && isStrategyNode(n.id) && !(n.data as StrategyNodeData).linked_artifact_id,
        )
        if (selected.length === 0) return
        const texts = selected
          .map((n) => {
            const d = n.data as StrategyNodeData
            return { text: d.text, hint: d.artifact_hint }
          })
          .filter((s) => s.text)
        if (texts.length === 0) return
        const summary = texts
          .map((s, i) => `${i + 1}. ${s.hint ? `[${s.hint}] ` : ''}${s.text}`)
          .join('\n')
        window.dispatchEvent(
          new CustomEvent('strategy:request-build', {
            detail: {
              text: summary,
              artifactHint: 'campaign artifacts',
              bulk: texts.length > 1,
            },
          }),
        )
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey) {
        const selectedStrategy = nodesRef.current.filter((n) => n.selected && isStrategyNode(n.id))
        for (const n of selectedStrategy) {
          void handleDeleteStrategyNode(n.id)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [campaignId, getViewport, handleDeleteStrategyNode, setNodes])

  const strategyProgress = useMemo(() => {
    const strategyNodes = nodes.filter((n) => isStrategyNode(n.id))
    if (strategyNodes.length === 0) return null
    const built = strategyNodes.filter(
      (n) => !!(n.data as StrategyNodeData).linked_artifact_id,
    ).length
    return { total: strategyNodes.length, built }
  }, [nodes])

  const handleHighlightUnbuilt = useCallback(() => {
    const unbuiltIds = new Set(
      nodesRef.current
        .filter((n) => isStrategyNode(n.id) && !(n.data as StrategyNodeData).linked_artifact_id)
        .map((n) => n.id),
    )
    if (unbuiltIds.size === 0) return
    setNodes((prev) => prev.map((n) => ({ ...n, selected: unbuiltIds.has(n.id) })))
    const first = nodesRef.current.find((n) => unbuiltIds.has(n.id))
    if (first) {
      setTimeout(
        () => setCenter(first.position.x + 90, first.position.y + 40, { zoom: 1, duration: 400 }),
        50,
      )
    }
  }, [setCenter, setNodes])

  if (loading) {
    return (
      <div className="card-glass flex h-full flex-col overflow-hidden rounded-2xl">
        <div className="border-b-glass flex items-center justify-between px-4 py-3">
          <span className="body-2 text-foreground font-medium">Workflow</span>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading workflow..." />
        </div>
      </div>
    )
  }

  return (
    <>
      {pendingDeleteEdge && (
        <>
          <div className="z-modal-backdrop fixed inset-0 bg-modal-overlay" />
          <div className="z-modal-content fixed inset-0 flex items-center justify-center p-4">
            <div className="surface-card wizard-container-border rounded-spacing-4 relative w-full max-w-md">
              <button
                type="button"
                onClick={() => setPendingDeleteEdge(null)}
                className="btn-icon-bare btn-close-absolute"
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </button>
              <div className="px-spacing-6 pt-spacing-6 pb-spacing-4">
                <h2 className="title-h6 text-foreground">Delete connection?</h2>
                <p className="body-3 text-muted-foreground mt-spacing-2">
                  What should happen to unsent emails already scheduled through this connection?
                </p>
                {typeof pendingDeleteEdge.scheduledCount === 'number' &&
                  pendingDeleteEdge.scheduledCount > 0 && (
                    <p className="body-3 text-muted-foreground mt-spacing-1">
                      <span className="text-foreground font-medium">
                        {pendingDeleteEdge.scheduledCount}
                      </span>{' '}
                      unsent email{pendingDeleteEdge.scheduledCount !== 1 ? 's' : ''} in queue.
                    </p>
                  )}
                <div className="mt-spacing-3 space-y-spacing-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDeleteEdge((prev) =>
                        prev ? { ...prev, mode: 'keep_unsent' } : prev,
                      )
                    }
                    className={`gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-3 flex w-full items-center border text-left transition-all ${
                      pendingDeleteEdge.mode === 'keep_unsent'
                        ? 'button-glass-accent border-primary/40'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/20'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        pendingDeleteEdge.mode === 'keep_unsent'
                          ? 'border-primary'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {pendingDeleteEdge.mode === 'keep_unsent' && (
                        <span className="bg-primary h-2 w-2 rounded-full" />
                      )}
                    </span>
                    <span className="body-3">Keep unsent emails</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDeleteEdge((prev) =>
                        prev ? { ...prev, mode: 'remove_unsent' } : prev,
                      )
                    }
                    className={`gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-3 flex w-full items-center border text-left transition-all ${
                      pendingDeleteEdge.mode === 'remove_unsent'
                        ? 'border-destructive bg-destructive/10 text-foreground'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        pendingDeleteEdge.mode === 'remove_unsent'
                          ? 'border-destructive'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {pendingDeleteEdge.mode === 'remove_unsent' && (
                        <span className="bg-destructive h-2 w-2 rounded-full" />
                      )}
                    </span>
                    <span className="body-3">Remove all unsent emails</span>
                  </button>
                </div>
              </div>
              <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
                <button
                  type="button"
                  onClick={() => setPendingDeleteEdge(null)}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDeleteEdge()}
                  className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card-glass flex h-full flex-col overflow-hidden rounded-2xl">
        <div className="border-b-glass flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="body-2 text-foreground font-medium">Workflow</span>
            {strategyProgress && (
              <button
                type="button"
                onClick={handleHighlightUnbuilt}
                className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-600 transition-colors hover:bg-yellow-500/20 dark:text-yellow-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                {strategyProgress.built}/{strategyProgress.total} planned items built
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const vp = getViewport()
                const flowX = (-vp.x + 200) / vp.zoom
                const flowY = (-vp.y + 200) / vp.zoom
                setContextMenu(null)
                void (async () => {
                  try {
                    const created = await createStrategyNode(campaignId, {
                      node_type: 'sticky_note',
                      text: '',
                      color: 'yellow',
                      position_x: flowX,
                      position_y: flowY,
                    })
                    const newNode = {
                      id: `strategy:${created.id}`,
                      type: 'strategy_sticky_note' as const,
                      position: { x: flowX, y: flowY },
                      data: {
                        strategy_node_id: created.id,
                        strategy_node_type: 'strategy_sticky_note' as const,
                        text: '',
                        color: 'yellow',
                      } satisfies StrategyNodeData,
                    }
                    setNodes((prev) => [...prev, newNode as any])
                  } catch {
                    toast.error('Failed to create strategy note')
                  }
                })()
              }}
              className="button-glass-neutral inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Strategy note
            </button>
            {nodes.some(
              (n) => isStrategyNode(n.id) && !(n.data as StrategyNodeData).linked_artifact_id,
            ) && (
              <button
                type="button"
                onClick={() => {
                  const strategyTexts = nodesRef.current
                    .filter(
                      (n) =>
                        isStrategyNode(n.id) && !(n.data as StrategyNodeData).linked_artifact_id,
                    )
                    .map((n) => {
                      const d = n.data as StrategyNodeData
                      return { text: d.text, hint: d.artifact_hint }
                    })
                    .filter((s) => s.text)
                  if (strategyTexts.length === 0) return
                  const summary = strategyTexts
                    .map((s, i) => `${i + 1}. ${s.hint ? `[${s.hint}] ` : ''}${s.text}`)
                    .join('\n')
                  window.dispatchEvent(
                    new CustomEvent('strategy:request-build', {
                      detail: {
                        text: summary,
                        artifactHint: 'campaign artifacts',
                        bulk: true,
                      },
                    }),
                  )
                }}
                className="button-glass-accent inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Build all
              </button>
            )}
            <button
              type="button"
              onClick={() => openWorkspaceSettings('email')}
              className="button-glass-accent inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              <Mail className="h-3.5 w-3.5" />
              Connect sender
            </button>
          </div>
        </div>

        {error && (
          <div className="border-border border-b px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-destructive/80 mt-0.5 h-4 w-4" />
              <p className="body-3 text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <div className="react-flow-container-optimized card-glass rounded-spacing-2 relative min-h-0 flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick as any}
              isValidConnection={(conn) => isValidConnection(conn as Connection)}
              onPaneClick={() => setContextMenu(null)}
              onPaneContextMenu={
                handlePaneContextMenu as (e: MouseEvent | React.MouseEvent) => void
              }
              onMove={(_e, viewport) => {
                setZoomLevel(Math.round(viewport.zoom * 100))
                setContextMenu(null)
              }}
              onMoveEnd={() => scheduleSaveLayout()}
              connectionMode={ConnectionMode.Loose}
              deleteKeyCode={['Backspace', 'Delete']}
              edgesReconnectable
              fitView
              minZoom={0.1}
              maxZoom={1.5}
              panOnDrag={[1, 2]}
              panOnScroll
            >
              <Background gap={20} size={1} color="var(--color-border)" className="opacity-30" />

              {contextMenu && (
                <div
                  className="card-glass border-border absolute z-20 min-w-[180px] rounded-lg border py-1 shadow-lg"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                  <div className="px-3 py-1.5">
                    <span className="text-muted-foreground/50 text-[10px] font-medium uppercase tracking-wider">
                      Strategy
                    </span>
                  </div>
                  {[
                    { type: 'sticky_note' as const, label: 'Sticky Note' },
                    { type: 'text_block' as const, label: 'Text Block' },
                    { type: 'group_box' as const, label: 'Group Box' },
                    { type: 'milestone' as const, label: 'Milestone' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => void handleCreateStrategyFromMenu(item.type)}
                      className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
                    >
                      <StickyNote className="h-3.5 w-3.5 text-yellow-500/70" />
                      {item.label}
                    </button>
                  ))}

                  <div className="border-border my-1 border-t" />
                  <div className="px-3 py-1.5">
                    <span className="text-muted-foreground/50 text-[10px] font-medium uppercase tracking-wider">
                      Create Artifact
                    </span>
                  </div>
                  {[
                    { type: 'offer', label: 'Offer' },
                    { type: 'funnel', label: 'Funnel' },
                    { type: 'sequence', label: 'Email Sequence' },
                    { type: 'presentation', label: 'Presentation' },
                    { type: 'ad_campaign', label: 'Ad Campaign' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => void handleCreateFromMenu(item.type)}
                      className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
                    >
                      <Plus className="text-muted-foreground h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="absolute bottom-4 left-4 z-10 hidden flex-col gap-3 md:flex">
                <div className="relative">
                  <MiniMap
                    nodeStrokeWidth={3}
                    zoomable
                    pannable
                    className="card-glass border-border rounded-spacing-2 border"
                    style={{ position: 'relative', margin: 0 }}
                    nodeColor={(node) => {
                      if (isStrategyNode(node.id)) return 'rgba(250,204,21,0.25)'
                      const parsed = fromFlowNodeId(node.id)
                      if (!parsed) return 'rgba(100,100,100,0.5)'
                      switch (parsed.type) {
                        case 'funnel':
                          return 'rgba(59,130,246,0.6)'
                        case 'sequence':
                          return 'rgba(147,51,234,0.6)'
                        case 'presentation':
                          return 'rgba(16,185,129,0.6)'
                        case 'offer':
                          return 'rgba(245,158,11,0.6)'
                        case 'ad_campaign':
                          return 'rgba(239,68,68,0.6)'
                        case 'avatar':
                          return 'rgba(99,102,241,0.6)'
                        case 'social_post':
                          return 'rgba(236,72,153,0.6)'
                        default:
                          return 'rgba(100,100,100,0.5)'
                      }
                    }}
                    nodeStrokeColor={(node) => {
                      if (isStrategyNode(node.id)) return 'rgba(250,204,21,0.6)'
                      return 'transparent'
                    }}
                  />
                  <div className="card-glass border-border text-foreground absolute bottom-2 right-2 rounded border px-2 py-1 text-[10px] font-medium">
                    {zoomLevel}%
                  </div>
                </div>

                <div className="p-spacing-2 card-glass border-border flex items-center gap-2 rounded-md border shadow-sm">
                  <Tooltip label="Zoom out" side="top">
                    <button
                      type="button"
                      onClick={() => {
                        zoomOut({ duration: 200 })
                        setTimeout(() => setZoomLevel(Math.round(getViewport().zoom * 100)), 250)
                      }}
                      className="btn-icon-bare"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 12H4"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={zoomLevel}
                    onChange={(e) => {
                      const newZoom = Number(e.target.value) / 100
                      const vp = getViewport()
                      setViewport({ x: vp.x, y: vp.y, zoom: newZoom }, { duration: 0 })
                      setZoomLevel(Number(e.target.value))
                    }}
                    className="slider-opacity w-24"
                  />
                  <Tooltip label="Zoom in" side="top">
                    <button
                      type="button"
                      onClick={() => {
                        zoomIn({ duration: 200 })
                        setTimeout(() => setZoomLevel(Math.round(getViewport().zoom * 100)), 250)
                      }}
                      className="btn-icon-bare"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Tooltip label="Fit view" side="top">
                    <button type="button" onClick={handleFitView} className="btn-icon-glass">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip label="Auto-layout" side="top">
                    <button type="button" onClick={handleAutoLayout} className="btn-icon-glass">
                      <Network className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </ReactFlow>
          </div>
        </div>
      </div>
    </>
  )
}

export function WorkflowCanvas({ campaignId }: { campaignId: string }) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner campaignId={campaignId} />
    </ReactFlowProvider>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type OnEdgesChange,
  type OnNodesChange,
  type Viewport,
} from '@xyflow/react'
import { CANVAS_VIEW_MESSAGES } from '../canvas-view.messages.config'
import { buildUpdatedCanvasContent } from '../lib/canvas-node-content'
import { createWhiteboardNodeData, hydrateWhiteboardItems } from '../lib/whiteboard-graph'
import { fetchCampaignWhiteboard } from '../services/whiteboard.service'
import type {
  CampaignWhiteboardResponse,
  CanvasItemKind,
  CanvasOperation,
  CanvasPlaceholderAction,
  PersistedWhiteboardNodeData,
  WhiteboardEdge,
  WhiteboardNode,
  WhiteboardNodeKind,
} from '../types/whiteboard.types'
import { useCanvasOperationCommit } from './useCanvasOperationCommit'
import { useCanvasOperationsRealtime } from './useCanvasOperationsRealtime'
import { useCanvasSelectionActions } from './useCanvasSelectionActions'

const CONTENT_SAVE_MS = 700
const ITEM_KIND: Record<WhiteboardNodeKind, CanvasItemKind> = {
  note: 'sticky_note',
  text: 'text',
  card: 'card',
  shape: 'shape',
  frame: 'frame',
}
export function useCampaignWhiteboard(campaignId: string) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<WhiteboardNode>([])
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<WhiteboardEdge>([])
  const [loading, setLoading] = useState(true)
  const [boardId, setBoardId] = useState<string | null>(null)
  const [viewport, setViewportState] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const nodesRef = useRef(nodes)
  const hydrateBoardRef = useRef<(response: CampaignWhiteboardResponse) => void>(() => {})
  const contentTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const { getViewport, setViewport: setFlowViewport, screenToFlowPosition } = useReactFlow()
  const operationCommit = useCanvasOperationCommit({
    campaignId,
    onUndoLoaded: (response) => hydrateBoardRef.current(response),
  })
  const { commit, revisionRef, setError } = operationCommit

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  const updateNodeSize = useCallback(
    (nodeId: string, width: number, height: number) => {
      setNodes((all) =>
        all.map((node) =>
          node.id === nodeId
            ? { ...node, width, height, data: { ...node.data, width, height } }
            : node,
        ),
      )
      commit([{ op: 'update_item', item_id: nodeId, patch: { width, height } }])
    },
    [commit, setNodes],
  )

  const updateNodeContent = useCallback(
    (nodeId: string, patch: Partial<PersistedWhiteboardNodeData>) => {
      const current = nodesRef.current.find((node) => node.id === nodeId)
      const content = buildUpdatedCanvasContent(current?.data, patch)
      setNodes((all) =>
        all.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      )
      const existingTimer = contentTimersRef.current.get(nodeId)
      if (existingTimer) clearTimeout(existingTimer)
      contentTimersRef.current.set(
        nodeId,
        setTimeout(
          () => commit([{ op: 'update_item', item_id: nodeId, patch: { content } }]),
          CONTENT_SAVE_MS,
        ),
      )
    },
    [commit, setNodes],
  )

  const handlePlaceholderAction = useCallback(
    (nodeId: string, action: CanvasPlaceholderAction) => {
      const node = nodesRef.current.find((candidate) => candidate.id === nodeId)
      if (!node?.data.placeholder) return
      if (action === 'dismiss') updateNodeContent(nodeId, { status: 'dismissed' })
      window.dispatchEvent(
        new CustomEvent('canvas:placeholder-action', {
          detail: {
            campaignId,
            nodeId,
            action,
            placeholder: node.data.placeholder,
            title: node.data.title,
            stageKey: node.data.stage_key ?? null,
            blueprintId: node.data.blueprint_id ?? null,
          },
        }),
      )
    },
    [campaignId, updateNodeContent],
  )

  const hydrateBoard = useCallback(
    (response: CampaignWhiteboardResponse) => {
      const hydrated = hydrateWhiteboardItems(
        response.items,
        response.connectors,
        updateNodeContent,
        updateNodeSize,
        handlePlaceholderAction,
      )
      setNodes(hydrated.nodes)
      setEdges(hydrated.edges)
    },
    [handlePlaceholderAction, setEdges, setNodes, updateNodeContent, updateNodeSize],
  )
  hydrateBoardRef.current = hydrateBoard

  useEffect(() => {
    let active = true
    setLoading(true)
    void fetchCampaignWhiteboard(campaignId)
      .then((response) => {
        if (!active) return
        revisionRef.current = response.board.revision
        setBoardId(response.board.id)
        hydrateBoard(response)
        setViewportState(response.board.viewport)
        void setFlowViewport(response.board.viewport, { duration: 0 })
      })
      .catch(() => active && setError(CANVAS_VIEW_MESSAGES.loadError))
      .finally(() => active && setLoading(false))
    const timers = contentTimersRef.current
    return () => {
      active = false
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [campaignId, hydrateBoard, revisionRef, setError, setFlowViewport])
  useCanvasOperationsRealtime({ boardId, campaignId, revisionRef, onRemoteBoard: hydrateBoard })

  const addNode = useCallback(
    (kind: WhiteboardNodeKind) => {
      const id = crypto.randomUUID()
      const position = screenToFlowPosition({
        x: window.innerWidth * 0.68,
        y: window.innerHeight * 0.5,
      })
      const data = createWhiteboardNodeData(kind, updateNodeContent, updateNodeSize)
      const dimensions = kind === 'frame' ? { width: 640, height: 360 } : {}
      setNodes((current) => [
        ...current,
        { id, type: 'whiteboard', position, data: { ...data, ...dimensions }, ...dimensions },
      ])
      commit([
        {
          op: 'create_item',
          item: {
            id,
            kind: ITEM_KIND[kind],
            position_x: position.x,
            position_y: position.y,
            content: { title: data.title, text: data.text },
            ...dimensions,
          },
        },
      ])
    },
    [commit, screenToFlowPosition, setNodes, updateNodeContent, updateNodeSize],
  )

  const addResourceNode = useCallback(
    (resource: { id: string; title: string; type: string }) => {
      const id = crypto.randomUUID()
      const position = screenToFlowPosition({
        x: window.innerWidth * 0.68,
        y: window.innerHeight * 0.5,
      })
      const baseData = createWhiteboardNodeData('card', updateNodeContent, updateNodeSize)
      const data = {
        ...baseData,
        title: resource.title,
        text: resource.type.replaceAll('_', ' '),
        resource_type: resource.type,
        resource_id: resource.id,
      }
      setNodes((current) => [...current, { id, type: 'whiteboard', position, data }])
      commit([
        {
          op: 'create_item',
          item: {
            id,
            kind: 'resource_card',
            position_x: position.x,
            position_y: position.y,
            content: { title: data.title, text: data.text },
            resource_type: resource.type,
            resource_id: resource.id,
          },
        },
      ])
    },
    [commit, screenToFlowPosition, setNodes, updateNodeContent, updateNodeSize],
  )

  const selectionActions = useCanvasSelectionActions({ nodesRef, setNodes, setEdges, commit })

  const onNodesChange: OnNodesChange<WhiteboardNode> = useCallback(
    (changes) => {
      onNodesChangeBase(changes)
      const operations = changes.reduce<CanvasOperation[]>((all, change) => {
        if (change.type === 'remove') {
          all.push({ op: 'delete_item', item_id: change.id })
          return all
        }
        if (change.type === 'position' && change.position && !change.dragging) {
          all.push({
            op: 'update_item',
            item_id: change.id,
            patch: { position_x: change.position.x, position_y: change.position.y },
          })
        }
        return all
      }, [])
      if (operations.length > 0) commit(operations)
    },
    [commit, onNodesChangeBase],
  )

  const onEdgesChange: OnEdgesChange<WhiteboardEdge> = useCallback(
    (changes) => {
      onEdgesChangeBase(changes)
      const operations: CanvasOperation[] = changes
        .filter((change) => change.type === 'remove')
        .map((change) => ({ op: 'delete_connector', connector_id: change.id }))
      if (operations.length > 0) commit(operations)
    },
    [commit, onEdgesChangeBase],
  )

  const connectItems = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const id = crypto.randomUUID()
      setEdges((current) => addEdge({ ...connection, id }, current))
      commit([
        {
          op: 'create_connector',
          connector: {
            id,
            source_item_id: connection.source,
            target_item_id: connection.target,
            source_handle: connection.sourceHandle,
            target_handle: connection.targetHandle,
          },
        },
      ])
    },
    [commit, setEdges],
  )

  const saveViewport = useCallback(() => {
    const nextViewport = getViewport()
    setViewportState(nextViewport)
    commit([{ op: 'update_viewport', viewport: nextViewport }])
  }, [commit, getViewport])

  return {
    nodes,
    edges,
    loading,
    error: operationCommit.error,
    saveState: operationCommit.saveState,
    addNode,
    addResourceNode,
    ...selectionActions,
    connectItems,
    saveViewport,
    undo: operationCommit.undo,
    redo: operationCommit.redo,
    canRedo: operationCommit.canRedo,
    canUndo: operationCommit.canUndo,
    onNodesChange,
    onEdgesChange,
    boardId,
    revision: revisionRef.current,
    viewport,
  }
}

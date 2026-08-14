'use client'

import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type {
  CanvasItemKind,
  CanvasOperation,
  WhiteboardEdge,
  WhiteboardNode,
} from '../types/whiteboard.types'

const ITEM_KIND: Record<WhiteboardNode['data']['kind'], CanvasItemKind> = {
  note: 'sticky_note',
  text: 'text',
  card: 'card',
  shape: 'shape',
  frame: 'frame',
}

interface UseCanvasSelectionActionsInput {
  nodesRef: MutableRefObject<WhiteboardNode[]>
  setNodes: Dispatch<SetStateAction<WhiteboardNode[]>>
  setEdges: Dispatch<SetStateAction<WhiteboardEdge[]>>
  commit: (operations: CanvasOperation[]) => void
}

export function useCanvasSelectionActions({
  nodesRef,
  setNodes,
  setEdges,
  commit,
}: UseCanvasSelectionActionsInput) {
  const deleteItems = useCallback(
    (itemIds: string[]) => {
      if (itemIds.length === 0) return
      const ids = new Set(itemIds)
      setNodes((current) => current.filter((node) => !ids.has(node.id)))
      setEdges((current) =>
        current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)),
      )
      commit(itemIds.map((itemId) => ({ op: 'delete_item', item_id: itemId })))
    },
    [commit, setEdges, setNodes],
  )

  const duplicateItems = useCallback(
    (itemIds: string[]) => {
      const originals = nodesRef.current.filter((node) => itemIds.includes(node.id))
      if (originals.length === 0) return
      const copies = originals.map((node) => ({
        ...node,
        id: crypto.randomUUID(),
        selected: false,
        position: { x: node.position.x + 32, y: node.position.y + 32 },
      }))
      setNodes((current) => [...current, ...copies])
      commit(
        copies.map((node) => ({
          op: 'create_item' as const,
          item: {
            id: node.id,
            kind: ITEM_KIND[node.data.kind],
            position_x: node.position.x,
            position_y: node.position.y,
            width: node.width ?? node.data.width,
            height: node.height ?? node.data.height,
            content: { title: node.data.title, text: node.data.text },
          },
        })),
      )
    },
    [commit, nodesRef, setNodes],
  )

  const setItemsLocked = useCallback(
    (itemIds: string[], locked: boolean) => {
      setNodes((current) =>
        current.map((node) =>
          itemIds.includes(node.id)
            ? { ...node, draggable: !locked, data: { ...node.data, locked } }
            : node,
        ),
      )
      commit(itemIds.map((itemId) => ({ op: 'update_item', item_id: itemId, patch: { locked } })))
    },
    [commit, setNodes],
  )

  const alignItems = useCallback(
    (itemIds: string[], axis: 'horizontal' | 'vertical') => {
      const selected = nodesRef.current.filter((node) => itemIds.includes(node.id))
      if (selected.length < 2) return
      const positionKey = axis === 'horizontal' ? 'y' : 'x'
      const target =
        selected.reduce((sum, node) => sum + node.position[positionKey], 0) / selected.length
      const positions = new Map(
        selected.map((node) => [node.id, { ...node.position, [positionKey]: target }]),
      )
      setNodes((current) =>
        current.map((node) =>
          positions.has(node.id) ? { ...node, position: positions.get(node.id)! } : node,
        ),
      )
      commit(
        selected.map((node) => ({
          op: 'update_item',
          item_id: node.id,
          patch: positionKey === 'x' ? { position_x: target } : { position_y: target },
        })),
      )
    },
    [commit, nodesRef, setNodes],
  )

  const distributeItems = useCallback(
    (itemIds: string[], axis: 'horizontal' | 'vertical') => {
      const positionKey = axis === 'horizontal' ? 'x' : 'y'
      const selected = nodesRef.current
        .filter((node) => itemIds.includes(node.id))
        .sort((a, b) => a.position[positionKey] - b.position[positionKey])
      if (selected.length < 3) return
      const first = selected[0]!.position[positionKey]
      const last = selected[selected.length - 1]!.position[positionKey]
      const step = (last - first) / (selected.length - 1)
      const positions = new Map(
        selected.map((node, index) => [
          node.id,
          { ...node.position, [positionKey]: first + step * index },
        ]),
      )
      setNodes((current) =>
        current.map((node) =>
          positions.has(node.id) ? { ...node, position: positions.get(node.id)! } : node,
        ),
      )
      commit(
        selected.map((node, index) => ({
          op: 'update_item',
          item_id: node.id,
          patch:
            positionKey === 'x'
              ? { position_x: first + step * index }
              : { position_y: first + step * index },
        })),
      )
    },
    [commit, nodesRef, setNodes],
  )

  return { alignItems, deleteItems, distributeItems, duplicateItems, setItemsLocked }
}

import {
  useCallback,
  useEffect,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from 'react'
import { MAX_ZOOM, MIN_ZOOM } from './force-graph.constants'
import type { ForceGraphDragState, SimNode } from './force-graph.types'

interface WritableRef<T> {
  current: T
}

const emptyDragState = (): ForceGraphDragState => ({
  node: null,
  startX: 0,
  startY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
})

export function screenToForceGraphWorld({
  pan,
  screenX,
  screenY,
  size,
  zoom,
}: {
  pan: { x: number; y: number }
  screenX: number
  screenY: number
  size: { w: number; h: number }
  zoom: number
}): [number, number] {
  const cx = size.w / 2
  const cy = size.h / 2
  const wx = (screenX - cx - pan.x) / zoom
  const wy = (screenY - cy - pan.y) / zoom
  return [wx, wy]
}

export function findForceGraphNodeAt({
  nodes,
  pan,
  screenX,
  screenY,
  size,
  zoom,
}: {
  nodes: SimNode[]
  pan: { x: number; y: number }
  screenX: number
  screenY: number
  size: { w: number; h: number }
  zoom: number
}): SimNode | null {
  const [wx, wy] = screenToForceGraphWorld({ pan, screenX, screenY, size, zoom })
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (!n) continue
    const dx = wx - n.x
    const dy = wy - n.y
    if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n
  }
  return null
}

export function useForceGraphPointerController({
  alphaRef,
  canvasRef,
  dragRef,
  hoveredRef,
  lastHoverIdRef,
  nodesRef,
  onNodeClick,
  panRef,
  savePositions,
  setHoverCardId,
  sizeRef,
  zoomRef,
}: {
  alphaRef: WritableRef<number>
  canvasRef: WritableRef<HTMLCanvasElement | null>
  dragRef: WritableRef<ForceGraphDragState>
  hoveredRef: WritableRef<SimNode | null>
  lastHoverIdRef: WritableRef<string | null>
  nodesRef: WritableRef<SimNode[]>
  onNodeClick: (node: SimNode['memory'] | null) => void
  panRef: WritableRef<{ x: number; y: number }>
  savePositions: () => void
  setHoverCardId: Dispatch<SetStateAction<string | null>>
  sizeRef: WritableRef<{ w: number; h: number }>
  zoomRef: WritableRef<number>
}): {
  handleMouseDown: (e: ReactMouseEvent<HTMLCanvasElement>) => void
  handleMouseLeave: () => void
  handleMouseMove: (e: ReactMouseEvent<HTMLCanvasElement>) => void
  handleMouseUp: (e: ReactMouseEvent<HTMLCanvasElement>) => void
} {
  const findNodeAt = useCallback(
    (screenX: number, screenY: number): SimNode | null =>
      findForceGraphNodeAt({
        nodes: nodesRef.current,
        pan: panRef.current,
        screenX,
        screenY,
        size: sizeRef.current,
        zoom: zoomRef.current,
      }),
    [nodesRef, panRef, sizeRef, zoomRef],
  )

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const node = findNodeAt(sx, sy)

      dragRef.current = {
        node,
        startX: sx,
        startY: sy,
        isPanning: node == null,
        panStartX: panRef.current.x,
        panStartY: panRef.current.y,
      }
      if (node) node.pinned = true
    },
    [canvasRef, dragRef, findNodeAt, panRef],
  )

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const drag = dragRef.current

      if (drag.node) {
        const [wx, wy] = screenToForceGraphWorld({
          pan: panRef.current,
          screenX: sx,
          screenY: sy,
          size: sizeRef.current,
          zoom: zoomRef.current,
        })
        drag.node.x = wx
        drag.node.y = wy
        drag.node.vx = 0
        drag.node.vy = 0
        alphaRef.current = Math.max(alphaRef.current, 0.1)
      } else if (drag.isPanning) {
        panRef.current = {
          x: drag.panStartX + (sx - drag.startX),
          y: drag.panStartY + (sy - drag.startY),
        }
        hoveredRef.current = null
        if (lastHoverIdRef.current !== null) {
          lastHoverIdRef.current = null
          setHoverCardId(null)
        }
      } else {
        const node = findNodeAt(sx, sy)
        hoveredRef.current = node
        const nid = node?.id ?? null
        if (nid !== lastHoverIdRef.current) {
          lastHoverIdRef.current = nid
          setHoverCardId(nid)
        }
        if (canvasRef.current) {
          canvasRef.current.style.cursor = node ? 'pointer' : 'grab'
        }
      }
    },
    [
      alphaRef,
      canvasRef,
      dragRef,
      findNodeAt,
      hoveredRef,
      lastHoverIdRef,
      panRef,
      setHoverCardId,
      sizeRef,
      zoomRef,
    ],
  )

  const handleMouseUp = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (drag.node) {
        const dx = sx - drag.startX
        const dy = sy - drag.startY
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
          onNodeClick(drag.node.memory)
        }
        drag.node.pinned = false
      } else if (drag.isPanning) {
        const dx = sx - drag.startX
        const dy = sy - drag.startY
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
          onNodeClick(null)
        }
      }

      dragRef.current = emptyDragState()
      savePositions()
    },
    [canvasRef, dragRef, onNodeClick, savePositions],
  )

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null
    lastHoverIdRef.current = null
    setHoverCardId(null)
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
    if (dragRef.current.node) {
      dragRef.current.node.pinned = false
      dragRef.current = emptyDragState()
    }
  }, [canvasRef, dragRef, hoveredRef, lastHoverIdRef, setHoverCardId])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.96 : 1.04
      zoomRef.current = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * delta))
    },
    [zoomRef],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [canvasRef, handleWheel])

  return { handleMouseDown, handleMouseLeave, handleMouseMove, handleMouseUp }
}

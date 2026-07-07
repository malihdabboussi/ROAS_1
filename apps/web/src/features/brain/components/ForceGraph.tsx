'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import type { BrainConnection, BrainMemory } from '../types'
import { BrainGraphHoverPeek } from './BrainGraphHoverPeek'
import {
  ALPHA_INITIAL,
  ALPHA_MIN,
  DEFAULT_VIEW_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
} from './force-graph.constants'
import { viewportFitFromNodes } from './force-graph-helpers'
import { buildForceGraphSimulation } from './force-graph-data'
import { organizeForceGraphNodes } from './force-graph-layouts'
import { applyForceGraphPhysics } from './force-graph-physics'
import { useForceGraphPointerController } from './force-graph-pointer'
import {
  drawForceGraphFrame,
  type ForceGraphMonoSpotCache,
} from './force-graph-renderer'
import type {
  ForceGraphDragState,
  ForceGraphHandle,
  OrganizeLayout,
  SimEdge,
  SimNode,
} from './force-graph.types'
export type { ForceGraphHandle, OrganizeLayout } from './force-graph.types'

// ============================================================================
// Props
// ============================================================================

interface ForceGraphProps {
  nodes: BrainMemory[]
  connections: BrainConnection[]
  selectedNodeId: string | null
  searchQuery: string
  onNodeClick: (node: BrainMemory | null) => void
  /** When true, nodes (and edges) render white/light monochrome instead of type colors. */
  nodesMonochrome?: boolean
  /** Scopes zoom/pan persistence per brain scope. */
  viewportKey?: string
  className?: string
}

// ============================================================================
// Component
// ============================================================================

const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(function ForceGraph(
  {
    nodes,
    connections,
    selectedNodeId,
    searchQuery,
    onNodeClick,
    nodesMonochrome = false,
    viewportKey,
    className,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<SimEdge[]>([])
  const animRef = useRef<number>(0)
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(DEFAULT_VIEW_ZOOM)
  const dragRef = useRef<ForceGraphDragState>({
    node: null,
    startX: 0,
    startY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
  })
  const hoveredRef = useRef<SimNode | null>(null)
  /** 0→1 smoothed spotlight intensity (monochrome mode). */
  const monoGlowRef = useRef(0)
  /** Subgraph + center cached while fading out after hover end. */
  const monoSpotCacheRef = useRef<ForceGraphMonoSpotCache | null>(null)
  const hoverCardRef = useRef<HTMLDivElement>(null)
  const lastHoverIdRef = useRef<string | null>(null)
  const [hoverCardId, setHoverCardId] = useState<string | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const alphaRef = useRef(ALPHA_INITIAL)
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map())

  const storageKey = getOrgScopedKey(
    viewportKey ? `vibey-brain-positions-${viewportKey}` : 'vibey-brain-positions',
  )
  const viewportKeyRef = useRef(viewportKey)
  const pendingFitRef = useRef(false)
  const prevNodeCountRef = useRef(0)

  const applyViewportFit = useCallback((): boolean => {
    const fit = viewportFitFromNodes(nodesRef.current, sizeRef.current)
    if (!fit) return false
    zoomRef.current = fit.zoom
    panRef.current = fit.pan
    return true
  }, [])

  const savePositions = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    for (const n of nodesRef.current) positions[n.id] = { x: n.x, y: n.y }
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ positions, zoom: zoomRef.current, pan: panRef.current }),
      )
    } catch {}
  }, [storageKey])

  const loadPositions = useCallback((): Record<string, { x: number; y: number }> | null => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed.positions ?? null
    } catch {
      return null
    }
  }, [storageKey])

  useEffect(() => {
    if (viewportKeyRef.current === viewportKey) return
    viewportKeyRef.current = viewportKey
    zoomRef.current = DEFAULT_VIEW_ZOOM
    panRef.current = { x: 0, y: 0 }
    pendingFitRef.current = true
    prevNodeCountRef.current = 0
  }, [viewportKey])

  // -----------------------------------------------------------------------
  // Convert flat data → simulation nodes / edges
  // -----------------------------------------------------------------------
  useEffect(() => {
    const saved = loadPositions()
    const {
      edges: simEdges,
      nodeMap,
      nodes: simNodes,
    } = buildForceGraphSimulation({
      connections,
      existingNodes: nodesRef.current,
      now: Date.now(),
      nodes,
      savedPositions: saved,
    })

    nodesRef.current = simNodes
    edgesRef.current = simEdges
    nodeMapRef.current = nodeMap
    alphaRef.current = ALPHA_INITIAL
    hoveredRef.current = null
    lastHoverIdRef.current = null
    setHoverCardId(null)
    monoGlowRef.current = 0
    monoSpotCacheRef.current = null

    if (simNodes.length > 0) {
      const prevCount = prevNodeCountRef.current
      const grewMeaningfully =
        prevCount === 0 || simNodes.length >= prevCount + Math.max(10, Math.floor(prevCount * 0.05))
      if (pendingFitRef.current || grewMeaningfully) {
        pendingFitRef.current = true
      }
      prevNodeCountRef.current = simNodes.length
    } else {
      prevNodeCountRef.current = 0
    }
  }, [nodes, connections, loadPositions, viewportKey])

  // -----------------------------------------------------------------------
  // Search highlighting
  // -----------------------------------------------------------------------
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim()
    nodesRef.current.forEach((n) => {
      n.highlighted = q.length > 0 && n.label.toLowerCase().includes(q)
    })
  }, [searchQuery])

  const { handleMouseDown, handleMouseLeave, handleMouseMove, handleMouseUp } =
    useForceGraphPointerController({
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
    })

  // -----------------------------------------------------------------------
  // Force simulation + render loop
  // -----------------------------------------------------------------------
  const tick = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const simNodes = nodesRef.current
    const simEdges = edgesRef.current
    const w = canvas.width
    const h = canvas.height
    sizeRef.current = { w, h }

    // --- Forces (scaled by alpha — decays to zero so simulation settles) ---
    const alpha = alphaRef.current
    if (alpha > ALPHA_MIN) {
      alphaRef.current = applyForceGraphPhysics({
        alpha,
        edges: simEdges,
        nodeMap: nodeMapRef.current,
        nodes: simNodes,
      })
    }

    if (
      pendingFitRef.current &&
      alphaRef.current <= ALPHA_MIN &&
      simNodes.length > 0 &&
      sizeRef.current.w > 0 &&
      sizeRef.current.h > 0
    ) {
      if (applyViewportFit()) pendingFitRef.current = false
    }

    const cx = w / 2
    const cy = h / 2
    const zoom = zoomRef.current
    const pan = panRef.current
    const renderState = drawForceGraphFrame({
      ctx,
      edges: simEdges,
      height: h,
      hoveredNodeId: hoveredRef.current?.id ?? null,
      monoGlow: monoGlowRef.current,
      monoSpotCache: monoSpotCacheRef.current,
      nodeMap: nodeMapRef.current,
      nodes: simNodes,
      nodesMonochrome,
      pan,
      selectedNodeId,
      width: w,
      zoom,
    })
    monoGlowRef.current = renderState.monoGlow
    monoSpotCacheRef.current = renderState.monoSpotCache

    const cardEl = hoverCardRef.current
    if (cardEl) {
      const draggingNode = dragRef.current.node !== null
      const panning = dragRef.current.isPanning
      const hn = hoveredRef.current
      if (!hn || draggingNode || panning) {
        cardEl.style.display = 'none'
      } else {
        const gapWorld = 10 / zoom
        const anchorWorldY = hn.y - hn.radius - gapWorld
        const tsx = cx + pan.x + hn.x * zoom
        const tsy = cy + pan.y + anchorWorldY * zoom
        cardEl.style.display = 'block'
        cardEl.style.left = `${tsx}px`
        cardEl.style.top = `${tsy}px`
      }
    }

    animRef.current = requestAnimationFrame(tick)
  }, [applyViewportFit, selectedNodeId, nodesMonochrome])

  // -----------------------------------------------------------------------
  // Resize observer
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      // Store logical size
      sizeRef.current = { w: rect.width, h: rect.height }
      // Fix: reset canvas width/height to logical for the render loop
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)

    animRef.current = requestAnimationFrame(tick)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(animRef.current)
    }
  }, [tick, applyViewportFit])

  // -----------------------------------------------------------------------
  // Imperative handle for parent controls
  // -----------------------------------------------------------------------
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      zoomRef.current = Math.min(MAX_ZOOM, zoomRef.current * 1.3)
    },
    zoomOut: () => {
      zoomRef.current = Math.max(MIN_ZOOM, zoomRef.current * 0.7)
    },
    fit: () => {
      applyViewportFit()
    },
    center: () => {
      panRef.current = { x: 0, y: 0 }
    },
    organize: (layout: OrganizeLayout = 'type') => {
      organizeForceGraphNodes(nodesRef.current, layout)
      applyViewportFit()
      alphaRef.current = 0
      savePositions()
    },
  }))

  const hoverMemory =
    hoverCardId !== null ? (nodes.find((m) => m.id === hoverCardId) ?? null) : null

  return (
    <div
      className={
        className ? `relative h-full min-h-0 w-full ${className}` : 'relative h-full min-h-0 w-full'
      }
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <div
        ref={hoverCardRef}
        className="pointer-events-none absolute left-0 top-0 z-20"
        style={{ display: 'none', transform: 'translate(-50%, -100%)' }}
        aria-hidden={hoverMemory ? undefined : true}
      >
        {hoverMemory ? <BrainGraphHoverPeek memory={hoverMemory} /> : null}
      </div>
    </div>
  )
})

export default ForceGraph

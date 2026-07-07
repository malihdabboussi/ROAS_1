'use client'

/**
 * 1:1 port of apps/web/src/features/brain/components/ForceGraph.tsx — marketing uses fixed localStorage key.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { BrainConnection, BrainMemory } from './types'
import {
  ENTRY_TYPE_COLORS,
  MEMORY_TYPE_COLORS,
  RELATIONSHIP_COLORS,
  SNAPSHOT_TYPE_COLORS,
} from './types'

const STORAGE_KEY = 'vibey-website-brain-mock-positions-v5'

const MIN_ZOOM = 0.15
const MAX_ZOOM = 4

interface SimNode {
  id: string
  x: number
  y: number
  radius: number
  color: string
  colorRgb: string
  label: string
  nodeType: 'memory' | 'experience' | 'snapshot' | 'sk_entry' | 'sk_source'
  memoryType: string
  mediaType?: BrainMemory['media_type']
  snapshotType?: string
  significance: number
  createdAt: string
  memory: BrainMemory
  highlighted: boolean
  isNew: boolean
  entranceOpacity: number // Added for staggered entrance
}

interface SimEdge {
  source: string
  target: string
  color: string
  colorRgb: string
  strength: number
  type: string
}

function resolveRgb(varName: string): string {
  if (typeof document === 'undefined') return '100, 116, 139'
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return val || '100, 116, 139'
}

function getNodeColor(memory: BrainMemory): string {
  if (memory.node_type === 'snapshot' && memory.snapshot_type) {
    return SNAPSHOT_TYPE_COLORS[memory.snapshot_type] ?? '--brain-snapshot-rgb'
  }
  if (memory.node_type === 'sk_entry' && memory.entry_type) {
    return ENTRY_TYPE_COLORS[memory.entry_type] ?? '--brain-fact-rgb'
  }
  if (memory.node_type === 'sk_source') {
    return '--brain-document-rgb'
  }
  return MEMORY_TYPE_COLORS[memory.memory_type] ?? '--brain-conn-related-to-rgb'
}

function getNodeRadius(significance: number): number {
  return 3 + significance * 4
}

function getAgeOpacity(createdAt: string): number {
  const age = Date.now() - new Date(createdAt).getTime()
  const days = age / (1000 * 60 * 60 * 24)
  if (days < 1) return 1.0
  if (days < 7) return 0.9
  if (days < 30) return 0.7
  if (days < 90) return 0.5
  return 0.4
}

function truncateLabel(text: string, maxLen = 24): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const px = x + r * Math.cos(angle)
    const py = y + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const w = r * 2
  const h = r * 2
  const rx = 4
  const left = x - w / 2
  const top = y - h / 2
  ctx.beginPath()
  ctx.moveTo(left + rx, top)
  ctx.lineTo(left + w - rx, top)
  ctx.quadraticCurveTo(left + w, top, left + w, top + rx)
  ctx.lineTo(left + w, top + h - rx)
  ctx.quadraticCurveTo(left + w, top + h, left + w - rx, top + h)
  ctx.lineTo(left + rx, top + h)
  ctx.quadraticCurveTo(left, top + h, left, top + h - rx)
  ctx.lineTo(left, top + rx)
  ctx.quadraticCurveTo(left, top, left + rx, top)
  ctx.closePath()
}

export interface ForceGraphHandle {
  fit: () => void
  center: () => void
  organize: () => void
}

interface ForceGraphProps {
  nodes: BrainMemory[]
  connections: BrainConnection[]
  selectedNodeId: string | null
  searchQuery: string
  onNodeClick: (node: BrainMemory | null) => void
  className?: string
  animateEntrance?: boolean
  /** Delay before first entrance batch (ms). Only used when animateEntrance is true. */
  entranceStartDelayMs?: number
  /** Delay between each entrance batch (ms). Only used when animateEntrance is true. */
  entranceBatchDelayMs?: number
  /** Fired once after the last node batch is revealed. */
  onEntranceComplete?: () => void
  /** Match marketing site theme: light canvas on light shell, dark on dark. */
  appearance?: 'dark' | 'light'
}

const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(function ForceGraph(
  {
    nodes,
    connections,
    selectedNodeId,
    searchQuery,
    onNodeClick,
    className,
    animateEntrance = false,
    entranceStartDelayMs = 300,
    entranceBatchDelayMs = 30,
    onEntranceComplete,
    appearance = 'dark',
  },
  ref,
) {
  const onEntranceCompleteRef = useRef(onEntranceComplete)
  onEntranceCompleteRef.current = onEntranceComplete

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<SimEdge[]>([])
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const dragRef = useRef<{
    active: boolean
    node: SimNode | null
    startX: number
    startY: number
  }>({ active: false, node: null, startX: 0, startY: 0 })
  const hoveredRef = useRef<SimNode | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const didInitialOrganizeRef = useRef(false)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const simNodes = nodesRef.current
    const simEdges = edgesRef.current
    const { w, h } = sizeRef.current
    if (w === 0 || h === 0) return

    const cx = w / 2
    const cy = h / 2
    const zoom = zoomRef.current
    const pan = panRef.current

    const isLight = appearance === 'light'

    // Clear with solid background for performance
    ctx.fillStyle = isLight ? '#faf9f6' : '#161616'
    ctx.fillRect(0, 0, w, h)

    const dotSpacing = 30
    const dotRadius = 0.8
    const step = dotSpacing * zoom
    const offsetX = ((pan.x % step) + step) % step
    const offsetY = ((pan.y % step) + step) % step
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.07)' : 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let gx = offsetX; gx < w; gx += step) {
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, h)
    }
    for (let gy = offsetY; gy < h; gy += step) {
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
    }
    ctx.stroke()

    ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.08)'
    for (let gx = offsetX; gx < w; gx += step) {
      for (let gy = offsetY; gy < h; gy += step) {
        ctx.beginPath()
        ctx.arc(gx, gy, dotRadius * zoom, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.save()
    ctx.translate(cx + pan.x, cy + pan.y)
    ctx.scale(zoom, zoom)

    // Optimization: Path2D or batching if possible, but for static mock this is okay
    for (const edge of simEdges) {
      const a = simNodes.find((n) => n.id === edge.source)
      const b = simNodes.find((n) => n.id === edge.target)
      if (!a || !b) continue

      const edgeOpacity = Math.min(a.entranceOpacity, b.entranceOpacity)
      if (edgeOpacity <= 0) continue

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = `rgba(${edge.colorRgb}, ${0.35 * edge.strength * edgeOpacity})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    for (const n of simNodes) {
      if (n.entranceOpacity <= 0) continue
      const ageAlpha = getAgeOpacity(n.createdAt)
      const isSelected = n.id === selectedNodeId
      const isHighlighted = n.highlighted

      const rgb = n.colorRgb
      const fillAlpha = (isHighlighted ? 0.75 : 0.45 * ageAlpha) * n.entranceOpacity
      const glowAlpha = (isHighlighted ? 0.9 : n.isNew ? 0.7 : 0.5) * n.entranceOpacity
      const strokeAlpha = 0.35 * n.entranceOpacity
      const borderAlpha = 0.6 * n.entranceOpacity

      const drawShape = () => {
        if (n.nodeType === 'snapshot') drawDiamond(ctx, n.x, n.y, n.radius)
        else if (n.nodeType === 'experience' || n.nodeType === 'sk_source')
          drawHexagon(ctx, n.x, n.y, n.radius)
        else drawRoundedRect(ctx, n.x, n.y, n.radius)
      }

      if (isSelected || isHighlighted) {
        ctx.save()
        ctx.shadowColor = `rgba(${rgb}, ${glowAlpha})`
        ctx.shadowBlur = isSelected ? 22 : 18
        ctx.globalAlpha = fillAlpha
        ctx.fillStyle = `rgba(${rgb}, 1)`
        drawShape()
        ctx.fill()
        ctx.restore()
      }

      ctx.save()
      ctx.globalAlpha = fillAlpha
      ctx.fillStyle = `rgba(${rgb}, 0.55)`
      drawShape()
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = strokeAlpha
      ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1.2
      drawShape()
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = borderAlpha
      ctx.strokeStyle = `rgba(${rgb}, 0.7)`
      ctx.lineWidth = 0.8
      drawShape()
      ctx.stroke()
      ctx.restore()

      if (n.mediaType && n.mediaType !== 'text') {
        const badge =
          n.mediaType === 'image'
            ? 'I'
            : n.mediaType === 'audio'
              ? 'A'
              : n.mediaType === 'video'
                ? 'V'
                : n.mediaType === 'pdf'
                  ? 'P'
                  : 'M'
        ctx.save()
        ctx.globalAlpha = 0.95 * n.entranceOpacity
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15,15,20,0.9)'
        ctx.beginPath()
        ctx.arc(n.x + n.radius * 0.85, n.y - n.radius * 0.85, 4.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.2)' : 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 0.8
        ctx.stroke()
        ctx.fillStyle = isLight ? '#1a1a1a' : 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 6px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(badge, n.x + n.radius * 0.85, n.y - n.radius * 0.85 + 0.2)
        ctx.restore()
      }
    }

    ctx.restore()
  }, [selectedNodeId, appearance])

  const savePositions = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    for (const n of nodesRef.current) positions[n.id] = { x: n.x, y: n.y }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ positions, zoom: zoomRef.current, pan: panRef.current }),
      )
    } catch {}
  }, [])

  const applyOrganizedLayout = useCallback(() => {
    const simNodes = nodesRef.current
    if (simNodes.length === 0) return

    const typeGroups: Record<string, SimNode[]> = {}
    for (const n of simNodes) {
      const key =
        n.nodeType === 'snapshot'
          ? `snap_${n.snapshotType ?? 'snapshot'}`
          : n.nodeType === 'experience' || n.nodeType === 'sk_source'
            ? 'experience'
            : n.nodeType === 'sk_entry'
              ? `sk_${(n.memory as BrainMemory).entry_type ?? 'concept'}`
              : n.memoryType
      if (!typeGroups[key]) typeGroups[key] = []
      typeGroups[key]!.push(n)
    }

    const groupKeys = Object.keys(typeGroups)
    const count = groupKeys.length
    const totalNodes = simNodes.length
    const orbitRadius = Math.max(300, Math.sqrt(totalNodes) * 30)

    groupKeys.forEach((key, gi) => {
      const angle = (2 * Math.PI * gi) / count - Math.PI / 2
      const cx = orbitRadius * Math.cos(angle)
      const cy = orbitRadius * Math.sin(angle)
      const members = typeGroups[key] ?? []
      const spiralSpacing = 22
      members.forEach((n, mi) => {
        const r = spiralSpacing * Math.sqrt(mi)
        const a = mi * 2.4
        n.x = cx + r * Math.cos(a)
        n.y = cy + r * Math.sin(a)
      })
    })

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    for (const n of simNodes) {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y)
    }
    const bw = maxX - minX || 1
    const bh = maxY - minY || 1
    const { w, h } = sizeRef.current
    const scale = Math.min((w - 100) / bw, (h - 100) / bh, MAX_ZOOM)
    zoomRef.current = Math.max(MIN_ZOOM, scale)
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    panRef.current = { x: -midX * zoomRef.current, y: -midY * zoomRef.current }
    draw()
  }, [draw])

  const tryInitialOrganize = useCallback(() => {
    if (didInitialOrganizeRef.current) return
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!parent) return
    const r = parent.getBoundingClientRect()
    if (r.width < 10 || r.height < 10) return
    if (nodesRef.current.length === 0) return
    didInitialOrganizeRef.current = true
    sizeRef.current = { w: r.width, h: r.height }
    applyOrganizedLayout()
    savePositions()
  }, [applyOrganizedLayout, savePositions])

  useEffect(() => {
    const nodeMap = new Map<string, SimNode>()
    const simNodes: SimNode[] = nodes.map((m) => {
      const existing = nodesRef.current.find((n) => n.id === m.id)
      const color = getNodeColor(m)
      const node: SimNode = {
        id: m.id,
        x: existing?.x ?? (Math.random() - 0.5) * 400,
        y: existing?.y ?? (Math.random() - 0.5) * 400,
        radius: getNodeRadius(m.significance),
        color,
        colorRgb: resolveRgb(color),
        label: truncateLabel(m.content || m.name || 'Untitled'),
        nodeType: m.node_type ?? 'memory',
        memoryType: m.memory_type,
        mediaType: m.media_type,
        snapshotType: m.snapshot_type,
        significance: m.significance,
        createdAt: m.created_at,
        memory: m,
        highlighted: false,
        isNew: Date.now() - new Date(m.created_at).getTime() < 86400000,
        entranceOpacity: animateEntrance ? 0 : 1,
      }
      nodeMap.set(m.id, node)
      return node
    })

    const simEdges: SimEdge[] = connections
      .filter((c) => nodeMap.has(c.source_memory_id) && nodeMap.has(c.target_memory_id))
      .map((c) => {
        const color = RELATIONSHIP_COLORS[c.relationship_type] ?? '#64748B'
        return {
          source: c.source_memory_id,
          target: c.target_memory_id,
          color,
          colorRgb: color.startsWith('--') ? resolveRgb(color) : '100, 116, 139',
          strength: c.strength,
          type: c.relationship_type,
        }
      })

    nodesRef.current = simNodes
    edgesRef.current = simEdges
    tryInitialOrganize()
    draw()

    // Staggered entrance logic
    if (animateEntrance) {
      let cancelled = false
      const batchSize = 20
      const totalNodes = simNodes.length

      const animateBatch = (startIndex: number) => {
        if (cancelled || startIndex >= totalNodes) return

        const endIndex = Math.min(startIndex + batchSize, totalNodes)
        for (let i = startIndex; i < endIndex; i++) {
          simNodes[i].entranceOpacity = 1
        }

        draw()
        if (endIndex >= totalNodes) {
          onEntranceCompleteRef.current?.()
          return
        }
        setTimeout(() => animateBatch(endIndex), entranceBatchDelayMs)
      }

      setTimeout(() => animateBatch(0), entranceStartDelayMs)
      return () => {
        cancelled = true
      }
    }
  }, [
    nodes,
    connections,
    tryInitialOrganize,
    draw,
    animateEntrance,
    entranceStartDelayMs,
    entranceBatchDelayMs,
  ])

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim()
    nodesRef.current.forEach((n) => {
      n.highlighted = q.length > 0 && n.label.toLowerCase().includes(q)
    })
    draw()
  }, [searchQuery, draw])

  const screenToWorld = useCallback((sx: number, sy: number): [number, number] => {
    const cx = sizeRef.current.w / 2
    const cy = sizeRef.current.h / 2
    const wx = (sx - cx - panRef.current.x) / zoomRef.current
    const wy = (sy - cy - panRef.current.y) / zoomRef.current
    return [wx, wy]
  }, [])

  const findNodeAt = useCallback(
    (sx: number, sy: number): SimNode | null => {
      const [wx, wy] = screenToWorld(sx, sy)
      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const n = nodesRef.current[i]
        if (!n) continue
        const dx = wx - n.x
        const dy = wy - n.y
        if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n
      }
      return null
    },
    [screenToWorld],
  )

  const tick = useCallback(() => {
    draw()
  }, [draw])

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
      sizeRef.current = { w: rect.width, h: rect.height }
      draw()
    }

    resize()
    tryInitialOrganize()
    const ro = new ResizeObserver(() => {
      resize()
      tryInitialOrganize()
    })
    ro.observe(canvas.parentElement!)

    draw()
    return () => {
      ro.disconnect()
    }
  }, [draw, tryInitialOrganize])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      dragRef.current = {
        active: true,
        node: findNodeAt(sx, sy),
        startX: sx,
        startY: sy,
      }
    },
    [findNodeAt],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (!dragRef.current.active) {
        const node = findNodeAt(sx, sy)
        hoveredRef.current = node
        if (canvasRef.current) {
          canvasRef.current.style.cursor = node ? 'pointer' : 'default'
        }
      }
    },
    [findNodeAt],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (drag.active) {
        const dx = sx - drag.startX
        const dy = sy - drag.startY
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
          if (drag.node) onNodeClick(drag.node.memory)
          else onNodeClick(null)
          draw()
        }
      }

      dragRef.current = { active: false, node: null, startX: 0, startY: 0 }
    },
    [onNodeClick],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    draw()
  }, [draw])

  useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        const nodes = nodesRef.current
        if (nodes.length === 0) return
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity
        for (const n of nodes) {
          minX = Math.min(minX, n.x - n.radius)
          maxX = Math.max(maxX, n.x + n.radius)
          minY = Math.min(minY, n.y - n.radius)
          maxY = Math.max(maxY, n.y + n.radius)
        }
        const bw = maxX - minX || 1
        const bh = maxY - minY || 1
        const { w, h } = sizeRef.current
        const padding = 80
        const scale = Math.min((w - padding) / bw, (h - padding) / bh, MAX_ZOOM)
        zoomRef.current = Math.max(MIN_ZOOM, scale)
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        panRef.current = { x: -cx * zoomRef.current, y: -cy * zoomRef.current }
      },
      center: () => {
        panRef.current = { x: 0, y: 0 }
        draw()
      },
      organize: () => {
        applyOrganizedLayout()
        savePositions()
      },
    }),
    [applyOrganizedLayout, savePositions, draw],
  )

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        hoveredRef.current = null
        dragRef.current = { active: false, node: null, startX: 0, startY: 0 }
      }}
    />
  )
})

export default ForceGraph

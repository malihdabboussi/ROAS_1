import { isCompanyCognitionObjectType } from '../types'
import { MONO_GLOW_FALL, MONO_GLOW_RISE } from './force-graph.constants'
import {
  lerpRgbTriple,
  monoGlowEase,
  resolveGraphRenderPalette,
} from './force-graph-helpers'
import { drawDiamond, drawHexagon, drawRoundedRect } from './force-graph-shapes'
import type { SimEdge, SimNode } from './force-graph.types'

export interface ForceGraphMonoSpotCache {
  centerId: string
  ids: Set<string>
}

export function drawForceGraphFrame({
  ctx,
  edges,
  height,
  hoveredNodeId,
  monoGlow,
  monoSpotCache,
  nodeMap,
  nodes,
  nodesMonochrome,
  nowMs = Date.now(),
  pan,
  selectedNodeId,
  width,
  zoom,
}: {
  ctx: CanvasRenderingContext2D
  edges: SimEdge[]
  height: number
  hoveredNodeId: string | null
  monoGlow: number
  monoSpotCache: ForceGraphMonoSpotCache | null
  nodeMap: Map<string, SimNode>
  nodes: SimNode[]
  nodesMonochrome: boolean
  nowMs?: number
  pan: { x: number; y: number }
  selectedNodeId: string | null
  width: number
  zoom: number
}): { monoGlow: number; monoSpotCache: ForceGraphMonoSpotCache | null } {
  const cx = width / 2
  const cy = height / 2
  const renderPalette = resolveGraphRenderPalette()
  const monoNodeRgb = renderPalette.monoNodeRgb

  ctx.clearRect(0, 0, width, height)

  const dotSpacing = 30
  const step = dotSpacing * zoom
  if (step >= 8) {
    const dotRadius = 0.8
    const offsetX = ((pan.x % step) + step) % step
    const offsetY = ((pan.y % step) + step) % step
    ctx.strokeStyle = `rgba(${renderPalette.gridRgb}, ${renderPalette.gridLineAlpha})`
    ctx.lineWidth = 0.5
    for (let gx = offsetX; gx < width; gx += step) {
      ctx.beginPath()
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, height)
      ctx.stroke()
    }
    for (let gy = offsetY; gy < height; gy += step) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(width, gy)
      ctx.stroke()
    }
    ctx.fillStyle = `rgba(${renderPalette.gridRgb}, ${renderPalette.gridDotAlpha})`
    for (let gx = offsetX; gx < width; gx += step) {
      for (let gy = offsetY; gy < height; gy += step) {
        ctx.beginPath()
        ctx.arc(gx, gy, dotRadius * zoom, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  ctx.save()
  ctx.translate(cx + pan.x, cy + pan.y)
  ctx.scale(zoom, zoom)

  const cullPad = 20
  const viewLeft = (-pan.x - cx) / zoom - cullPad
  const viewTop = (-pan.y - cy) / zoom - cullPad
  const viewRight = (width - cx - pan.x) / zoom + cullPad
  const viewBottom = (height - cy - pan.y) / zoom + cullPad

  let nextMonoGlow = monoGlow
  let nextMonoSpotCache = monoSpotCache
  let monoSpot = nextMonoSpotCache

  if (!nodesMonochrome) {
    nextMonoGlow = 0
    nextMonoSpotCache = null
    monoSpot = null
  } else {
    const lockedCenterId =
      selectedNodeId != null && nodeMap.has(selectedNodeId) ? selectedNodeId : null
    const spotlightId = lockedCenterId ?? hoveredNodeId
    if (spotlightId != null) {
      const ids = new Set<string>([spotlightId])
      for (const edge of edges) {
        if (edge.source === spotlightId || edge.target === spotlightId) {
          ids.add(edge.source)
          ids.add(edge.target)
        }
      }
      nextMonoSpotCache = { centerId: spotlightId, ids }
      monoSpot = nextMonoSpotCache
      if (lockedCenterId != null) {
        nextMonoGlow = 1
      } else {
        nextMonoGlow += (1 - nextMonoGlow) * MONO_GLOW_RISE
      }
    } else {
      nextMonoGlow += (0 - nextMonoGlow) * MONO_GLOW_FALL
      if (nextMonoGlow < 0.012) {
        nextMonoGlow = 0
        nextMonoSpotCache = null
        monoSpot = null
      }
    }
  }

  const monoGlowCurve = monoGlowEase(nextMonoGlow)
  const monoActiveNodeIds = monoSpot?.ids ?? null
  const monoCenterId = monoSpot?.centerId ?? null

  const strokeEdgeIfVisible = (
    edge: SimEdge,
    strokeRgb: string,
    strokeAlpha: number,
    lineWidthWorld: number,
  ) => {
    const a = nodeMap.get(edge.source)
    const b = nodeMap.get(edge.target)
    if (!a || !b) return
    if (
      (a.x < viewLeft && b.x < viewLeft) ||
      (a.x > viewRight && b.x > viewRight) ||
      (a.y < viewTop && b.y < viewTop) ||
      (a.y > viewBottom && b.y > viewBottom)
    )
      return
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.lineWidth = lineWidthWorld
    ctx.strokeStyle = `rgba(${strokeRgb}, ${strokeAlpha})`
    ctx.stroke()
  }

  if (nodesMonochrome && monoCenterId != null && monoGlowCurve > 0.001) {
    const dimMul = 1 - 0.48 * monoGlowCurve
    for (const edge of edges) {
      const incident = edge.source === monoCenterId || edge.target === monoCenterId
      if (incident) continue
      strokeEdgeIfVisible(edge, monoNodeRgb, (0.14 * edge.strength + 0.06) * dimMul, 1.5)
    }
    for (const edge of edges) {
      const incident = edge.source === monoCenterId || edge.target === monoCenterId
      if (!incident) continue
      const vis = monoGlowCurve * (0.55 + 0.45 * edge.strength)
      strokeEdgeIfVisible(edge, edge.resolvedRgb, 0.14 * vis, 5 + 9 * vis)
      strokeEdgeIfVisible(edge, edge.resolvedRgb, 0.38 * vis, 2.8 + 2.5 * vis)
      strokeEdgeIfVisible(edge, edge.resolvedRgb, 0.72 * vis, 1.25 + 0.65 * vis)
      strokeEdgeIfVisible(edge, monoNodeRgb, 0.28 * vis, 0.85)
    }
  } else if (nodesMonochrome) {
    for (const edge of edges) {
      strokeEdgeIfVisible(edge, monoNodeRgb, 0.14 * edge.strength + 0.06, 1.5)
    }
  } else {
    for (const edge of edges) {
      const edgeAlpha = Math.min(
        0.74,
        0.35 * edge.strength * renderPalette.edgeAlphaMultiplier + renderPalette.edgeAlphaFloor,
      )
      strokeEdgeIfVisible(edge, edge.resolvedRgb, edgeAlpha, renderPalette.edgeLineWidth)
    }
  }

  for (const n of nodes) {
    if (
      n.x + n.radius < viewLeft ||
      n.x - n.radius > viewRight ||
      n.y + n.radius < viewTop ||
      n.y - n.radius > viewBottom
    )
      continue

    const isSelected = n.id === selectedNodeId
    const isMonoSpot = nodesMonochrome && monoActiveNodeIds != null && monoActiveNodeIds.has(n.id)
    const rgb = !nodesMonochrome
      ? n.resolvedRgb
      : isMonoSpot
        ? lerpRgbTriple(monoNodeRgb, n.resolvedRgb, monoGlowCurve)
        : monoNodeRgb
    const monoShineBoost =
      isMonoSpot && nodesMonochrome
        ? 1 + monoGlowCurve * (n.id === monoCenterId ? 1.28 : 0.92)
        : 1
    const companyObjectType =
      n.nodeType === 'company_object' ? (n.memory.object_type ?? n.memory.memory_type) : null
    const isCognition =
      n.nodeType === 'belief' ||
      n.nodeType === 'perspective' ||
      (n.nodeType === 'company_object' && isCompanyCognitionObjectType(companyObjectType))
    const cognitionFreq =
      n.nodeType === 'perspective' || companyObjectType === 'perspective' ? 0.0016 : 0.0024
    const pulseT = isCognition ? (Math.sin(nowMs * cognitionFreq) + 1) / 2 : 0
    const pulse = isCognition
      ? 0.7 + 0.3 * pulseT
      : isSelected
        ? 0.75 + 0.25 * Math.cos(nowMs * 0.003)
        : 1
    const visibleAgeOpacity = Math.max(n.ageOpacity, renderPalette.nodeAgeOpacityFloor)
    const fillAlpha =
      (n.highlighted ? 0.75 : renderPalette.nodeFillMultiplier * visibleAgeOpacity) *
      pulse *
      monoShineBoost
    const glowAlpha =
      (n.highlighted ? 0.9 : n.isNew ? 0.7 : 0.5) *
      renderPalette.nodeGlowMultiplier *
      pulse *
      monoShineBoost

    const drawShapeAt = (r: number) => {
      if (n.nodeType === 'snapshot') drawDiamond(ctx, n.x, n.y, r)
      else if (
        n.nodeType === 'experience' ||
        n.nodeType === 'sk_source' ||
        n.nodeType === 'company_signal' ||
        n.nodeType === 'knowledge_source'
      )
        drawHexagon(ctx, n.x, n.y, r)
      else if (isCognition) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.closePath()
      } else drawRoundedRect(ctx, n.x, n.y, r)
    }

    if (isCognition) {
      const bodyScale = 0.92 + 0.2 * pulseT
      const haloScale = 1.6 + 1.0 * pulseT
      const haloAlpha =
        renderPalette.cognitionHaloBase +
        renderPalette.cognitionHaloPulse * pulseT +
        (isMonoSpot && nodesMonochrome ? 0.42 * monoGlowCurve : 0)
      const bodyR = n.radius * bodyScale

      ctx.globalAlpha = glowAlpha * haloAlpha
      ctx.fillStyle = `rgba(${rgb}, ${renderPalette.cognitionGlowRgbaAlpha})`
      drawShapeAt(n.radius * haloScale)
      ctx.fill()

      const grad = ctx.createRadialGradient(n.x, n.y, bodyR * 0.1, n.x, n.y, bodyR)
      const gBoost = isMonoSpot && nodesMonochrome ? monoGlowCurve : 0
      grad.addColorStop(
        0,
        `rgba(${rgb}, ${(renderPalette.cognitionGradientInner + 0.06 * gBoost) * pulse})`,
      )
      grad.addColorStop(
        0.55,
        `rgba(${rgb}, ${(renderPalette.cognitionGradientMid + 0.24 * gBoost) * pulse})`,
      )
      grad.addColorStop(
        1,
        `rgba(${rgb}, ${(renderPalette.cognitionGradientOuter + 0.34 * gBoost) * pulse})`,
      )
      ctx.globalAlpha = 1
      ctx.fillStyle = grad
      drawShapeAt(bodyR)
      ctx.fill()

      ctx.globalAlpha =
        (0.7 + 0.3 * pulseT) * (isMonoSpot && nodesMonochrome ? 0.72 + 0.52 * monoGlowCurve : 1)
      ctx.strokeStyle = `rgba(${rgb}, 0.95)`
      ctx.lineWidth =
        (n.nodeType === 'perspective' || companyObjectType === 'perspective' ? 1.8 : 1.4) +
        renderPalette.cognitionRimWidthBoost
      drawShapeAt(bodyR)
      ctx.stroke()
    } else {
      if (isMonoSpot && nodesMonochrome && monoGlowCurve > 0.035) {
        ctx.globalAlpha = glowAlpha * renderPalette.nodeGlowRgbaAlpha * monoGlowCurve
        ctx.fillStyle = `rgba(${rgb}, ${renderPalette.nodeGlowRgbaAlpha})`
        drawShapeAt(n.radius * (2.05 + 1.05 * monoGlowCurve))
        ctx.fill()
      }

      ctx.globalAlpha = glowAlpha * renderPalette.nodeGlowRingAlpha
      ctx.fillStyle = `rgba(${rgb}, ${renderPalette.nodeGlowRgbaAlpha})`
      drawShapeAt(n.radius * 1.6)
      ctx.fill()

      ctx.globalAlpha = fillAlpha
      ctx.fillStyle = `rgba(${rgb}, ${renderPalette.nodeFillRgbaAlpha})`
      drawShapeAt(n.radius)
      ctx.fill()

      ctx.globalAlpha =
        isMonoSpot && nodesMonochrome
          ? 0.52 + 0.44 * monoGlowCurve
          : renderPalette.nodeStrokeAlpha
      ctx.strokeStyle = `rgba(${rgb}, ${renderPalette.nodeStrokeRgbaAlpha})`
      ctx.lineWidth = 1
      drawShapeAt(n.radius)
      ctx.stroke()
    }

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
      ctx.globalAlpha = 0.95
      ctx.fillStyle = 'rgba(15,15,20,0.9)'
      ctx.beginPath()
      ctx.arc(n.x + n.radius * 0.85, n.y - n.radius * 0.85, 4.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 0.8
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 6px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(badge, n.x + n.radius * 0.85, n.y - n.radius * 0.85 + 0.2)
    }
  }

  ctx.restore()

  return { monoGlow: nextMonoGlow, monoSpotCache: nextMonoSpotCache }
}

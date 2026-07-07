import {
  ALPHA_DECAY,
  ALPHA_MIN,
  ATTRACTION,
  CENTER_GRAVITY,
  DAMPING,
  EDGE_LENGTH,
  MAX_VELOCITY,
  REPULSION,
} from './force-graph.constants'
import { isFiniteCoord } from './force-graph-helpers'
import type { SimEdge, SimNode } from './force-graph.types'

export function applyForceGraphPhysics({
  alpha,
  edges,
  nodeMap,
  nodes,
}: {
  alpha: number
  edges: SimEdge[]
  nodeMap: Map<string, SimNode>
  nodes: SimNode[]
}): number {
  if (alpha <= ALPHA_MIN) return alpha

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    if (!a || a.pinned) continue

    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      if (!b) continue
      let dx = a.x - b.x
      let dy = a.y - b.y
      let dist = Math.sqrt(dx * dx + dy * dy) || 1
      if (dist < 1) dist = 1
      const force = (REPULSION / (dist * dist)) * alpha
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx += fx
      a.vy += fy
      if (!b.pinned) {
        b.vx -= fx
        b.vy -= fy
      }
    }

    a.vx -= a.x * CENTER_GRAVITY * alpha
    a.vy -= a.y * CENTER_GRAVITY * alpha
  }

  for (const edge of edges) {
    const a = nodeMap.get(edge.source)
    const b = nodeMap.get(edge.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const displacement = dist - EDGE_LENGTH
    const force = displacement * ATTRACTION * edge.strength * alpha
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    if (!a.pinned) {
      a.vx += fx
      a.vy += fy
    }
    if (!b.pinned) {
      b.vx -= fx
      b.vy -= fy
    }
  }

  for (const n of nodes) {
    if (n.pinned) {
      n.vx = 0
      n.vy = 0
      continue
    }
    n.vx *= DAMPING
    n.vy *= DAMPING
    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy)
    if (speed > MAX_VELOCITY) {
      n.vx = (n.vx / speed) * MAX_VELOCITY
      n.vy = (n.vy / speed) * MAX_VELOCITY
    }
    n.x += n.vx
    n.y += n.vy
    if (!isFiniteCoord(n.x) || !isFiniteCoord(n.y)) {
      n.x = 0
      n.y = 0
      n.vx = 0
      n.vy = 0
    }
  }

  return alpha * (1 - ALPHA_DECAY)
}

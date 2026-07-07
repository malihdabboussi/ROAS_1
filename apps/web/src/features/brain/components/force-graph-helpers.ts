import type { BrainMemory } from '../types'
import {
  BELIEF_PATTERN_COLOR,
  COMPANY_OBJECT_TYPE_COLORS,
  COMPANY_OBJECT_TYPE_LABELS,
  ENTRY_TYPE_COLORS,
  ENTRY_TYPE_LABELS,
  isCompanyCognitionObjectType,
  KNOWLEDGE_SOURCE_TYPE_COLORS,
  knowledgeSourceTypeLabel,
  MEMORY_TYPE_COLORS,
  MEMORY_TYPE_LABELS,
  PERSPECTIVE_COLOR,
  SNAPSHOT_TYPE_COLORS,
} from '../types'
import {
  DARK_GRAPH_RENDER_PALETTE,
  FIT_PADDING,
  FIT_ZOOM_OUT_FACTOR,
  LIGHT_GRAPH_RENDER_PALETTE,
  MAX_ZOOM,
  MIN_ZOOM,
} from './force-graph.constants'
import type { GraphRenderPalette, SimNode } from './force-graph.types'

export function resolveRgb(varName: string): string {
  if (typeof document === 'undefined') return '100, 116, 139'
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return val || '100, 116, 139'
}

export function resolveGraphRenderPalette(): GraphRenderPalette {
  if (typeof document === 'undefined') return DARK_GRAPH_RENDER_PALETTE
  if (document.documentElement.classList.contains('dark')) return DARK_GRAPH_RENDER_PALETTE
  const foregroundRgb = resolveRgb('--color-foreground-rgb')
  return {
    ...LIGHT_GRAPH_RENDER_PALETTE,
    gridRgb: foregroundRgb,
    monoNodeRgb: foregroundRgb,
  }
}

export function monoGlowEase(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x
}

export function lerpRgbTriple(fromRgb: string, toRgb: string, t: number): string {
  const clamp = Math.min(1, Math.max(0, t))
  const pa = fromRgb.split(',').map((s) => Number.parseFloat(s.trim()))
  const pb = toRgb.split(',').map((s) => Number.parseFloat(s.trim()))
  const r = Math.round(pa[0]! + (pb[0]! - pa[0]!) * clamp)
  const g = Math.round(pa[1]! + (pb[1]! - pa[1]!) * clamp)
  const b = Math.round(pa[2]! + (pb[2]! - pa[2]!) * clamp)
  return `${r}, ${g}, ${b}`
}

export function getNodeColor(memory: BrainMemory): string {
  if (memory.node_type === 'knowledge_item' || memory.node_type === 'knowledge_source') {
    const key = (memory.knowledge_source_type ??
      memory.source_type) as keyof typeof KNOWLEDGE_SOURCE_TYPE_COLORS
    return KNOWLEDGE_SOURCE_TYPE_COLORS[key] ?? '--brain-conn-related-to-rgb'
  }
  if (memory.node_type === 'company_object') {
    const key = memory.object_type ?? memory.memory_type
    return COMPANY_OBJECT_TYPE_COLORS[key] ?? '--brain-co-belief-rgb'
  }
  if (memory.node_type === 'company_signal') return '--brain-co-signal-rgb'
  if (memory.node_type === 'belief') return BELIEF_PATTERN_COLOR
  if (memory.node_type === 'perspective') return PERSPECTIVE_COLOR
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

export function getNodeRadius(memory: BrainMemory): number {
  const significance = memory.significance
  const base = 3 + significance * 4
  const nt = memory.node_type ?? 'memory'
  if (nt === 'company_object') {
    const objectType = memory.object_type ?? memory.memory_type
    if (isCompanyCognitionObjectType(objectType)) {
      if (objectType === 'perspective') return base + 6
      return base + 3
    }
    return 2.2 + significance * 2.75
  }
  if (nt === 'company_signal') return 2.5 + significance * 1.5
  if (nt === 'knowledge_source') return base + 1
  if (nt === 'knowledge_item') return 2.4 + significance * 3
  if (nt === 'belief') return base + 3
  if (nt === 'perspective') return base + 6
  if (nt === 'memory' || nt === 'sk_entry') {
    return 2.2 + significance * 2.75
  }
  return base
}

export function truncateLabel(text: string, maxLen = 24): string {
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1)}…`
}

export function truncateHoverBody(text: string | null | undefined, max = 96): string {
  if (!text) return ''
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function nodeKindLabel(m: BrainMemory): string {
  const nt = m.node_type ?? 'memory'
  if (nt === 'company_object') {
    return COMPANY_OBJECT_TYPE_LABELS[m.object_type ?? m.memory_type] ?? 'Company Object'
  }
  if (nt === 'knowledge_item' || nt === 'knowledge_source') {
    return knowledgeSourceTypeLabel(m.knowledge_source_type ?? m.source_type)
  }
  if (nt === 'company_signal') return 'Signal'
  if (nt === 'belief') return 'Belief'
  if (nt === 'perspective') return 'Perspective'
  if (nt === 'snapshot') return m.snapshot_type ?? 'Snapshot'
  if (nt === 'experience') return 'Experience'
  if (nt === 'sk_entry') return ENTRY_TYPE_LABELS[m.entry_type ?? ''] ?? m.entry_type ?? 'Knowledge'
  if (nt === 'sk_source') return 'Source'
  return MEMORY_TYPE_LABELS[m.memory_type] ?? m.memory_type ?? 'Memory'
}

export function isFiniteCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function resolveNodeCoord(
  primary: number | undefined,
  fallback: number | undefined,
  defaultValue: number,
): number {
  if (isFiniteCoord(primary)) return primary
  if (isFiniteCoord(fallback)) return fallback
  return defaultValue
}

export function boundsFromNodes(nodes: SimNode[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} | null {
  if (nodes.length === 0) return null
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let finiteCount = 0
  for (const n of nodes) {
    if (!isFiniteCoord(n.x) || !isFiniteCoord(n.y) || !isFiniteCoord(n.radius)) continue
    finiteCount += 1
    minX = Math.min(minX, n.x - n.radius)
    maxX = Math.max(maxX, n.x + n.radius)
    minY = Math.min(minY, n.y - n.radius)
    maxY = Math.max(maxY, n.y + n.radius)
  }
  if (finiteCount === 0 || !Number.isFinite(minX) || !Number.isFinite(maxX)) return null
  return { minX, maxX, minY, maxY }
}

export function viewportFitFromNodes(
  nodes: SimNode[],
  size: { w: number; h: number },
): { zoom: number; pan: { x: number; y: number } } | null {
  const bounds = boundsFromNodes(nodes)
  if (!bounds || size.w <= 0 || size.h <= 0) return null
  const bw = bounds.maxX - bounds.minX || 1
  const bh = bounds.maxY - bounds.minY || 1
  const scale =
    Math.min((size.w - FIT_PADDING) / bw, (size.h - FIT_PADDING) / bh, MAX_ZOOM) *
    FIT_ZOOM_OUT_FACTOR
  const zoom = Math.max(MIN_ZOOM, scale)
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const pan = { x: -cx * zoom, y: -cy * zoom }
  if (!Number.isFinite(zoom) || !Number.isFinite(pan.x) || !Number.isFinite(pan.y)) return null
  return { zoom, pan }
}

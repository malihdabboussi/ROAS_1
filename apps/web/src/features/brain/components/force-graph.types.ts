import type { BrainMemory } from '../types'

export interface GraphRenderPalette {
  gridRgb: string
  gridLineAlpha: number
  gridDotAlpha: number
  monoNodeRgb: string
  edgeAlphaMultiplier: number
  edgeAlphaFloor: number
  edgeLineWidth: number
  nodeAgeOpacityFloor: number
  nodeFillMultiplier: number
  nodeFillRgbaAlpha: number
  nodeGlowMultiplier: number
  nodeGlowRgbaAlpha: number
  nodeGlowRingAlpha: number
  nodeStrokeAlpha: number
  nodeStrokeRgbaAlpha: number
  cognitionHaloBase: number
  cognitionHaloPulse: number
  cognitionGlowRgbaAlpha: number
  cognitionGradientInner: number
  cognitionGradientMid: number
  cognitionGradientOuter: number
  cognitionRimWidthBoost: number
}

export interface SimNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  resolvedRgb: string
  label: string
  nodeType:
    | 'memory'
    | 'experience'
    | 'snapshot'
    | 'sk_entry'
    | 'sk_source'
    | 'belief'
    | 'perspective'
    | 'company_object'
    | 'company_signal'
    | 'knowledge_item'
    | 'knowledge_source'
  memoryType: string
  mediaType?: BrainMemory['media_type']
  snapshotType?: string
  significance: number
  createdAt: string
  ageOpacity: number
  isNew: boolean
  memory: BrainMemory
  highlighted: boolean
  pinned: boolean
}

export interface SimEdge {
  source: string
  target: string
  color: string
  resolvedRgb: string
  strength: number
  type: string
}

export interface ForceGraphDragState {
  node: SimNode | null
  startX: number
  startY: number
  isPanning: boolean
  panStartX: number
  panStartY: number
}

export type OrganizeLayout = 'type' | 'time' | 'significance' | 'cognition' | 'domain'

export interface ForceGraphHandle {
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  center: () => void
  organize: (layout?: OrganizeLayout) => void
}

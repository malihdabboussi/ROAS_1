import type { GraphRenderPalette } from './force-graph.types'

export const REPULSION = 800
export const ATTRACTION = 0.003
export const CENTER_GRAVITY = 0.0003
export const DAMPING = 0.7
export const MAX_VELOCITY = 4
export const ALPHA_DECAY = 0.03
export const ALPHA_MIN = 0.001
export const ALPHA_INITIAL = 1
export const EDGE_LENGTH = 120
export const MIN_ZOOM = 0.15
export const MAX_ZOOM = 4
export const FIT_PADDING = 140
export const FIT_ZOOM_OUT_FACTOR = 0.58
export const DEFAULT_VIEW_ZOOM = 0.42
export const MONO_GLOW_RISE = 0.034
export const MONO_GLOW_FALL = 0.038

export const WHITE_NODE_RGB = '255, 255, 255'

export const DARK_GRAPH_RENDER_PALETTE: GraphRenderPalette = {
  gridRgb: WHITE_NODE_RGB,
  gridLineAlpha: 0.03,
  gridDotAlpha: 0.08,
  monoNodeRgb: WHITE_NODE_RGB,
  edgeAlphaMultiplier: 1,
  edgeAlphaFloor: 0,
  edgeLineWidth: 1.5,
  nodeAgeOpacityFloor: 0,
  nodeFillMultiplier: 0.45,
  nodeFillRgbaAlpha: 0.6,
  nodeGlowMultiplier: 1,
  nodeGlowRgbaAlpha: 0.5,
  nodeGlowRingAlpha: 0.3,
  nodeStrokeAlpha: 0.5,
  nodeStrokeRgbaAlpha: 0.7,
  cognitionHaloBase: 0.18,
  cognitionHaloPulse: 0.32,
  cognitionGlowRgbaAlpha: 0.6,
  cognitionGradientInner: 0.95,
  cognitionGradientMid: 0.6,
  cognitionGradientOuter: 0.2,
  cognitionRimWidthBoost: 0,
}

export const LIGHT_GRAPH_RENDER_PALETTE: GraphRenderPalette = {
  gridRgb: WHITE_NODE_RGB,
  gridLineAlpha: 0.08,
  gridDotAlpha: 0.16,
  monoNodeRgb: WHITE_NODE_RGB,
  edgeAlphaMultiplier: 1.35,
  edgeAlphaFloor: 0.08,
  edgeLineWidth: 1.65,
  nodeAgeOpacityFloor: 0.62,
  nodeFillMultiplier: 0.66,
  nodeFillRgbaAlpha: 0.86,
  nodeGlowMultiplier: 1.15,
  nodeGlowRgbaAlpha: 0.72,
  nodeGlowRingAlpha: 0.48,
  nodeStrokeAlpha: 0.78,
  nodeStrokeRgbaAlpha: 0.96,
  cognitionHaloBase: 0.28,
  cognitionHaloPulse: 0.44,
  cognitionGlowRgbaAlpha: 0.78,
  cognitionGradientInner: 1,
  cognitionGradientMid: 0.78,
  cognitionGradientOuter: 0.42,
  cognitionRimWidthBoost: 0.25,
}

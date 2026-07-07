/**
 * Vibey Animation States Configuration
 *
 * Defines different animation behaviors for various loading/processing contexts
 * Each state controls: speed, bloom intensity, oscillation strength, and color tint
 */

export type AnimationState =
  | 'idle'
  | 'processing'
  | 'thinking'
  | 'streaming'
  | 'smile'
  | 'focus'
  | 'wink'

export interface AnimationStateConfig {
  speedMultiplier: number
  bloomIntensity: number
  oscillationStrength: number
  oscillationSpeed: number
  colorTint?: { r: number; g: number; b: number }
  bloomThreshold: number
}

export const ANIMATION_STATES: Record<AnimationState, AnimationStateConfig> = {
  idle: {
    speedMultiplier: 1.0,
    bloomIntensity: 0.5,
    oscillationStrength: 1.0,
    oscillationSpeed: 1.0,
    bloomThreshold: 1.3,
  },
  processing: {
    speedMultiplier: 1.5,
    bloomIntensity: 0.5,
    oscillationStrength: 1.3,
    oscillationSpeed: 1.4,
    bloomThreshold: 1.3,
    colorTint: { r: 0, g: 0, b: 0.1 },
  },
  thinking: {
    speedMultiplier: 0.7,
    bloomIntensity: 0.4,
    oscillationStrength: 1.5,
    oscillationSpeed: 0.6,
    bloomThreshold: 1.5,
    colorTint: { r: 0, g: -0.05, b: 0 },
  },
  streaming: {
    speedMultiplier: 2.0,
    bloomIntensity: 0.5,
    oscillationStrength: 1.5,
    oscillationSpeed: 1.8,
    bloomThreshold: 1.3,
    colorTint: { r: 0, g: 0.05, b: 0.05 },
  },
  smile: {
    speedMultiplier: 0.8,
    bloomIntensity: 0.6,
    oscillationStrength: 1.2,
    oscillationSpeed: 1.0,
    bloomThreshold: 1.2,
    colorTint: { r: 0, g: 0.1, b: 0 },
  },
  focus: {
    speedMultiplier: 0.6,
    bloomIntensity: 0.55,
    oscillationStrength: 0.8,
    oscillationSpeed: 0.7,
    bloomThreshold: 1.4,
    colorTint: { r: 0, g: 0.05, b: 0.08 },
  },
  wink: {
    speedMultiplier: 0.7,
    bloomIntensity: 0.5,
    oscillationStrength: 1.0,
    oscillationSpeed: 0.9,
    bloomThreshold: 1.3,
    colorTint: { r: 0, g: 0.08, b: 0 },
  },
}

export function getAnimationState(state: AnimationState = 'idle'): AnimationStateConfig {
  return ANIMATION_STATES[state] ?? ANIMATION_STATES.idle
}

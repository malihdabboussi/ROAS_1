import * as THREE from 'three'

export type AnimationPhase = 'spark' | 'split' | 'expansion' | 'architecture' | 'hi' | 'collapse'

export interface ParticleData {
  sphereX: number
  sphereY: number
  sphereZ: number
  hiX: number
  hiY: number
  hiZ: number
  size: number
  speed: number
  theta: number
  phi: number
  radius: number
  color: [number, number, number]
}

export const VIBE_GREEN = new THREE.Color(217 / 255, 252 / 255, 103 / 255)
export const VIBE_GREEN_LIGHT = new THREE.Color(225 / 255, 255 / 255, 140 / 255)
export const VIBE_GREEN_DARK = new THREE.Color(195 / 255, 230 / 255, 80 / 255)

export function getHIPositions(
  index: number,
  totalCount: number,
): { x: number; y: number; z: number } {
  const hCount = Math.floor(totalCount * 0.6)

  if (index < hCount) {
    const t = index / hCount
    let x: number
    let y: number

    if (t < 0.33) {
      x = -0.25
      y = -0.25 + (t / 0.33) * 0.5
    } else if (t < 0.5) {
      const barT = (t - 0.33) / 0.17
      x = -0.25 + barT * 0.25
      y = 0
    } else {
      x = 0
      y = -0.25 + ((t - 0.5) / 0.5) * 0.5
    }

    return {
      x,
      y,
      z: (Math.random() - 0.5) * 0.05,
    }
  }

  const iIndex = index - hCount
  const iCount = totalCount - hCount
  const t = iIndex / iCount

  return {
    x: 0.15,
    y: -0.25 + t * 0.5,
    z: (Math.random() - 0.5) * 0.05,
  }
}

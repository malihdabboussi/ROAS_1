'use client'

import { useMemo } from 'react'
import { AnimationPhase } from '../../types/awakening.types'
import { ParticleRing } from './ParticleRing'

interface AwakeningRingsProps {
  phase: AnimationPhase
  phaseProgress: number
  speedMultiplier?: number
  oscillationStrength?: number
  opacity?: number
}

export function AwakeningRings({
  phase,
  phaseProgress,
  speedMultiplier = 1.0,
  oscillationStrength: _oscillationStrength = 1.0,
  opacity = 1.0,
}: AwakeningRingsProps) {
  const rings = useMemo(() => {
    const ringData = []
    for (let i = 0; i < 7; i++) {
      const t = i / 7
      const radius = 0.25 + t * 0.4
      ringData.push({ radius })
    }
    return ringData
  }, [])

  const ringsOpacity =
    (phase === 'expansion'
      ? phaseProgress * 0.6
      : phase === 'architecture' || phase === 'hi'
        ? 0.6
        : phase === 'collapse'
          ? Math.max(0, 0.6 * (1 - phaseProgress * 3.0))
          : 0) * opacity

  return (
    <>
      {rings.map((ring, i) => (
        <ParticleRing
          key={i}
          radius={ring.radius}
          opacity={ringsOpacity}
          speedMultiplier={speedMultiplier}
        />
      ))}
    </>
  )
}

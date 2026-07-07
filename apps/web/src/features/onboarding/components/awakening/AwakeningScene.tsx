'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AnimationPhase } from '../../types/awakening.types'
import { AwakeningParticles } from './AwakeningParticles'
import { AwakeningRings } from './AwakeningRings'
import { ButtonParticleBurst } from './ButtonParticleBurst'

interface AwakeningSceneProps {
  phase: AnimationPhase
  phaseProgress: number
  buttonHovered: boolean
  speedMultiplier?: number
  oscillationStrength?: number
}

export function AwakeningScene({
  phase,
  phaseProgress,
  buttonHovered,
  speedMultiplier = 1.0,
  oscillationStrength = 1.0,
}: AwakeningSceneProps) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((_state, delta) => {
    if (!groupRef.current) return
    if (phase === 'expansion' || phase === 'architecture') {
      groupRef.current.rotation.y += delta * 0.03 * speedMultiplier
    }
  })

  const sceneOpacity = 1

  return (
    <>
      <group ref={groupRef}>
        <AwakeningParticles
          phase={phase}
          phaseProgress={phaseProgress}
          speedMultiplier={speedMultiplier}
          opacity={sceneOpacity}
        />
        <AwakeningRings
          phase={phase}
          phaseProgress={phaseProgress}
          speedMultiplier={speedMultiplier}
          oscillationStrength={oscillationStrength}
          opacity={sceneOpacity}
        />
      </group>
      <ButtonParticleBurst active={buttonHovered} />
    </>
  )
}

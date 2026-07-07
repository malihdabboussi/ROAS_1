'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { VIBE_GREEN, VIBE_GREEN_DARK, VIBE_GREEN_LIGHT } from '../../types/awakening.types'

interface ParticleRingProps {
  radius: number
  opacity: number
  speedMultiplier?: number
}

export function ParticleRing({ radius, opacity, speedMultiplier = 1.0 }: ParticleRingProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dotCount = 200

  const dotsData = useMemo(() => {
    const dots = []
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2
      dots.push({
        angle,
        offset: Math.random() * Math.PI * 2,
        size: 0.004 + Math.random() * 0.003,
      })
    }
    return dots
  }, [dotCount])

  const axis = useMemo(
    () =>
      new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
    [],
  )

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorTemp = useMemo(() => new THREE.Color(), [])

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return

    const time = state.clock.elapsedTime
    groupRef.current.rotateOnAxis(axis, delta * 0.1 * speedMultiplier)

    dotsData.forEach((dot, i) => {
      const streamOffset = (time * 0.5 + dot.offset) % (Math.PI * 2)
      const angle = dot.angle + streamOffset
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      dummy.position.set(x, y, 0)
      const pulse = 0.8 + 0.2 * Math.sin(time * 2 + i * 0.1)
      dummy.scale.setScalar(dot.size * pulse)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      const colorVariation = i / dotCount
      const color =
        colorVariation < 0.33
          ? VIBE_GREEN
          : colorVariation < 0.66
            ? VIBE_GREEN_LIGHT
            : VIBE_GREEN_DARK
      colorTemp.copy(color)
      meshRef.current.setColorAt(i, colorTemp)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  if (opacity === 0) return null

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, dotCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          toneMapped={false}
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}

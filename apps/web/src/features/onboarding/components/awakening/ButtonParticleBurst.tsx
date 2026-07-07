'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ButtonParticleBurstProps {
  active: boolean
}

export function ButtonParticleBurst({ active }: ButtonParticleBurstProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const particleCount = 50

  const particleData = useMemo(() => {
    const data = []
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 0.3 + Math.random() * 0.5

      data.push({
        direction: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi),
        ).multiplyScalar(speed),
        life: 0,
        size: 0.008 + Math.random() * 0.015,
        initialDelay: Math.random() * 0.2,
      })
    }
    return data
  }, [particleCount])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorTemp = useMemo(() => new THREE.Color(), [])

  useFrame((_state, delta) => {
    if (!meshRef.current || !active) return

    particleData.forEach((particle, i) => {
      particle.life += delta

      if (particle.life < particle.initialDelay) {
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        return
      }

      const adjustedLife = particle.life - particle.initialDelay
      const maxLife = 1.5
      if (adjustedLife > maxLife) {
        particle.life = 0
      }

      const progress = adjustedLife / maxLife
      const x = particle.direction.x * adjustedLife * 2
      const y = -1.2 + particle.direction.y * adjustedLife * 2
      const z = particle.direction.z * adjustedLife * 2
      dummy.position.set(x, y, z)

      const opacity = 1 - progress
      const scale = particle.size * (1 + progress * 0.5) * opacity
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      colorTemp.setRGB(1.8 * opacity, 2.2 * opacity, 0.8 * opacity)
      meshRef.current.setColorAt(i, colorTemp)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  if (!active) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        toneMapped={false}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

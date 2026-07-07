'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { createNoise3D } from 'simplex-noise'
import * as THREE from 'three'
import { AnimationPhase, getHIPositions, ParticleData } from '../../types/awakening.types'

const noise3D = createNoise3D()

interface AwakeningParticlesProps {
  phase: AnimationPhase
  phaseProgress: number
  speedMultiplier?: number
  opacity?: number
}

export function AwakeningParticles({
  phase,
  phaseProgress,
  speedMultiplier = 1.0,
  opacity = 1.0,
}: AwakeningParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const totalParticleCount = 900

  const getVisibleCount = () => {
    if (phase === 'spark') return 1
    if (phase === 'split') return 2
    if (phase === 'expansion') {
      return Math.floor(2 + phaseProgress * (totalParticleCount - 2))
    }
    return totalParticleCount
  }

  const particleData = useMemo<ParticleData[]>(() => {
    const data: ParticleData[] = []

    for (let i = 0; i < totalParticleCount; i++) {
      const radius = Math.pow(Math.random(), 2) * 0.3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      const sphereX = radius * Math.sin(phi) * Math.cos(theta)
      const sphereY = radius * Math.sin(phi) * Math.sin(theta)
      const sphereZ = radius * Math.cos(phi)

      const hiPos = getHIPositions(i, totalParticleCount)
      const particleSize = 0.008 + Math.random() * 0.012
      const speed = 0.1 + Math.random() * 0.2

      data.push({
        sphereX,
        sphereY,
        sphereZ,
        hiX: hiPos.x,
        hiY: hiPos.y,
        hiZ: hiPos.z,
        size: particleSize,
        speed,
        theta,
        phi,
        radius,
        color: [1.8, 2.2, 0.8],
      })
    }

    return data
  }, [totalParticleCount])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorTemp = useMemo(() => new THREE.Color(), [])

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime
    const visibleCount = getVisibleCount()

    particleData.forEach((particle, i) => {
      if (i >= visibleCount) {
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        meshRef.current!.setMatrixAt(i, dummy.matrix)
        return
      }

      let x: number
      let y: number
      let z: number

      if (phase === 'spark') {
        x = 0
        y = 0
        z = 0
      } else if (phase === 'split') {
        const angle = time * 0.8 + (i === 0 ? 0 : Math.PI)
        const orbitRadius = 0.08
        x = Math.cos(angle) * orbitRadius
        y = Math.sin(angle * 2) * orbitRadius * 0.5
        z = 0
      } else if (phase === 'expansion') {
        const offset = i * 0.01
        const newTheta = particle.theta + time * particle.speed * 0.15 * speedMultiplier + offset
        const wobble = noise3D(time * 0.4, i * 0.1, 0) * 0.2
        const newPhi = particle.phi + wobble
        const breathe = 1 + noise3D(time * 0.6, i * 0.05, 100) * 0.2
        const r = particle.radius * breathe * phaseProgress
        x = r * Math.sin(newPhi) * Math.cos(newTheta)
        y = r * Math.sin(newPhi) * Math.sin(newTheta)
        z = r * Math.cos(newPhi)
      } else if (phase === 'architecture') {
        const offset = i * 0.01
        const newTheta = particle.theta + time * particle.speed * 0.15 * speedMultiplier + offset
        const wobble = noise3D(time * 0.4, i * 0.1, 0) * 0.2
        const newPhi = particle.phi + wobble
        const breathe = 1 + noise3D(time * 0.6, i * 0.05, 100) * 0.2
        const r = particle.radius * breathe
        x = r * Math.sin(newPhi) * Math.cos(newTheta)
        y = r * Math.sin(newPhi) * Math.sin(newTheta)
        z = r * Math.cos(newPhi)
      } else if (phase === 'hi') {
        const morphProgress =
          phaseProgress < 0.4
            ? phaseProgress / 0.4
            : phaseProgress > 0.6
              ? 1 - (phaseProgress - 0.6) / 0.4
              : 1
        const eased =
          morphProgress < 0.5
            ? 4 * morphProgress * morphProgress * morphProgress
            : 1 - Math.pow(-2 * morphProgress + 2, 3) / 2

        const offset = i * 0.01
        const speedTransition =
          phaseProgress > 0.8 ? 0.15 - (0.15 - 0.1) * ((phaseProgress - 0.8) / 0.2) : 0.15
        const newTheta =
          particle.theta + time * particle.speed * speedTransition * speedMultiplier + offset
        const wobble = noise3D(time * 0.4, i * 0.1, 0) * 0.2
        const newPhi = particle.phi + wobble
        const breathe = 1 + noise3D(time * 0.6, i * 0.05, 100) * 0.2
        const r = particle.radius * breathe

        const sphereX = r * Math.sin(newPhi) * Math.cos(newTheta)
        const sphereY = r * Math.sin(newPhi) * Math.sin(newTheta)
        const sphereZ = r * Math.cos(newPhi)
        x = sphereX * (1 - eased) + particle.hiX * eased
        y = sphereY * (1 - eased) + particle.hiY * eased
        z = sphereZ * (1 - eased) + particle.hiZ * eased
      } else if (phase === 'collapse') {
        const cappedProgress = Math.min(phaseProgress / 0.75, 1.0)
        const offset = i * 0.01
        const newTheta = particle.theta + time * particle.speed * 0.1 * speedMultiplier + offset
        const wobble = noise3D(time * 0.4, i * 0.1, 0) * 0.2
        const newPhi = particle.phi + wobble
        const breathe = 1 + noise3D(time * 0.6, i * 0.05, 100) * 0.2
        const r = particle.radius * breathe
        const sphereX = r * Math.sin(newPhi) * Math.cos(newTheta)
        const sphereY = r * Math.sin(newPhi) * Math.sin(newTheta)
        const sphereZ = r * Math.cos(newPhi)
        const easedProgress = cappedProgress * cappedProgress
        x = sphereX * (1 - easedProgress)
        y = sphereY * (1 - easedProgress)
        z = sphereZ * (1 - easedProgress)
      } else {
        const offset = i * 0.01
        const newTheta = particle.theta + time * particle.speed * 0.1 + offset
        const wobble = noise3D(time * 0.3, i * 0.1, 0) * 0.15
        const newPhi = particle.phi + wobble
        const breathe = 1 + noise3D(time * 0.5, i * 0.05, 100) * 0.15
        const r = particle.radius * breathe
        x = r * Math.sin(newPhi) * Math.cos(newTheta)
        y = r * Math.sin(newPhi) * Math.sin(newTheta)
        z = r * Math.cos(newPhi)
      }

      dummy.position.set(x, y, z)
      const pulse = 0.8 + 0.2 * Math.sin(time * 3 + i * 0.1)
      let finalScale = particle.size * pulse
      if (phase === 'collapse') {
        const cappedProgress = Math.min(phaseProgress / 0.75, 1.0)
        const shrinkFactor = 1 - cappedProgress * 0.995
        finalScale = particle.size * pulse * shrinkFactor
      }
      dummy.scale.setScalar(finalScale)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)

      colorTemp.setRGB(particle.color[0], particle.color[1], particle.color[2])
      meshRef.current!.setColorAt(i, colorTemp)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalParticleCount]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        toneMapped={false}
        transparent
        opacity={0.9 * opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

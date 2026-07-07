'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const VIBE_GREEN = new THREE.Color(217 / 255, 252 / 255, 103 / 255)
const VIBE_GREEN_LIGHT = new THREE.Color(225 / 255, 255 / 255, 140 / 255)
const VIBE_GREEN_DARK = new THREE.Color(195 / 255, 230 / 255, 80 / 255)

interface ElectricCurrentBurstProps {
  active: boolean
}

export function ElectricCurrentBurst({ active }: ElectricCurrentBurstProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const particleCount = 60

  const [isVisible, setIsVisible] = useState(false)
  const fadeOutProgress = useRef(0)
  const isFadingOut = useRef(false)

  useEffect(() => {
    if (active) {
      setIsVisible(true)
      fadeOutProgress.current = 0
      isFadingOut.current = false
    } else if (isVisible) {
      isFadingOut.current = true
    }
  }, [active, isVisible])

  const particleData = useMemo(() => {
    const data: {
      angle: number
      startX: number
      startY: number
      speed: number
      life: number
      maxLife: number
      size: number
      initialDelay: number
      color: THREE.Color
    }[] = []
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.3 + Math.random() * 0.4
      const buttonRadius = 0.35
      const startX = Math.cos(angle) * buttonRadius
      const startY = Math.sin(angle) * buttonRadius
      const colorRand = Math.random()
      const color =
        colorRand < 0.33 ? VIBE_GREEN : colorRand < 0.66 ? VIBE_GREEN_LIGHT : VIBE_GREEN_DARK
      data.push({
        angle,
        startX,
        startY,
        speed,
        life: 0,
        maxLife: 1.0 + Math.random() * 1.5,
        size: 0.004 + Math.random() * 0.006,
        initialDelay: Math.random() * 1.2,
        color: color.clone(),
      })
    }
    return data
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorTemp = useMemo(() => new THREE.Color(), [])

  useFrame((_state, delta) => {
    if (!meshRef.current || !isVisible) return

    if (isFadingOut.current) {
      fadeOutProgress.current += delta * 1.5
      if (fadeOutProgress.current >= 1) {
        setIsVisible(false)
        isFadingOut.current = false
        fadeOutProgress.current = 0
        return
      }
    }

    const globalFade = isFadingOut.current ? 1 - fadeOutProgress.current : 1

    particleData.forEach((particle, i) => {
      if (active) {
        particle.life += delta
      }

      if (particle.life < particle.initialDelay) {
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        meshRef.current!.setMatrixAt(i, dummy.matrix)
        return
      }

      const adjustedLife = particle.life - particle.initialDelay

      if (adjustedLife > particle.maxLife && active) {
        particle.life = 0
        particle.initialDelay = Math.random() * 1.2
        particle.angle = Math.random() * Math.PI * 2
        particle.startX = Math.cos(particle.angle) * 0.35
        particle.startY = Math.sin(particle.angle) * 0.35
        const colorRand = Math.random()
        particle.color =
          colorRand < 0.33
            ? VIBE_GREEN.clone()
            : colorRand < 0.66
              ? VIBE_GREEN_LIGHT.clone()
              : VIBE_GREEN_DARK.clone()
      }

      const progress = Math.min(adjustedLife / particle.maxLife, 1)
      const distance = adjustedLife * particle.speed
      const x = particle.startX + Math.cos(particle.angle) * distance
      const y = particle.startY + Math.sin(particle.angle) * distance
      const z = (Math.random() - 0.5) * 0.05 * progress

      dummy.position.set(x, y, z)
      const particleOpacity = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7
      const opacity = particleOpacity * globalFade
      const scale = particle.size * opacity
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)

      colorTemp.copy(particle.color)
      colorTemp.multiplyScalar(2.0 * opacity)
      meshRef.current!.setColorAt(i, colorTemp)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  if (!isVisible) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial
        toneMapped={false}
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

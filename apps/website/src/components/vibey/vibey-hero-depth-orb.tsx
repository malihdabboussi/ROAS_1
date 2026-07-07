'use client'

import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

const VIBE = { r: 217 / 255, g: 252 / 255, b: 103 / 255 }
const VIBE_HI = { r: 235 / 255, g: 1, b: 0.65 }
const VIBE_LO = { r: 165 / 255, g: 210 / 255, b: 70 / 255 }

const CORE_COUNT = 16000

function buildBallTargets(): Float32Array {
  const out = new Float32Array(CORE_COUNT * 3)
  for (let i = 0; i < CORE_COUNT; i++) {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const r = Math.pow(Math.random(), 2.2) * 0.44
    const ix = i * 3
    out[ix] = r * Math.sin(phi) * Math.cos(theta)
    out[ix + 1] = r * Math.sin(phi) * Math.sin(theta)
    out[ix + 2] = r * Math.cos(phi)
  }
  return out
}

function HeroOrbScene() {
  const groupRef = useRef<THREE.Group>(null!)

  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const mouseWorld = useRef(new THREE.Vector3())
  const vTmp = useRef(new THREE.Vector3())
  const vVel = useRef(new THREE.Vector3())
  const vTgt = useRef(new THREE.Vector3())
  const vCur = useRef(new THREE.Vector3())

  const ballTargets = useMemo(() => buildBallTargets(), [])

  const coreGeo = useMemo(() => {
    const colors = new Float32Array(CORE_COUNT * 3)
    for (let i = 0; i < CORE_COUNT; i++) {
      const ix = i * 3
      const t = Math.random()
      const br = 0.85 + Math.random() * 0.35
      colors[ix] = (t < 0.33 ? VIBE_LO.r : t < 0.66 ? VIBE.r : VIBE_HI.r) * br
      colors[ix + 1] = (t < 0.33 ? VIBE_LO.g : t < 0.66 ? VIBE.g : VIBE_HI.g) * br
      colors[ix + 2] = (t < 0.33 ? VIBE_LO.b : t < 0.66 ? VIBE.b : VIBE_HI.b) * br
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ballTargets), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [ballTargets])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    mouseRef.current.x += (state.pointer.x - mouseRef.current.x) * 4 * delta
    mouseRef.current.y += (state.pointer.y - mouseRef.current.y) * 4 * delta
    const gx = groupRef.current?.position.x ?? 0
    const gy = groupRef.current?.position.y ?? 0
    mouseWorld.current.set(mouseRef.current.x * 2.4 - gx, mouseRef.current.y * 2.4 - gy, 0)

    const breathe = 1 + Math.sin(time * 2.1) * 0.12 + Math.sin(time * 0.8) * 0.05

    const coreAttr = coreGeo.getAttribute('position') as THREE.BufferAttribute
    const arr = coreAttr.array as Float32Array
    const vel = (coreGeo.userData.vel ??= new Float32Array(CORE_COUNT * 3)) as Float32Array
    const repelR = 0.85
    const repelS = 0.032
    const spring = 0.0048
    const damping = 0.91

    for (let i = 0; i < CORE_COUNT; i++) {
      const ix = i * 3
      vTgt.current.set(
        ballTargets[ix]! * breathe,
        ballTargets[ix + 1]! * breathe,
        ballTargets[ix + 2]! * breathe,
      )
      vCur.current.set(arr[ix]!, arr[ix + 1]!, arr[ix + 2]!)
      vVel.current.set(vel[ix]!, vel[ix + 1]!, vel[ix + 2]!)

      const dist = vCur.current.distanceTo(mouseWorld.current)
      if (dist < repelR && dist > 0.001) {
        const f = ((repelR - dist) / repelR) * repelS
        vVel.current.add(
          vTmp.current.subVectors(vCur.current, mouseWorld.current).normalize().multiplyScalar(f),
        )
      }
      vVel.current.add(vTmp.current.subVectors(vTgt.current, vCur.current).multiplyScalar(spring))
      vVel.current.multiplyScalar(damping)
      arr[ix] = vCur.current.x + vVel.current.x
      arr[ix + 1] = vCur.current.y + vVel.current.y
      arr[ix + 2] = vCur.current.z + vVel.current.z
      vel[ix] = vVel.current.x
      vel[ix + 1] = vVel.current.y
      vel[ix + 2] = vVel.current.z
    }
    coreAttr.needsUpdate = true

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.028
      groupRef.current.rotation.x +=
        (state.pointer.y * 0.1 - groupRef.current.rotation.x) * 1.0 * delta
      groupRef.current.rotation.z +=
        (-state.pointer.x * 0.05 - groupRef.current.rotation.z) * 1.0 * delta
    }
  })

  return (
    <group ref={groupRef} scale={1.14}>
      <points>
        <primitive object={coreGeo} attach="geometry" />
        <pointsMaterial
          attach="material"
          size={0.006}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}

export function VibeyHeroDepthOrb() {
  const [canvasReady, setCanvasReady] = useState(false)

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 42 }}
        frameloop="always"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          alpha: true,
          preserveDrawingBuffer: true,
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onCreated={(s) => {
          s.gl.setClearColor(0x000000, 0)
          s.scene.background = null
          setTimeout(() => setCanvasReady(true), 80)
        }}
      >
        <HeroOrbScene />
        {canvasReady && (
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.42}
              luminanceThreshold={0.15}
              luminanceSmoothing={0.9}
              mipmapBlur
              radius={0.35}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}

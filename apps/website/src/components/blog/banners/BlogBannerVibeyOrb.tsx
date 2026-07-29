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

function OrbScene() {
  const groupRef = useRef<THREE.Group>(null!)
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
    const breathe = 1 + Math.sin(time * 2.1) * 0.12 + Math.sin(time * 0.8) * 0.05

    const coreAttr = coreGeo.getAttribute('position') as THREE.BufferAttribute
    const arr = coreAttr.array as Float32Array
    const vel = (coreGeo.userData.vel ??= new Float32Array(CORE_COUNT * 3)) as Float32Array
    const spring = 0.004
    const damping = 0.88

    for (let i = 0; i < CORE_COUNT; i++) {
      const ix = i * 3
      const tx = ballTargets[ix]! * breathe
      const ty = ballTargets[ix + 1]! * breathe
      const tz = ballTargets[ix + 2]! * breathe
      vel[ix] = (vel[ix]! + (tx - arr[ix]!) * spring) * damping
      vel[ix + 1] = (vel[ix + 1]! + (ty - arr[ix + 1]!) * spring) * damping
      vel[ix + 2] = (vel[ix + 2]! + (tz - arr[ix + 2]!) * spring) * damping
      arr[ix] = arr[ix]! + vel[ix]!
      arr[ix + 1] = arr[ix + 1]! + vel[ix + 1]!
      arr[ix + 2] = arr[ix + 2]! + vel[ix + 2]!
    }
    coreAttr.needsUpdate = true

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.028
    }
  })

  return (
    <group ref={groupRef} scale={2.8}>
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

/** ROAS orb — breathing + slow rotation only, no mouse interaction. */
export function BlogBannerVibeyOrb() {
  const [canvasReady, setCanvasReady] = useState(false)

  return (
    <div className="relative h-full w-full">
      <div
        className="compare-hero-brain-grid pointer-events-none absolute inset-0 z-10"
        aria-hidden
      />
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
        <OrbScene />
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

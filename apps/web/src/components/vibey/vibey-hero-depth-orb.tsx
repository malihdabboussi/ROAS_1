'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

const VIBE = { r: 217 / 255, g: 252 / 255, b: 103 / 255 }
const VIBE_HI = { r: 235 / 255, g: 1, b: 0.65 }
const VIBE_LO = { r: 165 / 255, g: 210 / 255, b: 70 / 255 }
// Canvas material palette: Three.js cannot consume token utility classes directly.
const LIGHT_DARK = { r: 23 / 255, g: 28 / 255, b: 20 / 255 }
const LIGHT_LOW = { r: 48 / 255, g: 64 / 255, b: 38 / 255 }
const LIGHT_MID = { r: 93 / 255, g: 125 / 255, b: 56 / 255 }
const LIGHT_IGNITION = { r: 217 / 255, g: 252 / 255, b: 103 / 255 }

const HERO_CORE_COUNT = 16000
const EMBED_CORE_COUNT = 4800

type OrbTone = 'dark' | 'light'

function useOrbTone(): OrbTone {
  const [tone, setTone] = useState<OrbTone>('dark')

  useEffect(() => {
    const root = document.documentElement
    const apply = () => setTone(root.classList.contains('dark') ? 'dark' : 'light')
    apply()

    const observer = new MutationObserver(apply)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return tone
}

function buildBallTargets(count: number, maxRadius = 0.44): Float32Array {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const r = Math.pow(Math.random(), 2.2) * maxRadius
    const ix = i * 3
    out[ix] = r * Math.sin(phi) * Math.cos(theta)
    out[ix + 1] = r * Math.sin(phi) * Math.sin(theta)
    out[ix + 2] = r * Math.cos(phi)
  }
  return out
}

function HeroOrbScene({
  orbShiftX,
  orbShiftY,
  coreCount,
  pointSize,
  groupScale,
  tone = 'dark',
  lightReadable = false,
  disablePointerInteraction = false,
}: {
  orbShiftX: number
  orbShiftY: number
  coreCount: number
  pointSize: number
  groupScale: number
  tone?: OrbTone
  lightReadable?: boolean
  disablePointerInteraction?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)

  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const mouseWorld = useRef(new THREE.Vector3())
  const vTmp = useRef(new THREE.Vector3())
  const vVel = useRef(new THREE.Vector3())
  const vTgt = useRef(new THREE.Vector3())
  const vCur = useRef(new THREE.Vector3())

  const ballTargets = useMemo(() => buildBallTargets(coreCount), [coreCount])
  const ignitionTargets = useMemo(
    () => buildBallTargets(Math.floor(coreCount * 0.1), 0.14),
    [coreCount],
  )

  const coreGeo = useMemo(() => {
    const colors = new Float32Array(coreCount * 3)
    for (let i = 0; i < coreCount; i++) {
      const ix = i * 3
      const t = Math.random()
      const br = 0.85 + Math.random() * 0.35
      if (tone === 'light') {
        const radius =
          Math.hypot(ballTargets[ix]!, ballTargets[ix + 1]!, ballTargets[ix + 2]!) / 0.44
        const material =
          radius > 0.58 ? LIGHT_DARK : t < 0.72 ? LIGHT_LOW : t < 0.94 ? LIGHT_MID : VIBE
        colors[ix] = material.r * br
        colors[ix + 1] = material.g * br
        colors[ix + 2] = material.b * br
      } else {
        colors[ix] = (t < 0.33 ? VIBE_LO.r : t < 0.66 ? VIBE.r : VIBE_HI.r) * br
        colors[ix + 1] = (t < 0.33 ? VIBE_LO.g : t < 0.66 ? VIBE.g : VIBE_HI.g) * br
        colors[ix + 2] = (t < 0.33 ? VIBE_LO.b : t < 0.66 ? VIBE.b : VIBE_HI.b) * br
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ballTargets), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [ballTargets, coreCount, tone])

  const ignitionGeo = useMemo(() => {
    const colors = new Float32Array(ignitionTargets.length)
    for (let i = 0; i < ignitionTargets.length / 3; i++) {
      const ix = i * 3
      const br = 0.9 + Math.random() * 0.45
      colors[ix] = LIGHT_IGNITION.r * br
      colors[ix + 1] = LIGHT_IGNITION.g * br
      colors[ix + 2] = LIGHT_IGNITION.b * br
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ignitionTargets), 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [ignitionTargets])

  useFrame((state, delta) => {
    if (!disablePointerInteraction) {
      mouseRef.current.x += (state.pointer.x - mouseRef.current.x) * 4 * delta
      mouseRef.current.y += (state.pointer.y - mouseRef.current.y) * 4 * delta
    }
    const gx = groupRef.current?.position.x ?? 0
    const gy = groupRef.current?.position.y ?? 0
    mouseWorld.current.set(
      disablePointerInteraction ? 999 : mouseRef.current.x * 2.4 - gx,
      disablePointerInteraction ? 999 : mouseRef.current.y * 2.4 - gy,
      0,
    )

    const coreAttr = coreGeo.getAttribute('position') as THREE.BufferAttribute
    const arr = coreAttr.array as Float32Array
    const vel = (coreGeo.userData.vel ??= new Float32Array(coreCount * 3)) as Float32Array
    const repelR = 0.85
    const repelS = 0.032
    const spring = 0.0048
    const damping = 0.91

    for (let i = 0; i < coreCount; i++) {
      const ix = i * 3
      vTgt.current.set(ballTargets[ix]!, ballTargets[ix + 1]!, ballTargets[ix + 2]!)
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
      if (!disablePointerInteraction) {
        groupRef.current.rotation.x +=
          (state.pointer.y * 0.1 - groupRef.current.rotation.x) * 1.0 * delta
        groupRef.current.rotation.z +=
          (-state.pointer.x * 0.05 - groupRef.current.rotation.z) * 1.0 * delta
      }
    }
  })

  return (
    <group ref={groupRef} position={[orbShiftX, orbShiftY, 0]} scale={groupScale}>
      {lightReadable && tone === 'light' ? (
        <points scale={0.56}>
          <primitive object={ignitionGeo} attach="geometry" />
          <pointsMaterial
            attach="material"
            size={pointSize * 1.55}
            vertexColors
            sizeAttenuation
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      ) : null}
      <points>
        <primitive object={coreGeo} attach="geometry" />
        <pointsMaterial
          attach="material"
          size={pointSize}
          vertexColors
          sizeAttenuation
          transparent
          opacity={tone === 'light' ? 0.82 : 0.95}
          depthWrite={false}
          blending={tone === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}

export function VibeyHeroDepthOrb() {
  const [canvasReady, setCanvasReady] = useState(false)
  const [orbShiftX, setOrbShiftX] = useState(0)
  const tone = useOrbTone()

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setOrbShiftX(mq.matches ? 1.2 : 0)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return (
    <div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
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
        <HeroOrbScene
          orbShiftX={orbShiftX}
          orbShiftY={0}
          coreCount={HERO_CORE_COUNT}
          pointSize={0.006}
          groupScale={1.14}
          tone={tone}
          lightReadable
        />
        {canvasReady && (
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={tone === 'light' ? 0.18 : 0.42}
              luminanceThreshold={tone === 'light' ? 0.35 : 0.15}
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

/** Same particle + bloom look as auth `VibeyHeroDepthOrb`, sized for small circular avatars (e.g. Team home). */
export function VibeyHeroDepthOrbEmbed({
  coreCount = EMBED_CORE_COUNT,
  pointSize = 0.006,
  groupScale = 1.14,
  orbShiftY = 0,
  className,
  disablePointerInteraction = false,
}: {
  coreCount?: number
  pointSize?: number
  groupScale?: number
  orbShiftY?: number
  className?: string
  disablePointerInteraction?: boolean
} = {}) {
  const [canvasReady, setCanvasReady] = useState(false)

  return (
    <div className={`h-full w-full ${className ?? ''}`} style={{ width: '100%', height: '100%' }}>
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
        <HeroOrbScene
          orbShiftX={0}
          orbShiftY={orbShiftY}
          coreCount={coreCount}
          pointSize={pointSize}
          groupScale={groupScale}
          disablePointerInteraction={disablePointerInteraction}
        />
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

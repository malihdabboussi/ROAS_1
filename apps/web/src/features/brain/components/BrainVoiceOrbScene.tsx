'use client'

import { useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

const VIBE = { r: 217 / 255, g: 252 / 255, b: 103 / 255 }
const VIBE_HI = { r: 235 / 255, g: 1, b: 0.65 }
const VIBE_LO = { r: 165 / 255, g: 210 / 255, b: 70 / 255 }

export type OrbAnimationState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'toolCall'

interface OrbSceneProps {
  animationState: OrbAnimationState
  audioLevel?: number
  audioLevelRef?: MutableRefObject<number>
  particleCount?: number
  enableMouseRepulsion?: boolean
}

function buildBallTargets(count: number): Float32Array {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
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

const STATE_PARAMS = {
  idle: {
    spring: 0.0048,
    damping: 0.91,
    rotSpeed: 0.028,
    bloomIntensity: 0.42,
    breatheAmp: 0.02,
    breatheFreq: 0.5,
    targetScale: 1.14,
    noiseAmp: 0,
    audioMult: 0,
  },
  connecting: {
    spring: 0.001,
    damping: 0.85,
    rotSpeed: 0.06,
    bloomIntensity: 0.3,
    breatheAmp: 0.04,
    breatheFreq: 0.8,
    targetScale: 0.6,
    noiseAmp: 0,
    audioMult: 0,
  },
  listening: {
    spring: 0.005,
    damping: 0.92,
    rotSpeed: 0.018,
    bloomIntensity: 0.42,
    breatheAmp: 0.018,
    breatheFreq: 0.45,
    targetScale: 1.14,
    noiseAmp: 0,
    audioMult: 0,
  },
  speaking: {
    spring: 0.014,
    damping: 0.84,
    rotSpeed: 0.05,
    bloomIntensity: 0.65,
    breatheAmp: 0.01,
    breatheFreq: 0.8,
    targetScale: 1.14,
    noiseAmp: 0.18,
    audioMult: 0.45,
  },
  toolCall: {
    spring: 0.012,
    damping: 0.86,
    rotSpeed: 0.01,
    bloomIntensity: 0.35,
    breatheAmp: 0.005,
    breatheFreq: 2.0,
    targetScale: 0.95,
    noiseAmp: 0,
    audioMult: 0,
  },
}

function noise3(x: number, y: number, z: number): number {
  const n =
    Math.sin(x * 1.27 + y * 3.41) * 0.5 +
    Math.sin(y * 2.13 + z * 1.77) * 0.3 +
    Math.sin(z * 3.07 + x * 0.89) * 0.2
  return n
}

function VoiceOrbParticles({
  animationState,
  audioLevel = 0,
  audioLevelRef,
  particleCount = 16000,
  enableMouseRepulsion = true,
}: OrbSceneProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const mouseWorld = useRef(new THREE.Vector3())
  const vTmp = useRef(new THREE.Vector3())
  const vVel = useRef(new THREE.Vector3())
  const vTgt = useRef(new THREE.Vector3())
  const vCur = useRef(new THREE.Vector3())
  const currentScale = useRef(1.14)

  const ballTargets = useMemo(() => buildBallTargets(particleCount), [particleCount])

  const coreGeo = useMemo(() => {
    const colors = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
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
  }, [ballTargets, particleCount])

  const smoothAudio = useRef(0)

  useFrame((state, delta) => {
    const params = STATE_PARAMS[animationState]
    const t = state.clock.elapsedTime

    const rawAudio = audioLevelRef ? audioLevelRef.current : audioLevel
    smoothAudio.current += (rawAudio - smoothAudio.current) * Math.min(12 * delta, 1)
    const audio = smoothAudio.current

    if (enableMouseRepulsion) {
      mouseRef.current.x += (state.pointer.x - mouseRef.current.x) * 4 * delta
      mouseRef.current.y += (state.pointer.y - mouseRef.current.y) * 4 * delta
      const gx = groupRef.current?.position.x ?? 0
      const gy = groupRef.current?.position.y ?? 0
      mouseWorld.current.set(mouseRef.current.x * 2.4 - gx, mouseRef.current.y * 2.4 - gy, 0)
    }

    const breathe = Math.sin(t * Math.PI * 2 * params.breatheFreq) * params.breatheAmp

    const coreAttr = coreGeo.getAttribute('position') as THREE.BufferAttribute
    const arr = coreAttr.array as Float32Array
    const vel = (coreGeo.userData.vel ??= new Float32Array(particleCount * 3)) as Float32Array

    const spring = params.spring
    const damping = params.damping
    const repelR = enableMouseRepulsion ? 0.85 : 0
    const repelS = 0.032
    const noiseAmp = params.noiseAmp * audio
    const audioScale = params.audioMult * audio
    const noiseTime = t * 4.5

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3
      const bx = ballTargets[ix]!
      const by = ballTargets[ix + 1]!
      const bz = ballTargets[ix + 2]!

      let displace = 0
      if (noiseAmp > 0.001) {
        const n = noise3(bx * 8 + noiseTime, by * 8 + noiseTime * 0.7, bz * 8 + noiseTime * 0.5)
        displace = n * noiseAmp
      }

      const targetRadiusScale = 1 + breathe + audioScale + displace
      vTgt.current.set(bx * targetRadiusScale, by * targetRadiusScale, bz * targetRadiusScale)
      vCur.current.set(arr[ix]!, arr[ix + 1]!, arr[ix + 2]!)
      vVel.current.set(vel[ix]!, vel[ix + 1]!, vel[ix + 2]!)

      if (enableMouseRepulsion) {
        const dist = vCur.current.distanceTo(mouseWorld.current)
        if (dist < repelR && dist > 0.001) {
          const f = ((repelR - dist) / repelR) * repelS
          vVel.current.add(
            vTmp.current.subVectors(vCur.current, mouseWorld.current).normalize().multiplyScalar(f),
          )
        }
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
      groupRef.current.rotation.y += delta * params.rotSpeed
      if (enableMouseRepulsion) {
        groupRef.current.rotation.x +=
          (state.pointer.y * 0.1 - groupRef.current.rotation.x) * 1.0 * delta
        groupRef.current.rotation.z +=
          (-state.pointer.x * 0.05 - groupRef.current.rotation.z) * 1.0 * delta
      } else {
        groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * 2 * delta
        groupRef.current.rotation.z += (0 - groupRef.current.rotation.z) * 2 * delta
      }

      currentScale.current += (params.targetScale - currentScale.current) * 2 * delta
      groupRef.current.scale.setScalar(currentScale.current)
    }
  })

  return (
    <group ref={groupRef} scale={1.14}>
      <points>
        <primitive object={coreGeo} attach="geometry" />
        <pointsMaterial
          attach="material"
          size={particleCount > 8000 ? 0.006 : 0.01}
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

function StaticBloom() {
  const { gl } = useThree()
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    let cancelled = false
    let raf = 0

    const tryReady = () => {
      if (cancelled) return
      const attrs = gl.getContext()?.getContextAttributes()
      if (attrs) {
        setReady(true)
        return
      }
      raf = requestAnimationFrame(tryReady)
    }

    tryReady()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      setReady(false)
    }
  }, [gl])

  if (!ready) return null

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.42}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.35}
      />
    </EffectComposer>
  )
}

interface BrainVoiceOrbSceneProps {
  animationState: OrbAnimationState
  audioLevel?: number
  audioLevelRef?: MutableRefObject<number>
  size?: 'mini' | 'full'
  enableMouseRepulsion?: boolean
}

export function BrainVoiceOrbScene({
  animationState,
  audioLevel = 0,
  audioLevelRef,
  size = 'full',
  enableMouseRepulsion,
}: BrainVoiceOrbSceneProps) {
  const isMini = size === 'mini'
  const particleCount = isMini ? 4000 : 16000
  const mouseActive = enableMouseRepulsion ?? !isMini

  return (
    <div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, isMini ? 1.4 : 5.2], fov: 42 }}
        frameloop="always"
        dpr={isMini ? [1, 1.5] : [1, 2]}
        gl={{
          antialias: !isMini,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          alpha: true,
          preserveDrawingBuffer: false,
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onCreated={(s) => {
          s.gl.setClearColor(0x000000, 0)
          s.scene.background = null
        }}
      >
        <VoiceOrbParticles
          animationState={animationState}
          audioLevel={audioLevel}
          audioLevelRef={audioLevelRef}
          particleCount={particleCount}
          enableMouseRepulsion={mouseActive}
        />
        <StaticBloom />
      </Canvas>
    </div>
  )
}

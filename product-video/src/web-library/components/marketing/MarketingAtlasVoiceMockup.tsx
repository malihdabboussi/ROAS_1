'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, Volume2 } from 'lucide-react'
import * as THREE from 'three'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

// --- Static orb (no mouse tracking) ---

const VIBE = { r: 217 / 255, g: 252 / 255, b: 103 / 255 }
const VIBE_HI = { r: 235 / 255, g: 1, b: 0.65 }
const VIBE_LO = { r: 165 / 255, g: 210 / 255, b: 70 / 255 }
const CORE_COUNT = 14000

function buildTargets(): Float32Array {
  const out = new Float32Array(CORE_COUNT * 3)
  for (let i = 0; i < CORE_COUNT; i++) {
    const u = Math.random(),
      v = Math.random()
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

function AtlasOrbScene({ isTalking }: { isTalking: boolean }) {
  const groupRef = useRef<THREE.Group>(null!)
  const vTmp = useRef(new THREE.Vector3())
  const vVel = useRef(new THREE.Vector3())
  const vTgt = useRef(new THREE.Vector3())
  const vCur = useRef(new THREE.Vector3())
  const targets = useMemo(() => buildTargets(), [])

  const geo = useMemo(() => {
    const colors = new Float32Array(CORE_COUNT * 3)
    for (let i = 0; i < CORE_COUNT; i++) {
      const ix = i * 3,
        t = Math.random(),
        br = 0.85 + Math.random() * 0.35
      colors[ix] = (t < 0.33 ? VIBE_LO.r : t < 0.66 ? VIBE.r : VIBE_HI.r) * br
      colors[ix + 1] = (t < 0.33 ? VIBE_LO.g : t < 0.66 ? VIBE.g : VIBE_HI.g) * br
      colors[ix + 2] = (t < 0.33 ? VIBE_LO.b : t < 0.66 ? VIBE.b : VIBE_HI.b) * br
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(targets), 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [targets])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    // Global breathe — all particles share this base
    const breathe = 1 + Math.sin(time * 2.1) * 0.12 + Math.sin(time * 0.8) * 0.05

    const attr = geo.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const vel = (geo.userData.vel ??= new Float32Array(CORE_COUNT * 3)) as Float32Array

    for (let i = 0; i < CORE_COUNT; i++) {
      const ix = i * 3
      const tx = targets[ix]!,
        ty = targets[ix + 1]!,
        tz = targets[ix + 2]!

      // Per-particle talking: unique phase per particle creates organic turbulence.
      // Three frequencies at different spatial harmonics so no two particles move together.
      let extra = 0
      if (isTalking) {
        const p = i * 0.023
        extra =
          Math.sin(time * 11.3 + p) * 0.1 +
          Math.sin(time * 7.1 + p * 2.1) * 0.06 +
          Math.sin(time * 21.7 + p * 0.37) * 0.04
      }

      const scale = breathe + extra
      vTgt.current.set(tx * scale, ty * scale, tz * scale)
      vCur.current.set(arr[ix]!, arr[ix + 1]!, arr[ix + 2]!)
      vVel.current.set(vel[ix]!, vel[ix + 1]!, vel[ix + 2]!)
      vVel.current.add(vTmp.current.subVectors(vTgt.current, vCur.current).multiplyScalar(0.0048))
      vVel.current.multiplyScalar(0.91)
      arr[ix] = vCur.current.x + vVel.current.x
      arr[ix + 1] = vCur.current.y + vVel.current.y
      arr[ix + 2] = vCur.current.z + vVel.current.z
      vel[ix] = vVel.current.x
      vel[ix + 1] = vVel.current.y
      vel[ix + 2] = vVel.current.z
    }
    attr.needsUpdate = true

    // Slow steady rotation — no mouse tracking
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.03
  })

  return (
    <group ref={groupRef} scale={1.5}>
      <points>
        <primitive object={geo} attach="geometry" />
        <pointsMaterial
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

// --- Conversation ---

const TRANSCRIPT = [
  { role: 'user', text: 'What is our current stance on discounts?' },
  {
    role: 'atlas',
    text: "Based on 3 meeting recordings and your 'Q2 Strategy' doc, we never discount — we only add value stacks.",
  },
]

export function MarketingAtlasVoiceMockup() {
  const [canvasReady, setCanvasReady] = useState(false)
  const [visibleIndex, setVisibleIndex] = useState(-1)
  const [isTalking, setIsTalking] = useState(false)

  useEffect(() => {
    let cancelled = false
    const runCycle = async () => {
      if (cancelled) return
      setVisibleIndex(-1)
      setIsTalking(false)
      await new Promise((r) => setTimeout(r, 1200))
      if (cancelled) return
      setVisibleIndex(0)
      await new Promise((r) => setTimeout(r, 2200))
      if (cancelled) return
      setIsTalking(true)
      setVisibleIndex(1)
      await new Promise((r) => setTimeout(r, 4500))
      if (cancelled) return
      setIsTalking(false)
      await new Promise((r) => setTimeout(r, 3000))
      if (!cancelled) runCycle()
    }
    runCycle()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <FeatureFloatingMockShell className="flex !min-h-[380px] flex-col items-center justify-center sm:!min-h-[480px]">
      {/* Header badge */}
      <div className="absolute left-0 right-0 top-6 flex justify-center">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors duration-500 ${isTalking ? 'animate-pulse bg-emerald-400' : 'bg-white/20'}`}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            Atlas Voice Interface
          </span>
        </div>
      </div>

      {/* Orb — bigger, no mouse interaction */}
      <div className="h-[260px] w-[260px] sm:h-[360px] sm:w-[360px] md:h-[420px] md:w-[420px]">
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
          <AtlasOrbScene isTalking={isTalking} />
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

      {/* Transcript */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center px-8">
        <AnimatePresence mode="wait">
          {visibleIndex >= 0 && (
            <motion.div
              key={visibleIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="max-w-[380px] text-center"
            >
              <div className="mb-2 flex items-center justify-center gap-2">
                {TRANSCRIPT[visibleIndex]!.role === 'user' ? (
                  <Mic size={11} className="text-white/30" />
                ) : (
                  <Volume2 size={11} className="text-emerald-400" />
                )}
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">
                  {TRANSCRIPT[visibleIndex]!.role === 'user' ? 'You' : 'Atlas'}
                </span>
              </div>
              <p
                className={`text-[14px] font-medium leading-relaxed ${TRANSCRIPT[visibleIndex]!.role === 'user' ? 'text-white/80' : 'text-emerald-100'}`}
              >
                {TRANSCRIPT[visibleIndex]!.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FeatureFloatingMockShell>
  )
}

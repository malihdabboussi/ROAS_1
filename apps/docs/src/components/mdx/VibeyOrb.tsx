'use client'

import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

const VIBE = { r: 217 / 255, g: 252 / 255, b: 103 / 255 }
const VIBE_HI = { r: 235 / 255, g: 1, b: 0.65 }
const VIBE_LO = { r: 165 / 255, g: 210 / 255, b: 70 / 255 }

const PARTICLE_COUNT = 4000

function buildBallTargets(): Float32Array {
  const out = new Float32Array(PARTICLE_COUNT * 3)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
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
  const vTmp = useRef(new THREE.Vector3())
  const vVel = useRef(new THREE.Vector3())
  const vTgt = useRef(new THREE.Vector3())
  const vCur = useRef(new THREE.Vector3())

  const ballTargets = useMemo(() => buildBallTargets(), [])

  const coreGeo = useMemo(() => {
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
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
    const t = state.clock.elapsedTime
    const breathe = Math.sin(t * Math.PI * 2 * 0.5) * 0.02

    const coreAttr = coreGeo.getAttribute('position') as THREE.BufferAttribute
    const arr = coreAttr.array as Float32Array
    const vel = (coreGeo.userData.vel ??= new Float32Array(PARTICLE_COUNT * 3)) as Float32Array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3
      const s = 1 + breathe
      vTgt.current.set(ballTargets[ix]! * s, ballTargets[ix + 1]! * s, ballTargets[ix + 2]! * s)
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
    coreAttr.needsUpdate = true

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.028
    }
  })

  return (
    <group ref={groupRef} scale={1.14}>
      <points>
        <primitive object={coreGeo} attach="geometry" />
        <pointsMaterial
          attach="material"
          size={0.01}
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

export function VibeyOrb({ size = 80 }: { size?: number }) {
  const [ready, setReady] = useState(false)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 1.4], fov: 42 }}
        frameloop="always"
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          alpha: true,
          preserveDrawingBuffer: false,
        }}
        style={{ width: '100%', height: '100%', display: 'block', background: 'transparent' }}
        onCreated={(s) => {
          s.gl.setClearColor(0x000000, 0)
          s.scene.background = null
          setTimeout(() => setReady(true), 80)
        }}
      >
        <OrbScene />
        {ready && (
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

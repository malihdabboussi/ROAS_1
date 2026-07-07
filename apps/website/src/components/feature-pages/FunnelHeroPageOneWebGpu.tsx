'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useAspect, useTexture } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import * as THREE from 'three/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { Mesh } from 'three'
import {
  abs,
  add,
  blendScreen,
  float,
  mix,
  mod,
  mx_cell_noise_float,
  oneMinus,
  pass,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl'

const VIBEY_ICON_SRC = '/Logos/logov2/icon-white.png'

const BRAND_EMERALD_RGB = { r: 52 / 255, g: 211 / 255, b: 153 / 255 } as const

function PostProcessing({
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}: {
  strength?: number
  threshold?: number
  fullScreenEffect?: boolean
}) {
  const { gl, scene, camera } = useThree()
  const progressRef = useRef<{ value: number }>({ value: 0 })

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl as unknown as THREE.WebGPURenderer)
    const scenePass = pass(scene, camera)
    const scenePassColor = scenePass.getTextureNode('output')
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold)

    const uScanProgress = uniform(0)
    progressRef.current = uScanProgress

    const scanPos = float(uScanProgress.value)
    const uvY = uv().y
    const scanWidth = float(0.05)
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)))
    const scanTint = vec3(
      float(BRAND_EMERALD_RGB.r),
      float(BRAND_EMERALD_RGB.g),
      float(BRAND_EMERALD_RGB.b),
    ).mul(oneMinus(scanLine)).mul(0.42)

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, scanTint),
      fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0,
    )

    const final = withScanEffect.add(bloomPass)

    postProcessing.outputNode = final

    return postProcessing
  }, [camera, gl, scene, strength, threshold, fullScreenEffect])

  useFrame(({ clock }) => {
    progressRef.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5
    void render.renderAsync()
  }, 1)

  return null
}

const PLANE_W = 300
const PLANE_H = 300

function Scene() {
  const brandMap = useTexture(VIBEY_ICON_SRC)

  const meshRef = useRef<Mesh>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (brandMap) setVisible(true)
  }, [brandMap])

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0))
    const uProgress = uniform(0)

    const strength = 0.01

    const tDepthMap = texture(brandMap)

    const tMap = texture(brandMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)))

    const aspect = float(PLANE_W).div(PLANE_H)
    const tUv = vec2(uv().x.mul(aspect), uv().y)

    const tiling = vec2(120.0)
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0)

    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2))

    const dist = float(tiledUv.length())
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness)

    const depth = tDepthMap

    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))))

    const emeraldAccent = vec3(
      float(BRAND_EMERALD_RGB.r),
      float(BRAND_EMERALD_RGB.g),
      float(BRAND_EMERALD_RGB.b),
    ).mul(float(11))

    const mask = dot.mul(flow).mul(emeraldAccent)

    const final = blendScreen(tMap, mask)

    const mat = new THREE.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    })

    return {
      material: mat,
      uniforms: {
        uPointer,
        uProgress,
      },
    }
  }, [brandMap])

  const [w, h] = useAspect(PLANE_W, PLANE_H)

  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshBasicNodeMaterial & { opacity: number }
      if ('opacity' in mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.07)
      }
    }
  })

  useFrame(({ pointer }) => {
    uniforms.uPointer.value = pointer
  })

  const scaleFactor = 0.4
  return (
    <mesh ref={meshRef} scale={[w * scaleFactor, h * scaleFactor, 1]} material={material}>
      <planeGeometry />
    </mesh>
  )
}

export function FunnelHeroPageOneWebGpu(props: {
  kicker: string
  title: string
  subtitle: string
  onScrollExplore?: () => void
}) {
  const titleWords = useMemo(() => props.title.trim().split(/\s+/).filter(Boolean), [props.title])
  const [visibleWords, setVisibleWords] = useState(0)
  const [subtitleVisible, setSubtitleVisible] = useState(false)
  const [delays, setDelays] = useState<number[]>([])
  const [subtitleDelay, setSubtitleDelay] = useState(0)
  const { resolvedTheme } = useTheme()
  const isLightShell = resolvedTheme === 'light'
  const canvasThemeKey = isLightShell ? 'light' : 'dark'

  useEffect(() => {
    setDelays(titleWords.map(() => Math.random() * 0.07))
    setSubtitleDelay(Math.random() * 0.1)
  }, [titleWords])

  useEffect(() => {
    if (visibleWords < titleWords.length) {
      const timeout = setTimeout(() => setVisibleWords((v) => v + 1), 600)
      return () => clearTimeout(timeout)
    }
    const timeout = setTimeout(() => setSubtitleVisible(true), 800)
    return () => clearTimeout(timeout)
  }, [visibleWords, titleWords.length])

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[var(--bg-deep)]">
      {/* Vignette — darkens the center where text sits, no visible edges */}
      <div className="funnel-p1-vignette pointer-events-none absolute inset-0 z-[55]" aria-hidden />

      <div className="pointer-events-none absolute inset-0 z-[60] flex h-full w-full flex-col items-center justify-center px-6 uppercase sm:px-10">
        {props.kicker ? (
          <span className="typo-caption text-secondary mb-3 block text-center font-semibold tracking-widest sm:mb-4">
            {props.kicker}
          </span>
        ) : null}
        <div className="funnel-p1-hero-title-text text-2xl font-extrabold text-white sm:text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 overflow-hidden sm:gap-x-4 lg:gap-x-6">
            {titleWords.map((word, index) => (
              <div
                key={`${word}-${index}`}
                className={index < visibleWords ? 'funnel-p1-fade-in-word' : ''}
                style={{
                  animationDelay: `${index * 0.13 + (delays[index] ?? 0)}s`,
                  opacity: index < visibleWords ? undefined : 0,
                }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>
        <div className="funnel-p1-hero-subtitle-text mt-2 w-full max-w-5xl overflow-hidden text-center text-xs font-bold text-white sm:text-lg md:text-xl xl:text-2xl 2xl:text-3xl">
          <div
            className={subtitleVisible ? 'funnel-p1-fade-in-subtitle' : ''}
            style={{
              animationDelay: `${titleWords.length * 0.13 + 0.2 + subtitleDelay}s`,
              opacity: subtitleVisible ? undefined : 0,
            }}
          >
            {props.subtitle}
          </div>
        </div>
      </div>

      <button type="button" className="funnel-p1-explore-btn" onClick={() => props.onScrollExplore?.()}>
        Scroll to explore
        <span className="funnel-p1-explore-arrow">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="funnel-p1-arrow-svg"
          >
            <path d="M11 5V17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 12L11 17L16 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <Canvas
        key={canvasThemeKey}
        className="h-full min-h-0 w-full"
        flat
        gl={async (canvasProps) => {
          const renderer = new THREE.WebGPURenderer(canvasProps as ConstructorParameters<typeof THREE.WebGPURenderer>[0])
          await renderer.init()
          return renderer
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(isLightShell ? 0xfaf9f6 : 0x000000, 1)
        }}
      >
        <Suspense fallback={null}>
          <PostProcessing fullScreenEffect />
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}

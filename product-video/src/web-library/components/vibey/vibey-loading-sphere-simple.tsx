'use client'

import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { createNoise3D } from 'simplex-noise'
import * as THREE from 'three'
import { AnimationState, getAnimationState } from './animation-states.config'

// Create noise instance (global, created once)
const noise3D = createNoise3D()

const DEFAULT_LIME = new THREE.Color(255 / 255, 205 / 255, 42 / 255)
const DEFAULT_LIME_LIGHT = new THREE.Color(255 / 255, 230 / 255, 150 / 255)
const DEFAULT_LIME_MID = new THREE.Color(255 / 255, 128 / 255, 48 / 255)

const VIBEY_SPHERE_ACCENT_COLORS = {
  lime: DEFAULT_LIME,
  light: DEFAULT_LIME_LIGHT,
  mid: DEFAULT_LIME_MID,
}

function useWebsiteSphereAccentColors() {
  return VIBEY_SPHERE_ACCENT_COLORS
}

// Simple ring data
interface RingData {
  radius: number
  speed: number
  rotation: [number, number, number]
  axis: THREE.Vector3
  color: THREE.Color
}

type SizeVariant = 'small' | 'medium' | 'large'

// Generate ring configurations based on size
function useRingData(
  size: SizeVariant,
  accent: { lime: THREE.Color; light: THREE.Color; mid: THREE.Color },
) {
  return useMemo<RingData[]>(() => {
    const rings: RingData[] = []

    // Adjust ring count based on size
    const innerCount = size === 'small' ? 2 : 4
    const outerCount = size === 'small' ? 3 : 6

    // Inner rings
    for (let i = 0; i < innerCount; i++) {
      const t = i / innerCount
      const radius = 0.3 + t * 0.2
      const colorVariation = Math.random()

      const color =
        colorVariation < 0.33 ? accent.lime : colorVariation < 0.66 ? accent.light : accent.mid

      rings.push({
        radius,
        speed: 0.1 + Math.random() * 0.2,
        rotation: [
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ],
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize(),
        color,
      })
    }

    // Outer rings
    for (let i = 0; i < outerCount; i++) {
      const t = i / outerCount
      const radius = 0.55 + t * 0.35
      const colorVariation = Math.random()

      const color =
        colorVariation < 0.33 ? accent.lime : colorVariation < 0.66 ? accent.light : accent.mid

      rings.push({
        radius,
        speed: 0.1 + Math.random() * 0.2,
        rotation: [
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        ],
        axis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize(),
        color,
      })
    }

    return rings
  }, [size, accent.lime, accent.light, accent.mid])
}

// Simple ring with streaming dots and oscillation
function SimpleRing({
  data,
  index,
  size,
  state = 'idle',
  bloomPulse = 1.0,
  isDark: _isDark = true,
}: {
  data: RingData
  index: number
  size: SizeVariant
  state?: AnimationState
  bloomPulse?: number // 1.0 = base, >1.0 = pulsing
  isDark?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!)
  const noiseOffset = useMemo(() => index * 10, [index])

  // Get target animation config for current state
  // Rings stay calm during all face expressions - use idle config
  const targetConfig = useMemo(() => {
    const isFaceExpression = state === 'smile' || state === 'focus' || state === 'wink'
    const effectiveState = isFaceExpression ? 'idle' : state
    return getAnimationState(effectiveState)
  }, [state])

  // Smooth transition between states with easing
  const currentSpeedRef = useRef(targetConfig.speedMultiplier)
  const currentOscillationStrengthRef = useRef(targetConfig.oscillationStrength)
  const currentOscillationSpeedRef = useRef(targetConfig.oscillationSpeed)

  // Track transition progress (0 = start, 1 = complete)
  const transitionProgressRef = useRef(1.0) // Start at 1.0 (no transition)
  const previousStateRef = useRef(state)

  // Store initial values when state changes
  const transitionStartValuesRef = useRef({
    speed: targetConfig.speedMultiplier,
    oscillationStrength: targetConfig.oscillationStrength,
    oscillationSpeed: targetConfig.oscillationSpeed,
  })

  // Oscillation base config (fixed randomization)
  const oscillationBaseConfig = useMemo(
    () => ({
      frequency: 2 + Math.random() * 5,
      baseAmplitude: 0.25 + Math.random() * 0.4,
      phaseOffset: Math.random() * Math.PI * 2,
      baseSpeed: 0.3 + Math.random() * 0.5,
    }),
    [],
  )

  // Adjust dot size and count based on size
  const sizeMultiplier = size === 'small' ? 2.5 : size === 'medium' ? 1.5 : 1.0

  // 500 dots per ring (instead of 5000)
  const dotsData = useMemo(() => {
    const dotCount = 500
    const dots = []
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2
      dots.push({
        angle,
        offset: Math.random() * Math.PI * 2,
        size: (0.002 + Math.random() * 0.002) * sizeMultiplier,
      })
    }
    return dots
  }, [sizeMultiplier])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  // Reusable vectors
  const normalVec = useMemo(() => new THREE.Vector3(), [])
  const wavePositionVec = useMemo(() => new THREE.Vector3(), [])

  useFrame((frameState, delta) => {
    const time = frameState.clock.elapsedTime

    // Detect animation state change and reset transition progress
    if (previousStateRef.current !== state) {
      // Capture current values as starting point for new transition
      transitionStartValuesRef.current = {
        speed: currentSpeedRef.current,
        oscillationStrength: currentOscillationStrengthRef.current,
        oscillationSpeed: currentOscillationSpeedRef.current,
      }
      transitionProgressRef.current = 0.0 // Start new transition
      previousStateRef.current = state
    }

    // Advance transition progress (0 → 1 over ~5 seconds for slower, smoother transitions)
    if (transitionProgressRef.current < 1.0) {
      transitionProgressRef.current = Math.min(1.0, transitionProgressRef.current + delta * 0.2)
    }

    // Cubic ease-in-out easing function
    // Slow start (0-30%), fast middle (30-70%), slow end (70-100%)
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    const easedProgress = easeInOutCubic(transitionProgressRef.current)

    // Interpolate from captured start values to target using eased progress
    currentSpeedRef.current =
      transitionStartValuesRef.current.speed +
      (targetConfig.speedMultiplier - transitionStartValuesRef.current.speed) * easedProgress
    currentOscillationStrengthRef.current =
      transitionStartValuesRef.current.oscillationStrength +
      (targetConfig.oscillationStrength - transitionStartValuesRef.current.oscillationStrength) *
        easedProgress
    currentOscillationSpeedRef.current =
      transitionStartValuesRef.current.oscillationSpeed +
      (targetConfig.oscillationSpeed - transitionStartValuesRef.current.oscillationSpeed) *
        easedProgress

    if (groupRef.current) {
      const isFaceExpression = state === 'smile' || state === 'focus' || state === 'wink'

      if (!isFaceExpression) {
        // Apply smoothly transitioning speed multiplier to rotation
        groupRef.current.rotateOnAxis(data.axis, delta * data.speed * currentSpeedRef.current)
      } else {
        // CRITICAL: During face expressions, smoothly reset rotation to forward-facing
        // This creates the beautiful effect of rings rotating back in unison as the face appears
        // The smooth reset ensures the face and rings align perfectly forward
        // DO NOT REMOVE - This synchronized rotation is essential for the face reveal animation
        const hasRotation =
          Math.abs(groupRef.current.rotation.x) > 0.001 ||
          Math.abs(groupRef.current.rotation.y) > 0.001 ||
          Math.abs(groupRef.current.rotation.z) > 0.001

        if (hasRotation) {
          const resetSpeed = 2.0 * delta
          groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * resetSpeed
          groupRef.current.rotation.y += (0 - groupRef.current.rotation.y) * resetSpeed
          groupRef.current.rotation.z += (0 - groupRef.current.rotation.z) * resetSpeed
        } else {
          groupRef.current.rotation.set(0, 0, 0)
        }
      }
    }

    if (instancedMeshRef.current) {
      // Calculate current oscillation values with smooth transitions
      const currentAmplitude =
        oscillationBaseConfig.baseAmplitude * currentOscillationStrengthRef.current
      const currentSpeed = oscillationBaseConfig.baseSpeed * currentOscillationSpeedRef.current

      dotsData.forEach((dot, i) => {
        // Apply smoothly transitioning speed multiplier to streaming
        const streamOffset = (time * 0.8 * currentSpeedRef.current + dot.offset) % (Math.PI * 2)
        const angle = dot.angle + streamOffset

        // Base circular position
        const baseX = Math.cos(angle) * data.radius
        const baseY = Math.sin(angle) * data.radius
        const baseZ = 0

        // Localized oscillation bulge (with smoothly transitioning state speed)
        const bulgeAngle = time * currentSpeed + oscillationBaseConfig.phaseOffset
        const angleFromBulge = angle - bulgeAngle
        const bulgeFactor = Math.cos(angleFromBulge * oscillationBaseConfig.frequency * 0.5)
        const waveOffset = Math.max(0, bulgeFactor) * currentAmplitude

        // Organic vibration (with smoothly transitioning state speed)
        const vibration =
          noise3D(time * 1.0 * currentSpeedRef.current, i * 0.05, noiseOffset) * 0.05

        // Apply wave perpendicular to circle
        normalVec.set(-Math.sin(angle), Math.cos(angle), 0).normalize()
        wavePositionVec
          .set(baseX, baseY, baseZ)
          .add(normalVec.multiplyScalar(waveOffset + vibration))

        dummy.position.copy(wavePositionVec)

        // Calculate how many particles to show based on bloom pulse
        // Base: 500, Pulse: up to 500 * bloomPulse (max ~1000 during strong pulse)
        const activeParticleCount = Math.min(500, Math.floor(500 * Math.min(bloomPulse, 2.0)))

        // Size variation with bloom pulse effect
        const sizePulse = 0.7 + Math.sin(streamOffset * 3.0) * 0.3
        const bulgeSizeMod = 0.8 + bulgeFactor * 0.5

        if (i < activeParticleCount) {
          // Active particles: normal size + subtle pulse effect
          const bloomSizeBoost = 1 + (bloomPulse - 1.0) * 0.3
          dummy.scale.setScalar(dot.size * sizePulse * bulgeSizeMod * bloomSizeBoost)
        } else {
          // Hidden particles: scale to 0
          dummy.scale.setScalar(0)
        }

        dummy.updateMatrix()
        instancedMeshRef.current.setMatrixAt(i, dummy.matrix)
      })
      instancedMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  const colorMultiplier = useMemo(
    () => [data.color.r * 2.0, data.color.g * 2.0, data.color.b * 2.0] as [number, number, number],
    [data.color],
  )

  return (
    <group ref={groupRef} rotation={data.rotation}>
      <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, 500]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          color={colorMultiplier}
          toneMapped={false}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}

// Simple core cluster (particle count based on size)
function SimpleCoreParticles({
  size,
  state = 'idle',
  isDark: _isDark = true,
}: {
  size: SizeVariant
  state?: AnimationState
  isDark?: boolean
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  // Get target animation config for current state
  const targetConfig = useMemo(() => getAnimationState(state), [state])

  // Smooth transition between states with easing (same as SimpleRing)
  const currentSpeedRef = useRef(targetConfig.speedMultiplier)
  const currentOscillationStrengthRef = useRef(targetConfig.oscillationStrength)

  // Track transition progress (0 = start, 1 = complete)
  const transitionProgressRef = useRef(1.0) // Start at 1.0 (no transition)
  const previousStateRef = useRef(state)

  // Store initial values when state changes
  const transitionStartValuesRef = useRef({
    speed: targetConfig.speedMultiplier,
    oscillationStrength: targetConfig.oscillationStrength,
  })

  // Track morphing progress from sphere to face (0 = sphere, 1 = face)
  const morphProgressRef = useRef(0.0)

  // Track expression transitions (smooth interpolation between face expressions)
  const previousExpressionStateRef = useRef<AnimationState>(state)
  const expressionTransitionProgressRef = useRef(1.0) // 1.0 = transition complete
  const previousExpressionPositionsRef = useRef<{ x: number; y: number; z: number }[]>([])

  // Adjust particle count and size based on size variant
  // Added 500 more particles for denser, more expressive eyes during facial expressions
  const particleCount = size === 'small' ? 550 : size === 'medium' ? 900 : 1100
  const sizeMultiplier = size === 'small' ? 2.0 : size === 'medium' ? 1.5 : 1.0
  const brightnessMultiplier = 1.0 // Same brightness for all sizes

  const particleData = useMemo(() => {
    const count = particleCount
    const data = []

    // EVE-style: Only eyes - 50% left eye, 50% right eye
    const leftEyeCount = Math.floor(count * 0.5)

    for (let i = 0; i < count; i++) {
      // Sphere position (original random distribution)
      const radius = Math.pow(Math.random(), 2) * 0.3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      const sphereX = radius * Math.sin(phi) * Math.cos(theta)
      const sphereY = radius * Math.sin(phi) * Math.sin(theta)
      const sphereZ = radius * Math.cos(phi)

      // Store random angle for this particle (consistent across expressions)
      const angle = Math.random() * Math.PI * 2
      const isLeftEye = i < leftEyeCount

      // Neutral eyes (smile state)
      const neutralOuterRadius = 0.14
      const neutralInnerRadius = 0.08
      const neutralRingRadius =
        neutralInnerRadius + Math.random() * (neutralOuterRadius - neutralInnerRadius)
      const neutralCenterX = isLeftEye ? -0.28 : 0.28
      const neutralEyeX = neutralCenterX + Math.cos(angle) * neutralRingRadius
      const neutralEyeY = 0.1 + Math.sin(angle) * neutralRingRadius
      const neutralEyeZ = (Math.random() - 0.5) * 0.02

      // Focus eyes (slightly narrower, taller - concentrated look)
      const focusOuterRadiusX = 0.12 // Narrower horizontally
      const focusOuterRadiusY = 0.15 // Taller vertically
      const focusInnerRadiusX = 0.07
      const focusInnerRadiusY = 0.09
      const focusRingRadiusX =
        focusInnerRadiusX + Math.random() * (focusOuterRadiusX - focusInnerRadiusX)
      const focusRingRadiusY =
        focusInnerRadiusY + Math.random() * (focusOuterRadiusY - focusInnerRadiusY)
      const focusCenterX = isLeftEye ? -0.28 : 0.28
      const focusEyeX = focusCenterX + Math.cos(angle) * focusRingRadiusX
      const focusEyeY = 0.1 + Math.sin(angle) * focusRingRadiusY
      const focusEyeZ = (Math.random() - 0.5) * 0.02

      // Wink (left eye becomes horizontal line, right eye stays neutral)
      let winkEyeX, winkEyeY, winkEyeZ
      if (isLeftEye) {
        // Left eye: horizontal line from -0.35 to -0.21
        const lineProgress = Math.random()
        winkEyeX = -0.35 + lineProgress * 0.14 // Line width: 0.14
        winkEyeY = 0.1 + (Math.random() - 0.5) * 0.02 // Slight thickness
        winkEyeZ = (Math.random() - 0.5) * 0.01
      } else {
        // Right eye: stays neutral circle
        winkEyeX = neutralEyeX
        winkEyeY = neutralEyeY
        winkEyeZ = neutralEyeZ
      }

      const particleSize = (0.008 + Math.random() * 0.012) * sizeMultiplier
      const speed = 0.1 + Math.random() * 0.2

      const color: [number, number, number] = [
        1.8 * brightnessMultiplier,
        2.2 * brightnessMultiplier,
        0.8 * brightnessMultiplier,
      ]

      data.push({
        // Sphere position
        sphereX,
        sphereY,
        sphereZ,
        // Neutral eyes position (smile state)
        neutralEyeX,
        neutralEyeY,
        neutralEyeZ,
        // Focus eyes position
        focusEyeX,
        focusEyeY,
        focusEyeZ,
        // Wink position
        winkEyeX,
        winkEyeY,
        winkEyeZ,
        // Original properties
        size: particleSize,
        speed,
        theta,
        phi,
        radius,
        color,
        isLeftEye,
      })
    }

    return data
  }, [particleCount, sizeMultiplier, brightnessMultiplier])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorTemp = useMemo(() => new THREE.Color(), [])

  useFrame((frameState, delta) => {
    if (meshRef.current) {
      const time = frameState.clock.elapsedTime

      // Cubic ease-in-out easing function
      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }

      // Detect animation state change and reset transition progress
      if (previousStateRef.current !== state) {
        // Capture current values as starting point for new transition
        transitionStartValuesRef.current = {
          speed: currentSpeedRef.current,
          oscillationStrength: currentOscillationStrengthRef.current,
        }
        transitionProgressRef.current = 0.0 // Start new transition
        previousStateRef.current = state
      }

      // Advance transition progress (0 → 1 over ~3 seconds)
      if (transitionProgressRef.current < 1.0) {
        transitionProgressRef.current = Math.min(1.0, transitionProgressRef.current + delta * 0.33)
      }

      const easedProgress = easeInOutCubic(transitionProgressRef.current)

      // Interpolate from captured start values to target using eased progress
      currentSpeedRef.current =
        transitionStartValuesRef.current.speed +
        (targetConfig.speedMultiplier - transitionStartValuesRef.current.speed) * easedProgress
      currentOscillationStrengthRef.current =
        transitionStartValuesRef.current.oscillationStrength +
        (targetConfig.oscillationStrength - transitionStartValuesRef.current.oscillationStrength) *
          easedProgress

      // Detect expression state changes (between face expressions)
      const isFaceExpression = (s: AnimationState) => s === 'smile' || s === 'focus' || s === 'wink'
      const previousWasFace = isFaceExpression(previousExpressionStateRef.current)
      const currentIsFace = isFaceExpression(state)

      if (previousExpressionStateRef.current !== state && previousWasFace && currentIsFace) {
        // Transitioning between face expressions - capture TARGET positions from previous state
        expressionTransitionProgressRef.current = 0.0
        const prevState = previousExpressionStateRef.current
        previousExpressionPositionsRef.current = particleData.map((particle) => {
          // Get the target positions for the PREVIOUS state (not rendered positions)
          if (prevState === 'smile') {
            return { x: particle.neutralEyeX, y: particle.neutralEyeY, z: particle.neutralEyeZ }
          } else if (prevState === 'focus') {
            return { x: particle.focusEyeX, y: particle.focusEyeY, z: particle.focusEyeZ }
          } else if (prevState === 'wink') {
            return { x: particle.winkEyeX, y: particle.winkEyeY, z: particle.winkEyeZ }
          } else {
            return { x: particle.neutralEyeX, y: particle.neutralEyeY, z: particle.neutralEyeZ }
          }
        })
      }

      if (previousExpressionStateRef.current !== state) {
        previousExpressionStateRef.current = state
      }

      // Advance expression transition progress
      if (expressionTransitionProgressRef.current < 1.0) {
        expressionTransitionProgressRef.current = Math.min(
          1.0,
          expressionTransitionProgressRef.current + delta * 1.2,
        )
      }

      const expressionEasedProgress = easeInOutCubic(expressionTransitionProgressRef.current)

      // Morph progress: 0 = sphere, 1 = face (smooth transition)
      const targetMorph = currentIsFace ? 1.0 : 0.0

      // Smooth lerp towards target morph
      const morphLerpSpeed = 2.5 * delta
      if (Math.abs(morphProgressRef.current - targetMorph) > 0.001) {
        morphProgressRef.current += (targetMorph - morphProgressRef.current) * morphLerpSpeed
      } else {
        morphProgressRef.current = targetMorph
      }

      // Apply easing to morph
      const easedMorph = easeInOutCubic(Math.max(0, Math.min(1, morphProgressRef.current)))

      particleData.forEach((particle, i) => {
        const offset = i * 0.01

        // Calculate breathing effect
        const breatheStrength = currentOscillationStrengthRef.current
        const breathe =
          1 + noise3D(time * 0.6 * currentSpeedRef.current, i * 0.05, 100) * 0.2 * breatheStrength
        const r = particle.radius * breathe

        // Get target expression position based on current state
        let targetExpressionX, targetExpressionY, targetExpressionZ
        if (state === 'smile') {
          targetExpressionX = particle.neutralEyeX
          targetExpressionY = particle.neutralEyeY
          targetExpressionZ = particle.neutralEyeZ
        } else if (state === 'focus') {
          targetExpressionX = particle.focusEyeX
          targetExpressionY = particle.focusEyeY
          targetExpressionZ = particle.focusEyeZ
        } else if (state === 'wink') {
          targetExpressionX = particle.winkEyeX
          targetExpressionY = particle.winkEyeY
          targetExpressionZ = particle.winkEyeZ
        } else {
          targetExpressionX = particle.neutralEyeX
          targetExpressionY = particle.neutralEyeY
          targetExpressionZ = particle.neutralEyeZ
        }

        // If transitioning between face expressions, interpolate from previous expression
        let currentExpressionX = targetExpressionX
        let currentExpressionY = targetExpressionY
        let currentExpressionZ = targetExpressionZ

        if (previousWasFace && currentIsFace && previousExpressionPositionsRef.current.length > 0) {
          const prevPos = previousExpressionPositionsRef.current[i]
          if (prevPos) {
            currentExpressionX =
              prevPos.x + (targetExpressionX - prevPos.x) * expressionEasedProgress
            currentExpressionY =
              prevPos.y + (targetExpressionY - prevPos.y) * expressionEasedProgress
            currentExpressionZ =
              prevPos.z + (targetExpressionZ - prevPos.z) * expressionEasedProgress
          }
        }

        let finalX, finalY, finalZ

        if (currentIsFace) {
          // In any face state - ALWAYS use expression positions (no rotation ever)
          // Morph controls transition from sphere to face
          if (easedMorph > 0.99) {
            // Fully morphed to face - use expression directly
            finalX = currentExpressionX
            finalY = currentExpressionY
            finalZ = currentExpressionZ
          } else {
            // Transitioning to face - interpolate from forward-facing sphere
            const forwardSphereX = r * Math.sin(particle.phi) * Math.cos(particle.theta)
            const forwardSphereY = r * Math.sin(particle.phi) * Math.sin(particle.theta)
            const forwardSphereZ = r * Math.cos(particle.phi)

            finalX = forwardSphereX * (1 - easedMorph) + currentExpressionX * easedMorph
            finalY = forwardSphereY * (1 - easedMorph) + currentExpressionY * easedMorph
            finalZ = forwardSphereZ * (1 - easedMorph) + currentExpressionZ * easedMorph
          }
        } else if (easedMorph < 0.01) {
          // Fully in idle/sphere mode - use rotating sphere
          const newTheta =
            particle.theta + time * particle.speed * 0.15 * currentSpeedRef.current + offset
          const wobble = noise3D(time * 0.4 * currentSpeedRef.current, i * 0.1, 0) * 0.2
          const newPhi = particle.phi + wobble

          finalX = r * Math.sin(newPhi) * Math.cos(newTheta)
          finalY = r * Math.sin(newPhi) * Math.sin(newTheta)
          finalZ = r * Math.cos(newPhi)
        } else {
          // Transitioning FROM face back to sphere - smooth interpolation from expression to forward-facing sphere
          const forwardSphereX = r * Math.sin(particle.phi) * Math.cos(particle.theta)
          const forwardSphereY = r * Math.sin(particle.phi) * Math.sin(particle.theta)
          const forwardSphereZ = r * Math.cos(particle.phi)

          // Interpolate from last expression position to forward-facing sphere
          // easedMorph goes from 1.0 → 0.0 when leaving face state
          finalX = currentExpressionX * easedMorph + forwardSphereX * (1 - easedMorph)
          finalY = currentExpressionY * easedMorph + forwardSphereY * (1 - easedMorph)
          finalZ = currentExpressionZ * easedMorph + forwardSphereZ * (1 - easedMorph)
        }

        dummy.position.set(finalX, finalY, finalZ)

        // Enhanced pulse effect with smooth transition
        const pulseSpeed = 3.0 * currentSpeedRef.current
        const pulseStrength = 0.2 * currentOscillationStrengthRef.current
        const pulse = 1 - pulseStrength + pulseStrength * Math.sin(time * pulseSpeed + i * 0.1)
        dummy.scale.setScalar(particle.size * pulse)

        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)

        colorTemp.setRGB(particle.color[0], particle.color[1], particle.color[2])
        meshRef.current.setColorAt(i, colorTemp)
      })

      meshRef.current.instanceMatrix.needsUpdate = true
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true
      }
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 10, 10]} />
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

// Dark circular background plane (for light theme) - COMMENTED OUT for transparent background
// function DarkBackgroundPlane({ showBackground }: { showBackground: boolean }) {
//   if (!showBackground) return null
//
//   return (
//     <mesh position={[0, 0, -2]} rotation={[0, 0, 0]}>
//       <circleGeometry args={[4, 64]} />
//       <meshBasicMaterial color={0x0d0d0d} toneMapped={false} />
//     </mesh>
//   )
// }

// Main sphere scene
function SimpleVibeyScene({
  size,
  state = 'idle',
  bloomPulse = 1.0,
  showBackground: _showBackground = false,
}: {
  size: SizeVariant
  state?: AnimationState
  bloomPulse?: number
  showBackground?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const sphereAccents = useWebsiteSphereAccentColors()
  const rings = useRingData(size, sphereAccents)

  // Get target animation config for current state
  // Scene rotation stays calm during all face expressions - use idle config
  const targetConfig = useMemo(() => {
    const isFaceExpression = state === 'smile' || state === 'focus' || state === 'wink'
    const effectiveState = isFaceExpression ? 'idle' : state
    return getAnimationState(effectiveState)
  }, [state])

  // Smooth transition for scene rotation speed
  const currentSceneSpeedRef = useRef(targetConfig.speedMultiplier)

  useFrame((_frameState, delta) => {
    // Smooth lerp towards target speed
    const lerpSpeed = 2.0 * delta
    currentSceneSpeedRef.current +=
      (targetConfig.speedMultiplier - currentSceneSpeedRef.current) * lerpSpeed

    if (groupRef.current) {
      const isFaceExpression = state === 'smile' || state === 'focus' || state === 'wink'

      if (!isFaceExpression) {
        // Normal rotation during idle
        groupRef.current.rotation.y += delta * 0.05 * currentSceneSpeedRef.current
      } else {
        // CRITICAL: During face expressions, smoothly rotate back to 0 (forward-facing)
        // This creates the beautiful effect of the entire scene rotating back in unison as the face appears
        // The smooth reset ensures perfect forward-facing alignment
        // DO NOT REMOVE - This synchronized rotation is essential for the face reveal animation
        if (Math.abs(groupRef.current.rotation.y) > 0.001) {
          groupRef.current.rotation.y += (0 - groupRef.current.rotation.y) * lerpSpeed
        } else {
          groupRef.current.rotation.y = 0
        }
      }
    }
  })

  return (
    <>
      {/* Dark circular background - COMMENTED OUT for transparent background */}
      {/* <DarkBackgroundPlane showBackground={showBackground} /> */}

      <group ref={groupRef}>
        {/* Core particles */}
        <SimpleCoreParticles size={size} state={state} />

        {/* Animated rings */}
        {rings.map((ring, i) => (
          <SimpleRing
            key={i}
            data={ring}
            index={i}
            size={size}
            state={state}
            bloomPulse={bloomPulse}
          />
        ))}
      </group>
    </>
  )
}

// Helper component to calculate animated bloom intensity
function BloomIntensityController({
  baseIntensity,
  state,
  onIntensityChange,
}: {
  baseIntensity: number
  state: AnimationState
  onIntensityChange: (intensity: number) => void
}) {
  // Random phase offset for non-sync timing
  const phaseOffset = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame((frameState) => {
    const time = frameState.clock.elapsedTime

    // Pulse configuration based on state (stronger for dramatic "insight" moments)
    let pulseSpeed = 0
    let pulseStrength = 0

    if (state === 'processing') {
      pulseSpeed = 1.2
      pulseStrength = 1.5 // Increased from 0.8 for stronger bursts
    } else if (state === 'thinking') {
      pulseSpeed = 0.6
      pulseStrength = 2.0 // Increased from 1.2 for deep insight moments
    } else if (state === 'streaming') {
      pulseSpeed = 2.0
      pulseStrength = 3 // Increased from 0.9 for intense activity
    }

    // Calculate organic pulsing with noise (only goes UP, never below base)
    if (pulseStrength > 0) {
      const noiseValue = noise3D(time * pulseSpeed * 0.3, phaseOffset, 0)
      const sineWave = Math.sin(time * pulseSpeed + phaseOffset)
      const combined = noiseValue * 0.4 + sineWave * 0.6
      const pulse = Math.max(0, combined)
      const newIntensity = baseIntensity * (1 + pulse * pulseStrength)

      // Debug log for extreme values (remove after testing)
      if (state === 'streaming' && newIntensity > 2.0) {
      }

      onIntensityChange(newIntensity)
    } else {
      onIntensityChange(baseIntensity)
    }
  })

  return null
}

// Animated Bloom component that pulses intensity with random organic bursts
function AnimatedBloom({
  baseIntensity,
  threshold,
  radius,
  state,
  onPulseChange,
}: {
  baseIntensity: number
  threshold: number
  radius: number
  state: AnimationState
  onPulseChange?: (pulse: number) => void
}) {
  const [currentIntensity, setCurrentIntensity] = useState(baseIntensity)

  // Notify parent of pulse changes
  const handleIntensityChange = (intensity: number) => {
    setCurrentIntensity(intensity)
    // Calculate pulse multiplier (1.0 = base, 2.0 = double intensity, etc.)
    if (onPulseChange && baseIntensity > 0) {
      onPulseChange(intensity / baseIntensity)
    }
  }

  return (
    <>
      <BloomIntensityController
        baseIntensity={baseIntensity}
        state={state}
        onIntensityChange={handleIntensityChange}
      />
      <Bloom
        intensity={currentIntensity}
        luminanceThreshold={threshold}
        luminanceSmoothing={0.025}
        mipmapBlur
        radius={radius}
      />
    </>
  )
}

// Main export component with wave background
export function VibeyLoadingSphereSimple({
  size = 'medium',
  state = 'idle',
  showBackground: _showBackground = true,
}: {
  size?: SizeVariant
  state?: AnimationState
  showBackground?: boolean // Controls dark background circle and pulse in light theme
}) {
  // Get animation config for current state
  const animConfig = useMemo(() => getAnimationState(state), [state])
  const [canvasReady, setCanvasReady] = useState(false)
  const [bloomPulse, setBloomPulse] = useState(1.0)

  // Adjust bloom settings based on state only (consistent 0.5 for all sizes)
  const baseSizeBloom = 0.5
  const bloomIntensity = baseSizeBloom * (animConfig.bloomIntensity / 0.5) // Normalize to 0.5 baseline
  const bloomThreshold = animConfig.bloomThreshold
  const bloomRadius = 0.6 // Wider spread for soft natural glow

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Dark pulsing ring - COMMENTED OUT for transparent background */}
      {/* {showBackground && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, var(--bg-deep-dark) 0%, var(--bg-deep-dark) 100%)',
          animation: 'pulse-ring-dark 2.5s ease-in-out infinite',
          zIndex: 0,
          pointerEvents: 'none',
          borderRadius: '100%'
        }} />
      )} */}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 3], fov: 35 }}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            border: 'none',
            outline: 'none',
          }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            alpha: true,
            preserveDrawingBuffer: true,
          }}
          onCreated={(state) => {
            // Keep canvas/composer transparent so bloom does not tint a fullscreen quad
            if (state.gl) {
              state.gl.setClearColor(0x000000, 0)
              state.scene.background = null
              // Mark canvas as ready after a small delay to ensure renderer is fully initialized
              setTimeout(() => setCanvasReady(true), 100)
            }
          }}
          dpr={[1, 2]}
          frameloop="always"
        >
          <group scale={0.9}>
            <SimpleVibeyScene
              size={size}
              state={state}
              bloomPulse={bloomPulse}
              showBackground={_showBackground}
            />
          </group>
          {/* Bloom effect (very weak) */}
          {canvasReady && (
            <EffectComposer multisampling={0} autoClear={false}>
              <Bloom
                intensity={Math.max(0.12, bloomIntensity * 0.05)}
                luminanceThreshold={Math.max(0.8, bloomThreshold + 0.2)}
                luminanceSmoothing={0.5}
                mipmapBlur={false}
                radius={0.9}
              />
            </EffectComposer>
          )}
        </Canvas>
      </div>
    </div>
  )
}

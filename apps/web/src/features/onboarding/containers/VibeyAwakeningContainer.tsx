'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Volume2 } from 'lucide-react'
import * as THREE from 'three'
import { VibeyLoadingSphereSimple } from '@/components/vibey/vibey-loading-sphere-simple'
import { AnimationController } from '@/features/onboarding/components/awakening/AnimationController'
import { AwakeningScene } from '@/features/onboarding/components/awakening/AwakeningScene'
import { GridZapEffect } from '@/features/onboarding/components/GridZapEffect'
import { TurnOnButton } from '@/features/onboarding/components/TurnOnButton'
import type { AnimationPhase } from '@/features/onboarding/types/awakening.types'

interface VibeyAwakeningContainerProps {
  onContinue?: () => void | Promise<void>
}

export function VibeyAwakeningContainer({ onContinue }: VibeyAwakeningContainerProps) {
  const [phase, setPhase] = useState<AnimationPhase>('spark')
  const [phaseProgress, setPhaseProgress] = useState(0)
  const [showText, setShowText] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [isTurnOnButtonHovered, setIsTurnOnButtonHovered] = useState(false)
  const [showIdleAnimation, setShowIdleAnimation] = useState(false)
  const [showBackground, setShowBackground] = useState(false)
  const [awakeningComplete, setAwakeningComplete] = useState(false)
  const [subtitleLetters, setSubtitleLetters] = useState(0)
  const [showTurnOnButton, setShowTurnOnButton] = useState(true)
  const [animationStarted, setAnimationStarted] = useState(false)
  const [showWatchAgain, setShowWatchAgain] = useState(false)
  const fullSoundRef = useRef<HTMLAudioElement>(null)
  const soundPlayedRef = useRef(false)

  const handlePhaseChange = (newPhase: AnimationPhase, progress: number) => {
    setPhase(newPhase)
    setPhaseProgress(progress)
  }

  const hasCompletedRef = useRef(false)

  const handleStartClick = useCallback(() => {
    void onContinue?.()
  }, [onContinue])

  const handleTurnOn = () => {
    if (fullSoundRef.current && !soundPlayedRef.current) {
      soundPlayedRef.current = true
      void fullSoundRef.current.play()
    }
    setIsTurnOnButtonHovered(false)
    setShowTurnOnButton(false)
    setAnimationStarted(true)
  }

  const handleAnimationComplete = useCallback(() => {
    if (hasCompletedRef.current) return
    hasCompletedRef.current = true
    setAwakeningComplete(true)
    setShowText(true)
    setTimeout(() => {
      setShowBackground(true)
      setShowIdleAnimation(true)
      setSubtitleLetters(1)
      setTimeout(() => setSubtitleLetters(2), 500)
      setTimeout(() => setSubtitleLetters(3), 1000)
      setTimeout(() => setShowButton(true), 6000)
    }, 1500)
  }, [])

  useEffect(() => {
    if (showButton) {
      const timer = setTimeout(() => setShowWatchAgain(true), 1000)
      return () => clearTimeout(timer)
    }
    setShowWatchAgain(false)
    return undefined
  }, [showButton])

  const handleWatchAgain = useCallback(() => {
    setShowWatchAgain(false)
    setShowButton(false)
    setShowText(false)
    setShowBackground(false)
    setShowIdleAnimation(false)
    setSubtitleLetters(0)
    setAwakeningComplete(false)
    hasCompletedRef.current = false
    setPhase('spark')
    setPhaseProgress(0)
    setAnimationStarted(false)
    soundPlayedRef.current = false
    if (fullSoundRef.current) fullSoundRef.current.currentTime = 0
    setShowTurnOnButton(true)
  }, [])

  const IDLE_BLOOM = 0.5
  const bloomIntensity =
    phase === 'spark'
      ? 0.3
      : phase === 'split'
        ? 0.4
        : phase === 'expansion'
          ? 0.5 + phaseProgress * 0.3
          : phase === 'architecture'
            ? 0.8
            : phase === 'hi'
              ? 0.6
              : phase === 'collapse'
                ? 0.6 * (1 - phaseProgress * 0.2)
                : IDLE_BLOOM

  const containerSize = awakeningComplete ? 200 : 360

  return (
    <div className="tpl-surface--light fixed inset-0 z-[15] h-full w-full overflow-hidden">
      {animationStarted && (
        <AnimationController
          onPhaseChange={handlePhaseChange}
          onAnimationComplete={handleAnimationComplete}
        />
      )}

      {showBackground && (
        <>
          <div
            className="tpl-layer tpl-layer--spotlight"
            style={{
              animation:
                'vibey-awakening-pulse-slow 8s ease-in-out infinite, vibey-awakening-fade-in 4s ease-out',
            }}
          />
          <div
            className="tpl-layer tpl-layer--blobs"
            style={{
              animation:
                'vibey-awakening-pulse-slower 12s ease-in-out infinite 2s, vibey-awakening-fade-in 4s ease-out',
            }}
          />
          <div
            className="tpl-layer tpl-layer--vignette"
            style={{
              animation:
                'vibey-awakening-pulse-medium 10s ease-in-out infinite 4s, vibey-awakening-fade-in 4s ease-out',
            }}
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backgroundImage: `
                linear-gradient(to right, currentColor 1px, transparent 1px),
                linear-gradient(to bottom, currentColor 1px, transparent 1px)
              `,
              backgroundSize: '64px 64px',
              color: 'var(--foreground)',
              opacity: 0.03,
              animation: 'vibey-awakening-fade-in-grid 4s ease-out',
            }}
          />
          <div style={{ animation: 'vibey-awakening-fade-in 4s ease-out' }}>
            <GridZapEffect />
          </div>
        </>
      )}

      <div className="p-spacing-6 relative z-20 flex min-h-screen items-center justify-center">
        {showTurnOnButton && (
          <>
            <TurnOnButton
              onClick={handleTurnOn}
              isHovered={isTurnOnButtonHovered}
              onHoverChange={setIsTurnOnButtonHovered}
            />
            <div className="z-dropdown right-spacing-6 top-spacing-16 fixed flex flex-col items-end">
              <div
                className="gap-spacing-2 px-spacing-4 py-spacing-2 flex items-center rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(217, 175, 66, 0.2) 0%, rgba(217, 175, 66, 0.1) 100%)',
                  border: '1px solid rgba(217, 175, 66, 0.4)',
                  boxShadow: '0 2px 8px rgba(217, 175, 66, 0.2)',
                }}
              >
                <Volume2 className="icon-sm" style={{ color: 'rgb(217, 175, 66)' }} />
                <span className="body-3 font-medium" style={{ color: 'rgb(217, 175, 66)' }}>
                  Turn Audio On
                </span>
              </div>
            </div>
          </>
        )}

        {!showTurnOnButton && (
          <div className="flex w-full flex-col items-center">
            <div className="w-full max-w-[480px]">
              <div className="text-center">
                <div
                  className="mb-spacing-3 mx-auto"
                  style={{
                    width: `min(${containerSize}px, calc(100vw - 3rem))`,
                    height: `min(${containerSize}px, calc(100vw - 3rem))`,
                    position: 'relative',
                  }}
                >
                  {!awakeningComplete && animationStarted && (
                    <Canvas
                      camera={{ position: [0, 0, 3], fov: 35 }}
                      gl={{
                        antialias: true,
                        toneMapping: THREE.ACESFilmicToneMapping,
                        toneMappingExposure: 1.0,
                        alpha: true,
                      }}
                      onCreated={(state) => {
                        if (state.gl) {
                          state.gl.setClearColor(0x000000, 0)
                          state.scene.background = null
                          setTimeout(() => setCanvasReady(true), 100)
                        }
                      }}
                      dpr={[1, 2]}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <AwakeningScene
                        phase={phase}
                        phaseProgress={phaseProgress}
                        buttonHovered={isButtonHovered}
                        speedMultiplier={1}
                        oscillationStrength={1}
                      />
                      {canvasReady && (
                        <EffectComposer multisampling={0}>
                          <Bloom
                            intensity={bloomIntensity}
                            luminanceThreshold={1.3}
                            luminanceSmoothing={0.9}
                            mipmapBlur
                            radius={0.3}
                          />
                        </EffectComposer>
                      )}
                    </Canvas>
                  )}
                  <div
                    style={{
                      position: showIdleAnimation ? 'static' : 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: showIdleAnimation ? 1 : 0,
                      transition: 'opacity 4s ease-in',
                      pointerEvents: showIdleAnimation ? 'auto' : 'none',
                    }}
                  >
                    <VibeyLoadingSphereSimple size="small" state="idle" showBackground={false} />
                  </div>
                </div>

                <h1
                  className="onboarding-awakening-hero-primary"
                  style={{
                    background:
                      'linear-gradient(90deg, rgb(var(--vibe-green-dark)) 0%, rgb(var(--vibe-green)) 50%, rgb(var(--vibe-green-light)) 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    visibility: showText ? 'visible' : 'hidden',
                    transition: 'opacity 400ms ease-out',
                  }}
                >
                  PIXEL
                </h1>
              </div>
            </div>

            {showText && (
              <h2
                className="onboarding-awakening-hero-sub mt-spacing-4"
                style={{
                  transition: 'opacity 400ms ease-out',
                }}
              >
                {'JUST FLOW'.split('').map((letter, index) => {
                  const batch1 = [2, 5, 7]
                  const batch2 = [0, 3, 6]
                  const batch3 = [1, 4, 8]
                  let isVisible = false
                  if (subtitleLetters >= 3 && batch3.includes(index)) isVisible = true
                  else if (subtitleLetters >= 2 && batch2.includes(index)) isVisible = true
                  else if (subtitleLetters >= 1 && batch1.includes(index)) isVisible = true
                  return (
                    <span
                      key={index}
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transition: 'opacity 3s ease-in',
                        display: 'inline',
                        whiteSpace: letter === ' ' ? 'pre' : 'normal',
                      }}
                    >
                      {letter}
                    </span>
                  )
                })}
              </h2>
            )}

            {awakeningComplete && (
              <>
                <div style={{ height: '48px' }} />
                <button
                  type="button"
                  onClick={handleStartClick}
                  onMouseEnter={(e) => {
                    setIsButtonHovered(true)
                    if (showButton) {
                      e.currentTarget.style.animation = 'button-pulse-glow 2s ease-in-out infinite'
                    }
                  }}
                  onMouseLeave={(e) => {
                    setIsButtonHovered(false)
                    e.currentTarget.style.animation = 'none'
                    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(217, 252, 103, 0.7)'
                  }}
                  className="button-glass-accent title-h2 px-spacing-12 py-spacing-4 relative cursor-pointer rounded-xl font-medium transition-all duration-300"
                  style={{
                    opacity: showButton ? 1 : 0,
                    transition: 'opacity 0.4s ease-out',
                    pointerEvents: showButton ? 'auto' : 'none',
                    boxShadow: '0 0 0 0 rgba(217, 252, 103, 0.7)',
                  }}
                >
                  <span className="relative z-10">START</span>
                </button>
                <button
                  type="button"
                  onClick={handleWatchAgain}
                  className="body-2 onboarding-awakening-watch-again mt-spacing-4 cursor-pointer font-medium transition-opacity duration-300"
                  style={{
                    opacity: showWatchAgain ? 1 : 0,
                    transition: 'opacity 0.4s ease-out',
                    pointerEvents: showWatchAgain ? 'auto' : 'none',
                  }}
                >
                  <span className="relative z-10">Watch Again</span>
                </button>
              </>
            )}

            <div style={{ height: awakeningComplete ? '113px' : '0px' }} />
          </div>
        )}
      </div>

      <audio ref={fullSoundRef} src="/SFX/Full Sound.WAV" preload="auto" />
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { AnimationPhase } from '../../types/awakening.types'

interface AnimationControllerProps {
  onPhaseChange: (phase: AnimationPhase, progress: number) => void
  onAnimationComplete?: () => void
}

export function AnimationController({
  onPhaseChange,
  onAnimationComplete,
}: AnimationControllerProps) {
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000

      if (elapsed < 2) {
        onPhaseChange('spark', elapsed / 2)
      } else if (elapsed < 6) {
        onPhaseChange('split', (elapsed - 2) / 4)
      } else if (elapsed < 8) {
        onPhaseChange('expansion', (elapsed - 6) / 2)
      } else if (elapsed < 9.5) {
        onPhaseChange('architecture', (elapsed - 8) / 1.5)
      } else if (elapsed < 12.5) {
        onPhaseChange('hi', (elapsed - 9.5) / 3)
      } else if (elapsed < 14.5) {
        onPhaseChange('collapse', (elapsed - 12.5) / 2)
      } else {
        clearInterval(interval)
        if (onAnimationComplete) onAnimationComplete()
      }
    }, 16)

    return () => clearInterval(interval)
  }, [onPhaseChange, onAnimationComplete])

  return null
}

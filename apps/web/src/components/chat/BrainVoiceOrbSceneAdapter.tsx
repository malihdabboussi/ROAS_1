'use client'

import dynamic from 'next/dynamic'
import type { MutableRefObject } from 'react'
import type { OrbAnimationState } from '@/features/brain/components/BrainVoiceOrbScene'

export type { OrbAnimationState }

export interface BrainVoiceOrbSceneAdapterProps {
  animationState: OrbAnimationState
  audioLevel?: number
  audioLevelRef?: MutableRefObject<number>
  size?: 'mini' | 'full'
  enableMouseRepulsion?: boolean
}

export const BrainVoiceOrbScene = dynamic<BrainVoiceOrbSceneAdapterProps>(
  () =>
    import('@/features/brain/components/BrainVoiceOrbScene').then((module) => ({
      default: module.BrainVoiceOrbScene,
    })),
  { ssr: false },
)

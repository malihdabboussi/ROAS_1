'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const BrainVoiceOrbScene = dynamic(
  () => import('./BrainVoiceOrbScene').then((m) => ({ default: m.BrainVoiceOrbScene })),
  { ssr: false },
)

interface BrainVoiceTriggerProps {
  onActivate: () => void
}

export function BrainVoiceTrigger({ onActivate }: BrainVoiceTriggerProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={onActivate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full transition-transform duration-300 hover:scale-110"
      style={{
        background:
          'radial-gradient(circle at 40% 40%, rgba(217,252,103,0.06), rgba(0,0,0,0.5) 70%)',
        border: '1.5px solid rgba(217,252,103,0.3)',
        boxShadow: hovered
          ? '0 0 24px 4px rgba(217,252,103,0.25), 0 4px 20px rgba(0,0,0,0.5)'
          : '0 0 12px 2px rgba(217,252,103,0.1), 0 4px 16px rgba(0,0,0,0.4)',
      }}
      title="Talk to Atlas"
    >
      <div className="absolute" style={{ inset: '-40%' }}>
        <BrainVoiceOrbScene animationState="idle" audioLevel={0} size="mini" />
      </div>
    </button>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { VibeyChatOrb, type OrbAnimationStyle } from './vibey-chat-orb'

const ANIMATION_STYLES: OrbAnimationStyle[] = [
  'elastic',
  'trails',
  'constellation',
  'liquid',
  'firefly',
]

interface VibeyLoadingOrbProps {
  text?: string
  state?: 'idle' | 'processing' | 'thinking' | 'streaming'
  cycleInterval?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function VibeyLoadingOrb({
  text,
  state = 'processing',
  cycleInterval = 3000,
  className,
  size = 'md',
}: VibeyLoadingOrbProps) {
  const [styleIndex, setStyleIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStyleIndex((prev) => (prev + 1) % ANIMATION_STYLES.length)
    }, cycleInterval)
    return () => clearInterval(interval)
  }, [cycleInterval])

  const currentStyle = ANIMATION_STYLES[styleIndex]

  const sizeClasses = { sm: 'w-8 h-8', md: 'w-14 h-14', lg: 'w-24 h-24' }
  const scaleClasses = { sm: 'scale-[1.5]', md: 'scale-[2.5]', lg: 'scale-[3.5]' }

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ''}`}>
      <div className={`flex items-center justify-center ${sizeClasses[size]}`}>
        <div className={scaleClasses[size]}>
          <VibeyChatOrb state={state} style={currentStyle} cycleDuration={cycleInterval} />
        </div>
      </div>
      {text && <p className="body-2 text-shimmer-gradient">{text}</p>}
    </div>
  )
}

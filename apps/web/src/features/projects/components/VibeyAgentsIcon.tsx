'use client'

import Image from 'next/image'

interface VibeyAgentsIconProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = { sm: 20, md: 48, lg: 80 }

export function VibeyAgentsIcon({ size = 'md', className }: VibeyAgentsIconProps) {
  const px = SIZE_MAP[size]
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width: px, height: px, flexShrink: 0 }}
    >
      <Image
        src="/icons/vibey_agents.png"
        alt="Vibey Agents"
        width={px}
        height={px}
        style={{ mixBlendMode: 'screen', width: px, height: px, objectFit: 'contain' }}
        priority
      />
    </span>
  )
}

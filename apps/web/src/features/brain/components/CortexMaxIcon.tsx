'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

interface CortexMaxIconProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = { sm: 20, md: 48, lg: 80 }

export function CortexMaxIcon({ size = 'md', className }: CortexMaxIconProps) {
  const px = SIZE_MAP[size]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: px, height: px }}
    >
      <Image
        src="/icons/cortex_max.png"
        alt="Cortex Max"
        width={px}
        height={px}
        className="object-contain"
        style={{ width: px, height: px }}
        priority
      />
    </span>
  )
}

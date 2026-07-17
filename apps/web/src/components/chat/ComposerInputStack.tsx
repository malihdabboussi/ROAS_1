'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface ComposerInputStackProps {
  stackActive: boolean
  topSlot?: ReactNode
  children: ReactNode
}

/**
 * Gray tray + top accessory + glass composer input (Flow / task activity pattern).
 *
 * Always keep a stable outer element so `children` (ChatInput) are not remounted when
 * `stackActive` toggles — remounting wiped in-progress drafts when a stream ended.
 */
export function ComposerInputStack({
  stackActive,
  topSlot,
  children,
}: ComposerInputStackProps) {
  return (
    <div className={cn('shrink-0', stackActive && 'bg-secondary rounded-2xl')}>
      {stackActive && topSlot ? (
        <div className="px-spacing-4 pt-spacing-2 pb-spacing-1">{topSlot}</div>
      ) : null}
      {children}
    </div>
  )
}

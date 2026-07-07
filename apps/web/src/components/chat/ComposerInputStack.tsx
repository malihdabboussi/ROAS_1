'use client'

import type { ReactNode } from 'react'

interface ComposerInputStackProps {
  stackActive: boolean
  topSlot?: ReactNode
  children: ReactNode
}

/** Gray tray + top accessory + glass composer input (Flow / task activity pattern). */
export function ComposerInputStack({
  stackActive,
  topSlot,
  children,
}: ComposerInputStackProps) {
  if (!stackActive) {
    return <>{children}</>
  }

  return (
    <div className="bg-secondary rounded-2xl">
      {topSlot ? <div className="px-spacing-4 pt-spacing-2 pb-spacing-1">{topSlot}</div> : null}
      {children}
    </div>
  )
}

'use client'

/**
 * Ported from apps/web NavControls — marketing: no zoom buttons (wheel + center / organize only).
 */

import { Brain, Crosshair } from 'lucide-react'

interface NavControlsProps {
  onCenter: () => void
  onOrganize: () => void
}

export default function NavControls({ onCenter, onOrganize }: NavControlsProps) {
  const btnClass =
    'w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-hover-subtle transition-colors rounded'

  return (
    <div className="bottom-24 left-4 absolute z-50">
      <div className="surface-card border-border flex flex-col overflow-hidden rounded-lg border">
        <button type="button" onClick={onCenter} className={btnClass} title="Center">
          <Crosshair className="icon-xs" />
        </button>

        <div className="border-border border-t" />

        <button type="button" onClick={onOrganize} className={btnClass} title="Organize">
          <Brain className="icon-xs" />
        </button>
      </div>
    </div>
  )
}

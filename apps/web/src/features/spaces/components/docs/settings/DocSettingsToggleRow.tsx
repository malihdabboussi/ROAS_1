'use client'

import type { ComponentType } from 'react'
import { cn } from '@/lib/utils/cn'

export function DocSettingsToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
      <span className="flex-1 text-left text-[var(--foreground)]">{label}</span>
      <div
        className="switch-glass-primary relative h-5 w-9 shrink-0 rounded-full"
        role="switch"
        aria-checked={checked}
      >
        <div
          className={cn(
            'switch-glass-primary-thumb absolute top-0.5 h-4 w-4 rounded-full',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </div>
    </button>
  )
}

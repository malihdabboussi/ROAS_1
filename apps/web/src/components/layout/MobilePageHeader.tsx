'use client'

import { Menu } from 'lucide-react'

interface MobilePageHeaderProps {
  title: string
  rightAction?: React.ReactNode
}

export function MobilePageHeader({ title, rightAction }: MobilePageHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-3 pb-1 pt-3 md:hidden">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
        className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
        {title}
      </span>
      {rightAction ?? <div className="w-spacing-8" />}
    </div>
  )
}

'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface MediaGenerateCountMenuProps {
  imageCount: number
  position: { top: number; left: number }
  onSelect: (count: number) => void
}

export function MediaGenerateCountMenu({
  imageCount,
  position,
  onSelect,
}: MediaGenerateCountMenuProps) {
  return (
    <div
      role="presentation"
      className="dropdown-menu-solid z-dropdown p-spacing-2 fixed min-w-48"
      style={{ top: position.top, left: position.left }}
      data-dropdown
    >
      <div className="space-y-spacing-0">
        {[1, 2, 3, 4].map((n) => {
          const isSelected = imageCount === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              className={cn(
                'px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all',
                isSelected
                  ? 'dropdown-sort-option-selected text-muted-foreground'
                  : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="font-medium">{n}</span>
              {isSelected && (
                <div className="dropdown-sort-check ml-spacing-2">
                  <Check className="tint-green icon-sm relative z-30" strokeWidth={2.5} aria-hidden />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

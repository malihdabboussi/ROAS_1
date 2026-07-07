'use client'

import type { ReactNode } from 'react'
import { LuChevronDown } from 'react-icons/lu'

interface SegmentFilterSectionProps {
  title: string
  icon: ReactNode
  children: ReactNode
  isExpanded?: boolean
  onToggle?: () => void
  badge?: number
}

export function SegmentFilterSection({
  title,
  icon,
  children,
  isExpanded = true,
  onToggle,
  badge,
}: SegmentFilterSectionProps) {
  return (
    <div className="border-border rounded-spacing-2 surface-card overflow-hidden border">
      <button
        type="button"
        onClick={onToggle}
        className="px-spacing-3 py-spacing-2 bg-muted/20 hover:bg-muted/40 flex w-full items-center justify-between transition-colors"
      >
        <div className="gap-spacing-2 flex items-center">
          <span className="text-muted-foreground">{icon}</span>
          <span className="body-3 text-foreground font-medium">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-primary text-primary-foreground px-spacing-2 rounded-full py-0.5 text-xs">
              {badge}
            </span>
          )}
        </div>
        <LuChevronDown
          className={`icon-sm text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isExpanded && <div className="p-spacing-3 border-border border-t">{children}</div>}
    </div>
  )
}

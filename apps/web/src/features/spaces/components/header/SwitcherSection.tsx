'use client'

import type { ReactNode } from 'react'
import { ChevronRight, LayoutGrid } from 'lucide-react'

export type SwitcherSectionProps = {
  label: string
  icon: ReactNode
  sectionSpaces: { id: string; title: string }[]
  activeSpaceId: string | null
  expanded: boolean
  onToggle: () => void
  onSelect: (id: string) => void
}

export function SwitcherSection({
  label,
  icon,
  sectionSpaces,
  activeSpaceId,
  expanded,
  onToggle,
  onSelect,
}: SwitcherSectionProps) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-1.5 rounded-md py-1.5 text-left text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
      >
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[var(--color-muted-foreground)]">
          <span className="flex items-center justify-center group-hover:hidden [&_svg]:h-3.5 [&_svg]:w-3.5">
            {icon}
          </span>
          <ChevronRight
            className={`hidden h-3 w-3 shrink-0 transition-transform duration-150 group-hover:block ${expanded ? 'rotate-90' : ''}`}
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">{label}</span>
      </button>

      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {sectionSpaces.map((space) => {
            const isActive = space.id === activeSpaceId
            return (
              <button
                key={space.id}
                type="button"
                onClick={() => onSelect(space.id)}
                className={`w-full rounded-md py-1.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'nav-glass-selected-purple text-[rgb(var(--vibe-purple-light))] hover:brightness-110'
                    : 'text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]'
                } `}
              >
                <span className="flex items-center gap-2 pl-4 pr-2">
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{space.title}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
